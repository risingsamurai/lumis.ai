import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export async function streamBiasChat(prompt: string, onToken: (chunk: string) => void) {
  const stream = await model.generateContentStream(prompt);
  for await (const chunk of stream.stream) {
    onToken(chunk.text());
  }
}
