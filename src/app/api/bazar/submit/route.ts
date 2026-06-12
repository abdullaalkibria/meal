import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { appendRow } from '@/lib/sheets';
import { today } from '@/lib/calc';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { amount, note, date } = await req.json();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: 'Invalid bazar amount' }, { status: 400 });
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? String(date) : today();
    const month = d.slice(0, 7);
    const year = d.slice(0, 4);
    await appendRow('DailyBazar!A:L', [Date.now().toString(), d, month, year, user.phone, user.name, n.toString(), note || '', 'pending', new Date().toISOString(), '', '']);
    return NextResponse.json({ ok: true, message: 'Bazar submitted for admin verification' });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 401 }); }
}
