import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const MERGE_PROMPT = `You are merging study documents into one comprehensive knowledge base.

This is a RESTRUCTURING task, NOT a summary — keep as much of the original information as possible.

Given EXISTING KNOWLEDGE and NEW CONTENT below, produce a single well-structured markdown document that:
- Preserves ALL information from both: every fact, vocabulary item, example, formula, rule, data point, and specific detail. Do not drop, shorten, or paraphrase away any detail.
- Merges overlapping sections and removes only exact duplicates rather than repeating them
- Adds new sections/content from the new document where topics differ
- Organises with ## headings and ### sub-headings (plain text only — no bold, italics, or backticks inside headings)
- Uses bullet lists and tables where appropriate
- Does NOT use code blocks or backticks for example sentences, grammar patterns, or any prose — reserve code formatting strictly for actual source code. Present example sentences as Markdown blockquotes (lines starting with >)

Output only the merged markdown. No preamble, no commentary, no sign-off.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { existing, incoming } = await req.json() as { existing?: string; incoming?: string };
  if (!existing || !incoming) {
    return Response.json({ error: "Missing content" }, { status: 400 });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(
    `${MERGE_PROMPT}\n\n---\n## EXISTING KNOWLEDGE\n\n${existing.slice(0, 14000)}\n\n---\n## NEW CONTENT\n\n${incoming.slice(0, 14000)}`
  );

  const merged = result.response.text().trim();
  return Response.json({ merged: merged.slice(0, 25000) });
}
