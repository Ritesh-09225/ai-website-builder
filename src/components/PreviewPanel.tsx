import { PreviewSkeleton } from "./PreviewSkeleton";
import { IFRAME_SANDBOX } from "@/utils/render";
import type { AiData } from "@/hooks/useGenerateWebsite";

interface PreviewPanelProps {
  isGenerating: boolean;
  aiData: AiData | null;
  finalHtml: string | null;
}

export function PreviewPanel({ isGenerating, aiData, finalHtml }: PreviewPanelProps) {
  const showSkeleton = isGenerating;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-0">
      {/* Browser chrome bar */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto bg-white rounded-md px-4 py-1 text-xs text-gray-500 shadow-sm w-1/2 text-center truncate">
          {isGenerating
            ? "✦ AI is generating your site…"
            : aiData
            ? "Preview: Generated via AI"
            : "Preview: Waiting for input…"}
        </div>
      </div>

      {/* Content area */}
      {showSkeleton ? (
        <PreviewSkeleton />
      ) : finalHtml ? (
        // sandbox prevents the generated site from accessing cookies / localStorage
        // and running arbitrary JS that could affect the parent page.
        <iframe
          srcDoc={finalHtml}
          sandbox={IFRAME_SANDBOX}
          className="flex-1 w-full border-none"
          title="Website Preview"
          style={{ display: "block" }}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
          <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-medium">No website generated yet.</p>
          <p className="text-sm mt-2 max-w-md text-gray-400">
            Enter a prompt on the left and click <strong>Generate Website</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
