import { auth } from "@clerk/nextjs/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import { eq, and } from "drizzle-orm";
import { db, notes, noteMetadata, chatHistory, writingRubrics, writingSubmissions } from "@/lib/db";
import { NOTE_TYPE_REGISTRY } from "@/lib/note-types";
import { BUILTIN_WRITING_RUBRICS } from "@/lib/note-types/concept/writing-rubrics";
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

const SAVE_WRITING_SUBMISSION_TOOL: FunctionDeclaration = {
  name: "save_writing_submission",
  description: "Save a graded writing submission (the essay, the feedback, and the score).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      essayText: { type: SchemaType.STRING, description: "The full text of the essay that was graded" },
      feedback: { type: SchemaType.STRING, description: "The full markdown feedback block given to the user" },
      score: { type: SchemaType.STRING, description: "The overall score/band, as a short string (e.g. \"6.5\")" },
    },
    required: ["essayText", "feedback"],
  },
};

interface MemoryToolResult {
  result: string;
  savedMetadataContent?: string;
}

interface WritingContext {
  rubricId: string;
  rubricName: string;
}

async function executeMemoryTool(
  toolName: string,
  args: Record<string, string>,
  userId: string,
  noteType: string,
  title: string,
  folderId?: string | null,
  writingContext?: WritingContext
): Promise<MemoryToolResult> {
  const content = args.content;

  if (toolName === "save_writing_submission" && writingContext) {
    await db.insert(writingSubmissions).values({
      userId,
      noteType,
      noteTitle: title,
      rubricId: writingContext.rubricId,
      rubricName: writingContext.rubricName,
      essayText: args.essayText,
      feedback: args.feedback,
      score: args.score ?? null,
    });
    return { result: "Writing submission saved successfully." };
  }

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
      await db.insert(notes).values({ userId, noteType, title, content, folderId: folderId ?? null });
    }
    return { result: "Note saved successfully." };
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
    return { result: "Metadata saved successfully.", savedMetadataContent: content };
  }

  return { result: "Unknown tool." };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    noteType,
    mode,
    subMode,
    title,
    messages,
    documentUrl,
    documentContent: preExtractedContent,
    folderId,
    rubricId,
  }: {
    noteType: string;
    mode: string;
    subMode?: string;
    title: string;
    messages: Message[];
    documentUrl?: string;
    documentContent?: string;
    folderId?: string | null;
    rubricId?: string;
  } = await req.json();

  if (!noteType || !mode || !title || !messages) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const typeConfig = NOTE_TYPE_REGISTRY[noteType];
  const modeConfig = typeConfig?.modes[mode];
  if (!typeConfig || !modeConfig) {
    return Response.json({ error: "Invalid noteType or mode" }, { status: 400 });
  }

  let writingContext: WritingContext | undefined;
  let rubricPrompt: string | undefined;
  if (modeConfig.hasSubmissionUI) {
    if (!rubricId) {
      return Response.json({ error: "Missing rubricId for writing mode" }, { status: 400 });
    }
    const builtin = BUILTIN_WRITING_RUBRICS.find((r) => r.id === rubricId);
    if (builtin) {
      writingContext = { rubricId: builtin.id, rubricName: builtin.name };
      rubricPrompt = builtin.prompt;
    } else {
      const [customRubric] = await db
        .select()
        .from(writingRubrics)
        .where(and(eq(writingRubrics.userId, userId), eq(writingRubrics.id, rubricId)))
        .limit(1);
      if (!customRubric) {
        return Response.json({ error: "Unknown rubricId" }, { status: 400 });
      }
      writingContext = { rubricId: customRubric.id, rubricName: customRubric.name };
      rubricPrompt = customRubric.prompt;
    }
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

  const [[noteRow], [metadataRow]] = await Promise.all([
    db.select().from(notes).where(and(eq(notes.userId, userId), eq(notes.noteType, noteType), eq(notes.title, title))).limit(1),
    db.select().from(noteMetadata).where(and(eq(noteMetadata.userId, userId), eq(noteMetadata.noteType, noteType), eq(noteMetadata.noteTitle, title))).limit(1),
  ]);

  const systemPrompt = typeConfig.buildSystemPrompt(mode, {
    title,
    noteContent: noteRow?.content ?? null,
    metadataContent: metadataRow?.content ?? null,
    documentContent,
    subMode,
    rubricName: writingContext?.rubricName,
    rubricPrompt,
  });

  const subModeConfig = subMode ? modeConfig.subModes?.[subMode] : undefined;
  const modelId = subModeConfig?.model ?? "gemini-2.5-flash";

  const toolDeclarations = modeConfig.hasSubmissionUI
    ? [...MEMORY_TOOLS, SAVE_WRITING_SUBMISSION_TOOL]
    : MEMORY_TOOLS;

  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: systemPrompt,
    ...(modeConfig.useTools && { tools: [{ functionDeclarations: toolDeclarations }] }),
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }] as Part[],
  }));

  const lastMessage = messages[messages.length - 1].content;
  const chat = model.startChat({ history });

  let response = await chat.sendMessage(lastMessage);
  let lastText = response.response.text();
  let iterations = 0;
  const MAX_ITERATIONS = 10;
  let savedMetadataContent: string | undefined;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const functionCalls = response.response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) break;

    const functionResults: Part[] = await Promise.all(
      functionCalls.map(async (call) => {
        const { result, savedMetadataContent: mc } = await executeMemoryTool(
          call.name,
          call.args as Record<string, string>,
          userId,
          noteType,
          title,
          folderId,
          writingContext
        );
        if (mc !== undefined) savedMetadataContent = mc;
        return { functionResponse: { name: call.name, response: { result } } } as Part;
      })
    );

    response = await chat.sendMessage(functionResults);
    const t = response.response.text();
    if (t) lastText = t;
  }

  // If the model only emitted tool calls with no text, prompt it to reply
  if (!lastText.trim()) {
    const recovery = await chat.sendMessage("Please provide your response.");
    lastText = recovery.response.text();
  }

  // Strip tool_code blocks the model sometimes emits as literal text
  lastText = lastText.replace(/```tool_code[\s\S]*?```/g, "").replace(/^tool_code\s.+$/gm, "").trim();

  // Strip JSON metadata the model sometimes dumps as literal text, and capture it as fallback metadata
  lastText = lastText.replace(/```(?:json)?\s*(\{[\s\S]*?"tripDetails"[\s\S]*?\})\s*```/g, (_, json) => {
    if (!savedMetadataContent) savedMetadataContent = json.trim();
    return "";
  });
  const bareJsonMatch = lastText.match(/(\{[\s\S]*?"tripDetails"[\s\S]*?\})/);
  if (bareJsonMatch) {
    if (!savedMetadataContent) savedMetadataContent = bareJsonMatch[1].trim();
    lastText = lastText.replace(bareJsonMatch[1], "").trim();
  }

  // Strip "Next question / Explain more" lines
  let cleanedText = lastText
    .split("\n")
    .filter((line) => !/^\s*(Next question|Explain more)[^\n]*$/i.test(line.trim()))
    .join("\n")
    .trim();

  // If a new question block appears inside a feedback response, cut everything from it
  const mergedQuestionIdx = cleanedText.search(/\*\*Question\s+\d+\/\d+\*\*/i);
  if (mergedQuestionIdx > 0) {
    cleanedText = cleanedText.slice(0, mergedQuestionIdx).trim();
  }

  // On first message, generate a clean title and session summary
  let newTitle: string | undefined;
  let generatedSummary: string | undefined;
  if (history.length === 0) {
    try {
      const metaModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const metaRes = await metaModel.generateContent(
        `Given this learning session topic: "${title}"\n` +
        `And the tutor's first response:\n"""\n${cleanedText.slice(0, 600)}\n"""\n\n` +
        `Return ONLY a JSON object with two fields:\n` +
        `- "title": a clean, properly-capitalized 3-6 word title for this note card (e.g. "TCP/IP Networking Basics", "Biology Vocabulary")\n` +
        `- "summary": a single sentence (max 120 chars) describing what this session covers\n\n` +
        `Respond with raw JSON only, no markdown fences.`
      );
      const metaText = metaRes.response.text().trim();
      const parsed = JSON.parse(metaText.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
      if (parsed.title) newTitle = String(parsed.title);
      if (parsed.summary) generatedSummary = String(parsed.summary);
    } catch {
      // Non-fatal — fall back to raw title
    }
  }

  // Persist full conversation so the user can resume from the dashboard
  const subModeKey = subMode ?? "";
  const fullHistory = [...messages, { role: "assistant", content: cleanedText }];
  const messagesJson = JSON.stringify(fullHistory);
  try {
    const [existingHistory] = await db
      .select({ id: chatHistory.id })
      .from(chatHistory)
      .where(and(
        eq(chatHistory.userId, userId),
        eq(chatHistory.noteType, noteType),
        eq(chatHistory.noteTitle, title),
        eq(chatHistory.mode, mode),
        eq(chatHistory.subMode, subModeKey),
      ))
      .limit(1);

    if (existingHistory) {
      await db.update(chatHistory)
        .set({ messages: messagesJson, updatedAt: new Date() })
        .where(and(
          eq(chatHistory.userId, userId),
          eq(chatHistory.noteType, noteType),
          eq(chatHistory.noteTitle, title),
          eq(chatHistory.mode, mode),
          eq(chatHistory.subMode, subModeKey),
        ));
    } else {
      await db.insert(chatHistory).values({ userId, noteType, noteTitle: title, mode, subMode: subModeKey, messages: messagesJson });
    }
  } catch {
    // non-fatal
  }

  return Response.json({
    text: cleanedText,
    ...(newTitle && { newTitle }),
    ...(generatedSummary && { summary: generatedSummary }),
    ...(savedMetadataContent !== undefined && { metadataContent: savedMetadataContent }),
  });
}
