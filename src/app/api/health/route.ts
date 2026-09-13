export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', service: 'cau-dao-ky-web' }, { headers: { 'Cache-Control': 'no-store' } });
}
