import { NextResponse } from 'next/server';
import { appendRow, getSheetRows, rowToObject } from '@/lib/sheets';
import { User } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { name, phone, password } = await req.json();
    if (!name || !phone || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const cleanPhone = String(phone).trim();
    const cleanPassword = String(password);
    const { header, data } = await getSheetRows('Users');
    const users = data.map((r) => rowToObject<User>(header, r));
    if (users.some((u) => String(u.phone || '').trim() === cleanPhone && String(u.isDeleted || '0') !== '1')) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 });
    }
    const isDefaultAdmin = cleanPhone === process.env.ADMIN_PHONE;
    await appendRow('Users!A:I', [Date.now().toString(), name, cleanPhone, cleanPassword, isDefaultAdmin ? 'admin' : 'user', isDefaultAdmin ? '1' : '0', new Date().toISOString(), '', '0']);
    return NextResponse.json({ ok: true, message: isDefaultAdmin ? 'Admin account created' : 'Registered. Wait for admin authorization.' });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
