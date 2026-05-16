import { auth } from "@clerk/nextjs/server";
import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import { eq, and } from "drizzle-orm";
import { db, concepts, progress } from "@/lib/db";
import { buildSystemPrompt } from "@/lib/skills/prompts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

type Skill = "study" | "quiz" | "materials";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MEMORY_TOOLS: FunctionDeclaration[] = [
  {
    name: "save_concept_notes",
    description:
      "Save or update the concept notes for the current user. Call this at the end of a study session (Phase 5).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: "The full markdown content of the concept notes",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "save_progress",
    description:
      "Save or update the quiz progress for the current user. Call this at the end of a quiz session (Phase 3).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: "The full markdown content of the progress notes",
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
  conceptName: string
): Promise<string> {
  const content = args.content;

  if (toolName === "save_concept_notes") {
    const existing = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.userId, userId), eq(concepts.name, conceptName)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(concepts)
        .set({ content, updatedAt: new Date() })
        .where(and(eq(concepts.userId, userId), eq(concepts.name, conceptName)));
    } else {
      await db.insert(concepts).values({ userId, name: conceptName, content });
    }
    return "Concept notes saved successfully.";
  }

  if (toolName === "save_progress") {
    const existing = await db
      .select()
      .from(progress)
      .where(
        and(eq(progress.userId, userId), eq(progress.conceptName, conceptName))
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(progress)
        .set({ content, updatedAt: new Date() })
        .where(
          and(eq(progress.userId, userId), eq(progress.conceptName, conceptName))
        );
    } else {
      await db.insert(progress).values({ userId, conceptName, content });
    }
    return "Quiz progress saved successfully.";
  }

  return "Unknown tool.";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    skill,
    concept,
    messages,
  }: { skill: Skill; concept: string; messages: Message[] } = await req.json();

  if (!skill || !concept || !messages) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Load memory from DB
  const [conceptRow] = await db
    .select()
    .from(concepts)
    .where(and(eq(concepts.userId, userId), eq(concepts.name, concept)))
    .limit(1);

  const [progressRow] = await db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.conceptName, concept)))
    .limit(1);

  const systemPrompt = buildSystemPrompt(
    skill,
    concept,
    conceptRow?.content ?? null,
    progressRow?.content ?? null
  );

  // Build Gemini model — tools only for study/quiz (materials is output-only)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    ...(skill !== "materials" && {
      tools: [{ functionDeclarations: MEMORY_TOOLS }],
    }),
  });

  // Convert message history for Gemini (all except the last, which we send)
  // Gemini roles: "user" | "model" (not "assistant")
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }] as Part[],
  }));

  const lastMessage = messages[messages.length - 1].content;

  const chat = model.startChat({ history });

  // Agentic loop — handle function calls until the model returns text
  let response = await chat.sendMessage(lastMessage);
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const functionCalls = response.response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) break;

    // Execute all function calls and collect results
    const functionResults: Part[] = await Promise.all(
      functionCalls.map(async (call) => {
        const result = await executeMemoryTool(
          call.name,
          call.args as Record<string, string>,
          userId,
          concept
        );
        return {
          functionResponse: {
            name: call.name,
            response: { result },
          },
        } as Part;
      })
    );

    response = await chat.sendMessage(functionResults);
  }

  const text = response.response.text();
  return Response.json({ text });
}
