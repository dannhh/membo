import { auth } from "@clerk/nextjs/server";
import { extractText } from "unpdf";

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

  return Response.json({ text: text.slice(0, 15000) });
}
