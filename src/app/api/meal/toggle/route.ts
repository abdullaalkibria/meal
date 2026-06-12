import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSheetRows, rowToObject, appendRow, updateRange } from '@/lib/sheets';
import { Meal } from '@/lib/types';
import { isLocked, lockMessage, today, monthKey, yearKey, safeCount } from '@/lib/calc';

function samePhone(a:any,b:any){return String(a||'').trim()===String(b||'').trim()}
function mealStamp(m: Meal){ return `${m.date || ''}T${m.updatedAt || ''}`; }
function latestMealCount(meals: Meal[], phone: string, type: 'lunch'|'dinner') {
  const found = meals.filter(m => samePhone(m.phone, phone) && String((m as any)[type] ?? '').trim() !== '').sort((a,b)=>mealStamp(b).localeCompare(mealStamp(a)))[0];
  return safeCount(found ? (found as any)[type] : 0);
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json() as { mealType: 'lunch'|'dinner', value?: boolean, count?: number };
    const { mealType } = body;
    if (!['lunch','dinner'].includes(mealType)) return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
    const settingsRows = await getSheetRows('Settings');
    const settings: Record<string,string> = {}; settingsRows.data.forEach(r => { if (r[0]) settings[String(r[0])] = String(r[1] ?? ''); });
    if (isLocked(mealType, settings)) return NextResponse.json({ error: lockMessage(mealType, settings) }, { status: 423 });

    const newCount = body.count !== undefined ? safeCount(body.count) : (body.value ? 1 : 0);
    const { header, data } = await getSheetRows('MealStatus');
    const meals = data.map((r) => rowToObject<Meal>(header, r)).filter(x => String(x.date || '').trim() && String(x.phone || '').trim());
    const currentLunch = latestMealCount(meals, user.phone, 'lunch');
    const currentDinner = latestMealCount(meals, user.phone, 'dinner');
    const t = today();
    const idx = data.findIndex(r => {
      const row = rowToObject<Meal>(header, r);
      return row.date === t && samePhone(row.phone, user.phone);
    });
    if (idx >= 0) {
      const row = [...data[idx]]; while (row.length < 9) row.push('');
      if (String(row[6] || '') === '') row[6] = String(currentLunch);
      if (String(row[7] || '') === '') row[7] = String(currentDinner);
      row[mealType === 'lunch' ? 6 : 7] = String(newCount); row[8] = new Date().toISOString();
      await updateRange(`MealStatus!A${idx+2}:I${idx+2}`, [row]);
    } else {
      await appendRow('MealStatus!A:I', [Date.now().toString(), t, monthKey(), yearKey(), user.phone, user.name, mealType === 'lunch' ? newCount : currentLunch, mealType === 'dinner' ? newCount : currentDinner, new Date().toISOString()]);
    }
    return NextResponse.json({ ok: true });
  } catch(e:any) { return NextResponse.json({ error: e.message }, { status: 401 }); }
}
