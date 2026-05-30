/**
 * Manually-authored Supabase database types.
 * Mirrors the schema defined in scripts/seedTemplates.mjs.
 *
 * To regenerate automatically once the Supabase CLI is set up, run:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string;
          name: string;
          framework: string;
          json_schema: Json;
          raw_html: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          framework: string;
          json_schema: Json;
          raw_html: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          framework?: string;
          json_schema?: Json;
          raw_html?: string;
          created_at?: string | null;
        };
      };
      user_websites: {
        Row: {
          id: string;
          template_id: string;
          ai_content: Json;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          ai_content: Json;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          template_id?: string;
          ai_content?: Json;
          created_at?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ── Convenience row types ─────────────────────────────────────────────────────

export type Template = Database['public']['Tables']['templates']['Row'];
export type UserWebsite = Database['public']['Tables']['user_websites']['Row'];
