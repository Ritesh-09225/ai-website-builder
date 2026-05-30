import { NextResponse } from 'next/server';

const GITHUB_TEMPLATES_URL = 'https://raw.githubusercontent.com/Ritesh-09225/web-templates-api/main/templates.json';

export const runtime = 'edge';

export async function GET() {
  try {
    const response = await fetch(GITHUB_TEMPLATES_URL, {
      // Add cache control if needed, or rely on Next.js default caching behavior
      next: { revalidate: 60 } // Revalidate every minute
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates from GitHub: ${response.status} ${response.statusText}`);
    }

    const templates = await response.json();
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error('API Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
