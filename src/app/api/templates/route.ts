import { NextResponse } from 'next/server';
import localTemplates from '@/data/templates.json';

export async function GET() {
  try {
    return NextResponse.json(localTemplates);
  } catch (error) {
    console.error('API Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
