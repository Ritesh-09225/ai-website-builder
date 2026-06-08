import { useState, useEffect, useRef } from "react";
import { PreviewSkeleton } from "./PreviewSkeleton";
import type { AiData } from "@/hooks/useGenerateWebsite";

interface PreviewPanelProps {
  isGenerating: boolean;
  aiData: AiData | null;
  finalHtml: string | null;
}

export function PreviewPanel({ isGenerating, aiData, finalHtml }: PreviewPanelProps) {
  const showSkeleton = isGenerating;
  const [editedHtml, setEditedHtml] = useState<string | null>(null);
  const editorWindowRef = useRef<Window | null>(null);

  // Reset edited content when a completely new site is generated
  const prevFinalHtml = useRef(finalHtml);
  useEffect(() => {
    if (prevFinalHtml.current !== finalHtml) {
      setEditedHtml(null);
      prevFinalHtml.current = finalHtml;
    }
  }, [finalHtml]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'FORGE_EDITOR_READY' && finalHtml) {
        const targetWindow = e.source as WindowProxy;
        if (targetWindow) {
          targetWindow.postMessage({
            type: 'LOAD_HTML',
            html: editedHtml || finalHtml
          }, '*');
        }
      } else if (e.data?.type === 'UPDATE_HTML' && e.data.html) {
        // Always use the original finalHtml as the document shell so the
        // <head> (with Tailwind CDN, fonts, etc.) is always preserved.
        // We only replace the <body> content with what the editor sends.
        if (finalHtml) {
          const bodyContent = e.data.html as string;
          // Swap <body>...</body> content using a regex. We use a replacer
          // function (not a replacement string) so that `$` characters in the
          // AI-generated bodyContent are treated as literal text instead of
          // being interpreted as regex backreferences (e.g. $1, $2).
          const merged = finalHtml.replace(
            /(<body[^>]*>)([\s\S]*?)(<\/body>)/i,
            (_match, open, _oldBody, close) => `${open}${bodyContent}${close}`
          );
          setEditedHtml(merged);
        } else {
          setEditedHtml(e.data.html);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [finalHtml, editedHtml]);

  // Push updates to editor if a new site is generated while editor is open
  const lastSentHtml = useRef<string | null>(null);
  useEffect(() => {
    if (finalHtml && editorWindowRef.current && !editorWindowRef.current.closed && lastSentHtml.current !== finalHtml) {
       editorWindowRef.current.postMessage({
          type: 'LOAD_HTML',
          html: finalHtml
       }, '*');
       lastSentHtml.current = finalHtml;
    }
  }, [finalHtml]);

  const openEditor = () => {
    editorWindowRef.current = window.open("/editor/index.html", "ForgeEditor");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-0">
      {/* Browser chrome bar */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <div className="flex gap-1.5 w-1/3">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto bg-white rounded-md px-4 py-1 text-xs text-gray-500 shadow-sm w-1/3 text-center truncate">
          {isGenerating
            ? "✦ AI is generating your site…"
            : aiData
            ? "Preview: Generated via AI"
            : "Preview: Waiting for input…"}
        </div>
        <div className="w-1/3 flex justify-end">
          {finalHtml && !isGenerating && (
            <button
              onClick={openEditor}
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Open Editor in New Tab
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {showSkeleton ? (
        <PreviewSkeleton />
      ) : finalHtml ? (
        <iframe
          srcDoc={editedHtml || finalHtml}
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
