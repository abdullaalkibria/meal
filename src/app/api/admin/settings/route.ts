import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSheetRows, updateRange, appendRow } from '@/lib/sheets';
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { data } = await getSheetRows('Settings');
    for (const [key, value] of Object.entries(body)) {
      const idx = data.findIndex(r => String(r[0]) === key);
      if (idx >= 0) { const row = [...data[idx]]; while(row.length<3) row.push(''); row[1] = String(value); await updateRange(`Settings!A${idx+2}:C${idx+2}`, [row]); }
      else await appendRow('Settings!A:C', [key, String(value), '']);
    }
    return NextResponse.json({ ok: true });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
}
