import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getSheetRows, updateRange } from '@/lib/sheets';

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const { phone, authStatus, role } = await req.json();
    const { data } = await getSheetRows('Users');
    const idx = data.findIndex(r => String(r[2] || '').trim() === String(phone || '').trim());
    if (idx < 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const row = [...data[idx]]; while (row.length < 9) row.push('');
    if (role) row[4] = role;
    if (authStatus !== undefined) row[5] = String(authStatus);
    await updateRange(`Users!A${idx+2}:I${idx+2}`, [row]);
    return NextResponse.json({ ok: true });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { phone } = await req.json();
    if (String(phone || '').trim() === String(admin.phone || '').trim()) return NextResponse.json({ error: 'Admin cannot delete own account while logged in' }, { status: 400 });
    const { data } = await getSheetRows('Users');
    const idx = data.findIndex(r => String(r[2] || '').trim() === String(phone || '').trim());
    if (idx < 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const row = [...data[idx]]; while (row.length < 9) row.push('');
    row[5] = '0'; row[7] = new Date().toISOString(); row[8] = '1';
    await updateRange(`Users!A${idx+2}:I${idx+2}`, [row]);
    return NextResponse.json({ ok: true });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
}
