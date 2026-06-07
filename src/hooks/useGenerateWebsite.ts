import { useState, useEffect, useRef, FormEvent } from "react";
import type { Template } from "@/types/database";
import { tryParsePartialJson } from "@/utils/parsePartialJson";

export type TemplateOption = Pick<Template, "id" | "name" | "raw_html">;

export interface AiData {
  [key: string]: unknown;
}

export function useGenerateWebsite() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedJson, setStreamedJson] = useState("");
  const [aiData, setAiData] = useState<AiData | null>(null);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to fetch templates');
        const data = await response.json();
        
        if (data && data.length > 0) {
          const options = data as TemplateOption[];
          setTemplates(options);
          setSelectedTemplateId(options[0].id);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      }
    }
    fetchTemplates();
  }, []);

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setError("");
    setStreamedJson("");
    setAiData(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, templateId: selectedTemplateId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Generation failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamedJson(accumulated);

        // Attempt to parse the partial JSON so the preview updates in real-time
        const partial = tryParsePartialJson(accumulated);
        if (partial) {
          setAiData(partial as AiData);
        }
      }

      // Final parse: the stream is complete, so a strict parse should now succeed.
      try {
        const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as AiData;
          setAiData(parsed);
        }
      } catch {
        console.warn("Could not parse final JSON from stream");
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
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
  };
}
