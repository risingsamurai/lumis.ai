import { useState } from "react";
import { streamBiasChat } from "../services/gemini";

export function useGemini() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (prompt: string) => {
    setLoading(true);
    setResponse("");
    try {
      await streamBiasChat(prompt, (chunk) => {
        setResponse((prev) => prev + chunk);
      });
    } finally {
      setLoading(false);
    }
  };

  return { ask, response, loading };
}
