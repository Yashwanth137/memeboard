import { NextRequest, NextResponse } from 'next/server';
import { validateSafeUrl } from '@/lib/security/ssrf';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Security: Prevent SSRF
  const validUrl = await validateSafeUrl(url);
  if (!validUrl) {
    return new NextResponse('Forbidden target host', { status: 403 });
  }

  // Forward Range header for video scrubber & timeline seeking
  const range = req.headers.get('range');
  const headers: HeadersInit = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  };
  if (range) {
    headers['Range'] = range;
  }

  try {
    const upstream = await fetch(validUrl.toString(), { headers });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(`Upstream returned ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';

    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Accept-Ranges', acceptRanges);
    if (contentLength) responseHeaders.set('Content-Length', contentLength);
    if (contentRange) responseHeaders.set('Content-Range', contentRange);
    responseHeaders.set(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=604800'
    );

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Stream proxy error', {
      status: 500,
    });
  }
}
