"use client";

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
  } = useGenerateWebsite();

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
