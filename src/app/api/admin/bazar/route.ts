import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSheetRows, updateRange } from '@/lib/sheets';

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const { id, status } = await req.json();
    if (!['approved','rejected'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const { data } = await getSheetRows('DailyBazar');
    const idx = data.findIndex(r => String(r[0] || '').trim() === String(id || '').trim());
    if (idx < 0) return NextResponse.json({ error: 'Bazar not found' }, { status: 404 });
    const row = [...data[idx]]; while (row.length < 12) row.push('');
    row[8] = status; row[10] = new Date().toISOString(); row[11] = admin.phone;
    await updateRange(`DailyBazar!A${idx+2}:L${idx+2}`, [row]);
    return NextResponse.json({ ok: true });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
}
