import { useState } from "react";
import { useGemini } from "../../hooks/useGemini";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export function AIChat({ context }: { context: string }) {
  const [question, setQuestion] = useState("How do I fix the gender bias?");
  const { ask, response, loading } = useGemini();
  const quickActions = [
    "Explain Bias",
    "Summarize Report",
    "Suggest Fixes",
  ];

  return (
    <Card>
      <h3 className="font-bold">Ask FairLens AI</h3>
      <textarea
        className="mt-3 min-h-24 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm text-white"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Button key={action} variant="ghost" onClick={() => setQuestion(action)}>
            {action}
          </Button>
        ))}
      </div>
      <Button
        className="mt-2 w-full"
        onClick={() =>
          void ask(
            `You are FairLens AI. Keep answers short, data-driven, and specific to this context.\nContext JSON:\n${context}\nQuestion: ${question}`
          )
        }
        disabled={loading}
      >
        {loading ? "Streaming..." : "Ask"}
      </Button>
      <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-white/5 p-3 text-sm text-white/90">
        {response || "Response will stream here token-by-token."}
      </div>
    </Card>
  );
}
