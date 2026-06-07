import { NextResponse } from 'next/server';
import { streamObject, jsonSchema } from 'ai';
import { google } from '@ai-sdk/google';
import { supabase } from '@/lib/supabase';
import type { Template } from '@/types/database';
import localTemplates from '@/data/templates.json';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, templateId } = (await req.json()) as {
      prompt: string;
      templateId: string;
    };

    if (!prompt || !templateId) {
      return NextResponse.json(
        { error: 'Prompt and templateId are required' },
        { status: 400 }
      );
    }

    // Use locally bundled templates instead of fetching from GitHub.
    const templates = localTemplates as unknown as Template[];
    const template = templates.find(t => t.id === templateId) as Pick<Template, 'json_schema'> | null;

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Stream structured JSON from the LLM so the client can render
    // partial results as they arrive rather than waiting for the full response.
    const result = streamObject({
      model: google('gemini-2.5-flash'),
      schema: jsonSchema(template.json_schema as Parameters<typeof jsonSchema>[0]),
      prompt: `You are an expert copywriter. Fill out the JSON schema based on the following user business concept: "${prompt}".
      Follow the structure exactly and be as creative as possible.`,

      // Fired once the full object is available — we persist it to the DB here
      // so the stream can reach the client without waiting for the DB round-trip.
      async onFinish({ object, error: streamError }) {
        if (streamError) {
          console.error('Stream finish error:', streamError);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: dbError } = await (supabase.from('user_websites') as any)
          .insert({ template_id: templateId, ai_content: object });

        if (dbError) {
          // Non-fatal: the user can still see the generated site.
          console.error('Supabase insert error:', dbError.message);
        }
      },
    });

    // Pipe the SDK's text stream as a plain-text HTTP response.
    // The client will read newline-delimited JSON chunks.
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate website content' },
      { status: 500 }
    );
  }
}
