import { json } from '@sveltejs/kit';

export async function GET({ fetch }) {
  try {
    const response = await fetch(`${process.env.SNOWLINE_API ?? 'http://localhost:3001'}/api/market/status`);
    if (!response.ok) throw new Error('Market status unavailable');
    return json(await response.json());
  } catch {
    return json({ source: 'unavailable', error: 'ไม่สามารถตรวจสอบสถานะราคาได้', entries: [] }, { status: 503 });
  }
}
