import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // Should ideally use service role key, but this is fine for local prototyping with open RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define our standard JSON schemas that the AI SDK will use
// These must be strict JSON Schema Draft 7 format, adhering to Vercel AI SDK requirements
// We set additionalProperties: false to ensure strict adherence.

const templates = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Modern SaaS Landing Page',
    framework: 'tailwind-html',
    json_schema: {
      type: "object",
      properties: {
        hero: {
          type: "object",
          properties: {
            headline: { type: "string", description: "Main catchy headline (punchy, benefit-driven)" },
            subheadline: { type: "string", description: "Secondary explanatory text about how it works" },
            cta_text: { type: "string", description: "Action-oriented call to action text" }
          },
          required: ["headline", "subheadline", "cta_text"],
          additionalProperties: false
        },
        features: {
          type: "object",
          properties: {
            section_title: { type: "string", description: "Title for the features section" },
            items: {
              type: "array",
              description: "List of exactly 3 core features",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short feature title" },
                  description: { type: "string", description: "Detailed feature description" }
                },
                required: ["title", "description"],
                additionalProperties: false
              },
              minItems: 3,
              maxItems: 3
            }
          },
          required: ["section_title", "items"],
          additionalProperties: false
        }
      },
      required: ["hero", "features"],
      additionalProperties: false
    },
    raw_html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{hero.headline}}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          .glass { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
        </style>
      </head>
      <body class="bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
        <!-- Hero Section -->
        <main class="relative overflow-hidden min-h-screen flex flex-col justify-center items-center px-4 py-24 sm:px-6 lg:px-8">
          <!-- Decorative blur -->
          <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div class="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          
          <div class="z-10 max-w-4xl mx-auto text-center">
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              {{hero.headline}}
            </h1>
            <p class="mt-4 text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10">
              {{hero.subheadline}}
            </p>
            <div class="flex justify-center gap-4">
              <a href="#" class="rounded-full px-8 py-4 text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)]">
                {{hero.cta_text}}
              </a>
            </div>
          </div>
        </main>

        <!-- Features Section -->
        <section class="py-24 px-6 bg-slate-900 border-t border-slate-800">
          <div class="max-w-7xl mx-auto">
            <h2 class="text-4xl font-bold text-center mb-16">{{features.section_title}}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              {{#each features.items}}
              <div class="glass p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
                <div class="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6">
                  <svg class="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 class="text-2xl font-bold mb-4">{{this.title}}</h3>
                <p class="text-slate-400 leading-relaxed">{{this.description}}</p>
              </div>
              {{/each}}
            </div>
          </div>
        </section>
      </body>
      </html>
    `
  },
  {
    id: 'd9b2d63d-a233-4123-8478-3de37130eb44',
    name: 'Local Business / Service',
    framework: 'tailwind-html',
    json_schema: {
      type: "object",
      properties: {
        business_name: { type: "string", description: "Name of the business" },
        hero: {
          type: "object",
          properties: {
            headline: { type: "string", description: "Main headline offering the service" },
            description: { type: "string", description: "Why customers should choose them" },
            phone_number: { type: "string", description: "Fictional local phone number" }
          },
          required: ["headline", "description", "phone_number"],
          additionalProperties: false
        },
        services: {
          type: "array",
          description: "List of 4 services offered",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              summary: { type: "string" }
            },
            required: ["name", "summary"],
            additionalProperties: false
          },
          minItems: 4,
          maxItems: 4
        }
      },
      required: ["business_name", "hero", "services"],
      additionalProperties: false
    },
    raw_html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{business_name}}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Outfit', sans-serif; }
        </style>
      </head>
      <body class="bg-amber-50 text-slate-800">
        <nav class="bg-white shadow-sm p-6 sticky top-0 z-50">
          <div class="max-w-6xl mx-auto flex justify-between items-center">
            <span class="text-2xl font-extrabold text-emerald-700 tracking-tight">{{business_name}}</span>
            <a href="tel:{{hero.phone_number}}" class="font-bold text-emerald-600 hover:text-emerald-800 transition-colors">Call: {{hero.phone_number}}</a>
          </div>
        </nav>
        
        <header class="bg-emerald-700 text-white py-24 px-6 text-center">
          <div class="max-w-4xl mx-auto">
            <h1 class="text-5xl md:text-6xl font-extrabold mb-6">{{hero.headline}}</h1>
            <p class="text-xl md:text-2xl text-emerald-100 mb-10 max-w-2xl mx-auto">{{hero.description}}</p>
            <button class="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold py-4 px-10 rounded-full text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              Request a Free Quote
            </button>
          </div>
        </header>

        <section class="py-20 px-6 max-w-6xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-4xl font-bold text-slate-900">Our Services</h2>
            <div class="w-24 h-1 bg-amber-400 mx-auto mt-6"></div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            {{#each services}}
            <div class="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow border-t-4 border-emerald-500 flex flex-col h-full">
              <h3 class="text-2xl font-bold text-emerald-800 mb-4">{{this.name}}</h3>
              <p class="text-slate-600 text-lg flex-grow">{{this.summary}}</p>
              <button class="mt-6 text-emerald-600 font-bold flex items-center hover:text-emerald-800">
                Learn more 
                <svg class="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
            {{/each}}
          </div>
        </section>
        
        <footer class="bg-slate-900 text-slate-400 py-12 text-center">
          <p>&copy; 2024 {{business_name}}. All rights reserved.</p>
        </footer>
      </body>
      </html>
    `
  }
];

async function seed() {
  console.log('Seeding templates...');
  
  for (const template of templates) {
    // Upsert template (insert or update based on ID)
    const { data, error } = await supabase
      .from('templates')
      .upsert(template, { onConflict: 'id' });
      
    if (error) {
      console.error(`Failed to seed template ${template.id}:`, error.message);
    } else {
      console.log(`Successfully seeded: ${template.id}`);
    }
  }
  
  console.log('Seeding complete.');
}

seed().catch(console.error);
