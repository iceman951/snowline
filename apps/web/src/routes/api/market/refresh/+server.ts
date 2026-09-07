import { json } from '@sveltejs/kit';

export async function POST({ fetch }) {
  try {
    const response = await fetch(`${process.env.SNOWLINE_API ?? 'http://localhost:3001'}/api/market/refresh`, { method: 'POST' });
    return json(await response.json(), { status: response.status,
      headers: response.headers.has('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After')! } : {} });
  } catch {
    return json({ error: 'อัปเดตราคาไม่ได้ กรุณาลองใหม่อีกครั้ง' }, { status: 503 });
  }
}
