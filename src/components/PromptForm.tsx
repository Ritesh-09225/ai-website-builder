import { FormEvent } from "react";
import type { TemplateOption } from "@/hooks/useGenerateWebsite";

interface PromptFormProps {
  templates: TemplateOption[];
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  handleGenerate: (e: FormEvent) => void;
  error: string;
}

export function PromptForm({
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  prompt,
  setPrompt,
  isGenerating,
  handleGenerate,
  error,
}: PromptFormProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-shrink-0">
      <h2 className="text-lg font-bold mb-4 text-gray-800">What are we building?</h2>
      <form onSubmit={handleGenerate} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">Choose a Template:</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900 font-medium"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A modern landing page for an organic coffee shop in Brooklyn..."
          className="w-full text-black border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-28"
        />
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating…
            </>
          ) : (
            "✨ Generate Website"
          )}
        </button>
      </form>
      {error && (
        <p className="text-red-500 text-sm mt-3 font-medium bg-red-50 p-3 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
