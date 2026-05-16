import { auth } from "@clerk/nextjs/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import { eq, and } from "drizzle-orm";
import { db, notes, noteMetadata } from "@/lib/db";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import { extractText } from "unpdf";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MEMORY_TOOLS: FunctionDeclaration[] = [
  {
    name: "save_note",
    description: "Save or update the main note content for this session.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: "The full markdown content of the note",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "save_note_metadata",
    description: "Save or update metadata for this note (quiz progress, activity logs, etc.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: "The full markdown content of the metadata",
        },
      },
      required: ["content"],
    },
  },
];

async function executeMemoryTool(
  toolName: string,
  args: Record<string, string>,
  userId: string,
  noteType: string,
  title: string
): Promise<string> {
  const content = args.content;

  if (toolName === "save_note") {
    const existing = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(notes)
        .set({ content, updatedAt: new Date() })
        .where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title)));
    } else {
      await db.insert(notes).values({ userId, noteType, title, content });
    }
    return "Note saved successfully.";
  }

  if (toolName === "save_note_metadata") {
    const existing = await db
      .select()
      .from(noteMetadata)
      .where(
        and(
          eq(noteMetadata.userId, userId),
          eq(noteMetadata.noteType, noteType),
          eq(noteMetadata.noteTitle, title)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(noteMetadata)
        .set({ content, updatedAt: new Date() })
        .where(
          and(
            eq(noteMetadata.userId, userId),
            eq(noteMetadata.noteType, noteType),
            eq(noteMetadata.noteTitle, title)
          )
        );
    } else {
      await db.insert(noteMetadata).values({ userId, noteType, noteTitle: title, content });
    }
    return "Metadata saved successfully.";
  }

  return "Unknown tool.";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    noteType,
    mode,
    title,
    messages,
    documentUrl,
    documentContent: preExtractedContent,
  }: {
    noteType: string;
    mode: string;
    title: string;
    messages: Message[];
    documentUrl?: string;
    documentContent?: string;
  } = await req.json();

  if (!noteType || !mode || !title || !messages) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const typeConfig = NOTE_TYPE_REGISTRY[noteType];
  const modeConfig = typeConfig?.modes[mode];
  if (!typeConfig || !modeConfig) {
    return Response.json({ error: "Invalid noteType or mode" }, { status: 400 });
  }

  let documentContent: string | undefined = preExtractedContent;
  if (!documentContent && documentUrl) {
    try {
      const res = await fetch(documentUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MemoryBoard/1.0)" },
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("pdf") || documentUrl.toLowerCase().endsWith(".pdf")) {
        const buffer = await res.arrayBuffer();
        const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
        documentContent = text.slice(0, 15000);
      } else {
        const html = await res.text();
        documentContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 15000);
      }
    } catch {
      // Non-fatal — session falls back to existing notes
    }
  }

  const [noteRow] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title)))
    .limit(1);

  const [metadataRow] = await db
    .select()
    .from(noteMetadata)
    .where(
      and(
        eq(noteMetadata.userId, userId),
        eq(noteMetadata.noteType, noteType),
        eq(noteMetadata.noteTitle, title)
      )
    )
    .limit(1);

  const systemPrompt = typeConfig.buildSystemPrompt(mode, {
    title,
    noteContent: noteRow?.content ?? null,
    metadataContent: metadataRow?.content ?? null,
    documentContent,
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    ...(modeConfig.useTools && { tools: [{ functionDeclarations: MEMORY_TOOLS }] }),
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }] as Part[],
  }));

  const lastMessage = messages[messages.length - 1].content;
  const chat = model.startChat({ history });

  let response = await chat.sendMessage(lastMessage);
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const functionCalls = response.response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    const functionResults: Part[] = await Promise.all(
      functionCalls.map(async (call) => {
        const result = await executeMemoryTool(
          call.name,
          call.args as Record<string, string>,
          userId,
          noteType,
          title
        );
        return { functionResponse: { name: call.name, response: { result } } } as Part;
      })
    );

    response = await chat.sendMessage(functionResults);
  }

  const text = response.response.text();
  return Response.json({ text });
}
