import { NextRequest, NextResponse } from 'next/server';
import { extractMetadata } from '@/lib/metadata';
import { rateLimit } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anon';
  const rl = await rateLimit(`metadata:${ip}`, 40, 60);

  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded: Too many metadata requests' },
      { status: 429 }
    );
  }

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
