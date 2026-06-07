"use client";

import { useEffect } from "react";
import { useGenerateWebsite } from "@/hooks/useGenerateWebsite";
import { Header } from "@/components/Header";
import { PromptForm } from "@/components/PromptForm";
import { JsonOutput } from "@/components/JsonOutput";
import { PreviewPanel } from "@/components/PreviewPanel";
import { hydrateTemplate } from "@/utils/render";

export default function Home() {
  const {
    prompt,
    setPrompt,
    isGenerating,
    streamedJson,
    aiData,
    error,
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    handleGenerate,
    setAiData,
    setStreamedJson,
  } = useGenerateWebsite();

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'HYDRATE_JSON' && e.data.json) {
        let bestMatch = templates[0];
        let maxScore = -1;

        for (const t of templates) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const schema = t.json_schema as any;
          if (!schema || !schema.properties) continue;
          
          const requiredKeys = schema.required || [];
          const schemaKeys = Object.keys(schema.properties);
          const jsonKeys = Object.keys(e.data.json);
          
          let score = 0;
          for (const key of jsonKeys) {
            if (schemaKeys.includes(key)) score++;
          }
          if (requiredKeys.length > 0 && requiredKeys.every((k: string) => jsonKeys.includes(k))) {
            score += 10;
          }
          if (score > maxScore) {
            maxScore = score;
            bestMatch = t;
          }
        }

        if (maxScore > 0 && bestMatch) {
           setSelectedTemplateId(bestMatch.id);
           setAiData(e.data.json);
           setStreamedJson(e.data.raw || JSON.stringify(e.data.json, null, 2));
        } else {
           if (e.source) {
             (e.source as Window).postMessage({ type: 'LOAD_FALLBACK', json: e.data.json, raw: e.data.raw }, '*');
           }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [templates, setAiData, setSelectedTemplateId, setStreamedJson]);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
  const finalHtml =
    aiData && activeTemplate
      ? hydrateTemplate(activeTemplate.raw_html, aiData)
      : null;

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
      <Header isGenerating={isGenerating} />

      {/* Main: CSS Grid with fixed sidebar and stretching preview */}
      <main className="flex-1 grid grid-cols-[360px_1fr] gap-6 p-6 min-h-0">
        {/* Left Sidebar */}
        <div className="flex flex-col gap-6 min-h-0">
          <PromptForm
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            setSelectedTemplateId={setSelectedTemplateId}
            prompt={prompt}
            setPrompt={setPrompt}
            isGenerating={isGenerating}
            handleGenerate={handleGenerate}
            error={error}
          />
          <JsonOutput
            isGenerating={isGenerating}
            streamedJson={streamedJson}
            aiData={aiData}
          />
        </div>

        {/* Right: Preview Panel */}
        <PreviewPanel
          isGenerating={isGenerating}
          aiData={aiData}
          finalHtml={finalHtml}
        />
      </main>
    </div>
  );
}
