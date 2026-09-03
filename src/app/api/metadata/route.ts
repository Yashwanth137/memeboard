import { NextRequest, NextResponse } from 'next/server';
import { extractMetadata } from '@/lib/metadata';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const metadata = await extractMetadata(url);
    return NextResponse.json(metadata);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to extract metadata' },
      { status: 500 }
    );
  }
}
