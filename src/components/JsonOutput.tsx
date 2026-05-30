import type { AiData } from "@/hooks/useGenerateWebsite";

interface JsonOutputProps {
  isGenerating: boolean;
  streamedJson: string;
  aiData: AiData | null;
}

export function JsonOutput({ isGenerating, streamedJson, aiData }: JsonOutputProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 flex flex-col min-h-0">
      <h2 className="text-lg font-bold mb-1 border-b pb-2 text-gray-800 flex-shrink-0 flex items-center justify-between">
        AI JSON Output
        {isGenerating && (
          <span className="text-xs font-normal text-indigo-500 animate-pulse">
            streaming…
          </span>
        )}
      </h2>
      <div className="flex-1 overflow-auto min-h-0 mt-3">
        {streamedJson || aiData ? (
          <pre className="text-xs bg-gray-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap break-words">
            {aiData ? JSON.stringify(aiData, null, 2) : streamedJson}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
            Generate a website to see the AI JSON output here.
          </div>
        )}
      </div>
    </div>
  );
}
