import { useState } from "react";
import { smartRewrite } from "../../services/api";
import { useStore } from "../../store/useStore";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

const SmartEditor = () => {
  const { jobDescription } = useStore();
  const [selectedText, setSelectedText] = useState("");
  const [variations, setVariations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleRewrite = async () => {
    if (!selectedText || !jobDescription) {
      alert("Please select text and ensure a job description is entered.");
      return;
    }
    setLoading(true);
    try {
      const result = await smartRewrite(selectedText, jobDescription);
      setVariations(result.variations);
    } catch (error) {
      console.error("Failed to rewrite text:", error);
      alert("Failed to rewrite text.");
    }
    setLoading(false);
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="card p-6 mt-6">
      <h2 className="text-2xl font-bold mb-4 text-green-400">
        ✍️ Smart Rewrite Engine
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Paste a bullet point to optimize:
          </label>
          <textarea
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
            className="input-field h-32 resize-none custom-scrollbar"
            placeholder="e.g. Managed a team of 5 developers..."
          />
          <button
            onClick={handleRewrite}
            disabled={loading || !selectedText}
            className="mt-4 w-full btn-primary bg-green-600 hover:bg-green-500 shadow-green-500/20"
          >
            {loading ? "Optimizing..." : "✨ Magic Rewrite"}
          </button>
        </div>

        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
          <h3 className="text-lg font-semibold mb-3 text-slate-300">
            AI Variations
          </h3>
          {variations.length > 0 ? (
            <div className="space-y-4">
              {variations.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-green-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-green-400 uppercase">
                      {v.style}
                    </div>
                    <button
                      onClick={() => handleCopy(v.text, idx)}
                      className="p-1.5 rounded-md hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === idx ? (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <ClipboardDocumentIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-slate-300">{v.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Variations will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartEditor;
