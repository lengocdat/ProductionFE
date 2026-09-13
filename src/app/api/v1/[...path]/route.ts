import { NextRequest, NextResponse } from 'next/server';
import { isIP } from 'node:net';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (!path.length || path.some(segment => segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\'))) {
    return NextResponse.json({ error: 'Đường dẫn không hợp lệ.' }, { status: 400 });
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');
    const expectedOrigin = process.env.APP_PUBLIC_URL || request.nextUrl.origin;
    if ((origin && origin !== expectedOrigin) || fetchSite === 'cross-site') {
      return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
    }
  }
  const backend = process.env.API_INTERNAL_URL || 'http://127.0.0.1:8080';
  const url = new URL(`/v1/${path.map(encodeURIComponent).join('/')}`, backend);
  url.search = request.nextUrl.search;
  const headers = new Headers();
  for (const key of ['content-type', 'authorization', 'cookie', 'x-admin-totp', 'x-sepay-timestamp', 'x-sepay-signature', 'accept', 'origin']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  // Nginx overwrites X-Real-IP. Never trust a client-supplied forwarding chain.
  const clientIP = request.headers.get('x-real-ip');
  if (clientIP && isIP(clientIP)) headers.set('X-Forwarded-For', clientIP);
  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(25_000),
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store, private' });
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);
    // The public proxy adds /api; preserve the backend's auth-only cookie scope.
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append('Set-Cookie', cookie.replace(/(;\s*Path=)\/v1\/auth(?=;|$)/i, '$1/api/v1/auth'));
    }
    // Backend redirects are not followed and cannot redirect users to an upstream hostname.
    if (upstream.status >= 300 && upstream.status < 400) return NextResponse.json({ error: 'Phản hồi máy chủ không hợp lệ.' }, { status: 502 });
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Chưa kết nối được máy chủ. Nếu vừa thao tác, hãy thử lại cùng yêu cầu để tránh ghi nhận hai lần.' }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS, proxy as HEAD };
