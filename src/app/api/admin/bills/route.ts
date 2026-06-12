import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { appendRow, getSheetRows, updateRange } from '@/lib/sheets';
import { parseMonth } from '@/lib/calc';
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const month = parseMonth(body.month);
    const year = month.slice(0,4);
    const row = [month, year, body.seatRent || 0, body.utilityBill || 0, body.wifiBill || 0, body.cookBill || 0, body.electricityBill || 0, new Date().toISOString()];
    const { data } = await getSheetRows('Bills');
    const idx = data.findIndex(r => r[0] === month);
    if (idx >= 0) await updateRange(`Bills!A${idx+2}:H${idx+2}`, [row]); else await appendRow('Bills!A:H', row);
    return NextResponse.json({ ok: true });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
}
