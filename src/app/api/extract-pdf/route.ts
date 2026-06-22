import { auth } from "@clerk/nextjs/server";
import { extractText } from "unpdf";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Below this, the PDF likely has no real text layer (scanned/handwritten) — fall back to Gemini's vision.
const MIN_TEXT_LENGTH = 100;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });

  if (text.trim().length >= MIN_TEXT_LENGTH) {
    return Response.json({ text: text.slice(0, 15000) });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: Buffer.from(buffer).toString("base64"),
      },
    },
    {
      text: "Transcribe all text content from this document into clean markdown, including any handwritten notes or annotations. Preserve structure (headings, lists, tables) where possible. Output only the transcription, no commentary.",
    },
  ]);

  return Response.json({ text: result.response.text().slice(0, 15000) });
}
