import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { appendRow, getSheetRows, rowToObject, updateRange } from '@/lib/sheets';
import { Bazar, Bills, Meal, User } from '@/lib/types';
import { approvedBazarTotal, fixedBillTotal, isLocked, mealCount, monthKey, parseMonth, safeCount, today, yearKey } from '@/lib/calc';

async function autoApproveOldBazars() {
  const { header, data } = await getSheetRows('DailyBazar');
  let changed = false;
  const now = Date.now();
  const rows = data.map((r) => {
    const b = rowToObject<Bazar>(header, r);
    const submittedAt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    if (b.status === 'pending' && submittedAt && now - submittedAt >= 72 * 60 * 60 * 1000) {
      changed = true;
      const copy = [...r];
      while (copy.length < 12) copy.push('');
      copy[8] = 'approved'; copy[10] = new Date().toISOString(); copy[11] = 'AUTO_72H';
      return copy;
    }
    return r;
  });
  if (changed) await updateRange('DailyBazar!A2:L', rows);
}

function samePhone(a:any,b:any){return String(a||'').trim()===String(b||'').trim()}
function mealStamp(m: Meal){ return `${m.date || ''}T${m.updatedAt || ''}`; }
function latestMealFor(meals: Meal[], phone: string, beforeDate?: string) {
  return meals
    .filter(m => samePhone(m.phone, phone) && (!beforeDate || String(m.date || '') <= beforeDate))
    .sort((a,b) => mealStamp(b).localeCompare(mealStamp(a)))[0];
}
function latestMealCount(meals: Meal[], phone: string, type: 'lunch'|'dinner', beforeDate?: string) {
  const found = meals
    .filter(m => samePhone(m.phone, phone) && (!beforeDate || String(m.date || '') <= beforeDate) && String((m as any)[type] ?? '').trim() !== '')
    .sort((a,b) => mealStamp(b).localeCompare(mealStamp(a)))[0];
  return safeCount(found ? (found as any)[type] : 0);
}

async function materializeLockSnapshots(users: User[], meals: Meal[], settings: Record<string,string>) {
  const t = today();
  const lockedLunch = isLocked('lunch', settings);
  const lockedDinner = isLocked('dinner', settings);
  if (!lockedLunch && !lockedDinner) return;

  const { data } = await getSheetRows('MealStatus');
  let changed = false;
  const nextRows = data.map(r => [...r]);

  for (const usr of users) {
    const idx = nextRows.findIndex(r => String(r[1] || '') === t && samePhone(r[4], usr.phone));
    const lunchCount = latestMealCount(meals, usr.phone, 'lunch', t);
    const dinnerCount = latestMealCount(meals, usr.phone, 'dinner', t);

    if (idx >= 0) {
      const row = nextRows[idx]; while(row.length < 9) row.push('');
      if (lockedLunch && String(row[6] || '') === '') { row[6] = String(lunchCount); changed = true; }
      if (lockedDinner && String(row[7] || '') === '') { row[7] = String(dinnerCount); changed = true; }
      if (changed) row[8] = new Date().toISOString();
    } else {
      await appendRow('MealStatus!A:I', [Date.now().toString()+usr.phone.slice(-4), t, monthKey(), yearKey(), usr.phone, usr.name, lockedLunch ? lunchCount : '', lockedDinner ? dinnerCount : '', new Date().toISOString()]);
      meals.push({id:Date.now().toString(), date:t, month:monthKey(), year:yearKey(), phone:usr.phone, name:usr.name, lunch:String(lockedLunch ? lunchCount : 0), dinner:String(lockedDinner ? dinnerCount : 0), updatedAt:new Date().toISOString()});
    }
  }
  if (changed) await updateRange('MealStatus!A2:I', nextRows);
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    await autoApproveOldBazars();
    const url = new URL(req.url);
    const selectedMonth = parseMonth(url.searchParams.get('month'));
    const selectedYear = selectedMonth.slice(0, 4);

    const [u, m, b, billsRows, settingsRows] = await Promise.all([
      getSheetRows('Users'), getSheetRows('MealStatus'), getSheetRows('DailyBazar'), getSheetRows('Bills'), getSheetRows('Settings')
    ]);
    const users = u.data.map((r) => rowToObject<User>(u.header, r)).filter(x => String(x.phone || '').trim() && String(x.authStatus || '').trim() === '1' && String(x.isDeleted || '0') !== '1');
    const allUsers = u.data.map((r) => rowToObject<User>(u.header, r)).filter(x => String(x.phone || '').trim() && String(x.isDeleted || '0') !== '1');
    const meals = m.data.map((r) => rowToObject<Meal>(m.header, r)).filter(x => String(x.date || '').trim() && String(x.phone || '').trim());
    const bazars = b.data.map((r) => rowToObject<Bazar>(b.header, r)).filter(x => String(x.id || '').trim() && String(x.date || '').trim());
    const settings: Record<string,string> = {}; settingsRows.data.forEach(r => { if (r[0]) settings[String(r[0])] = String(r[1] ?? ''); });

    await materializeLockSnapshots(users, meals, settings);

    const billRaw = billsRows.data.map((r) => rowToObject<any>(billsRows.header, r)).find((x) => x.month === selectedMonth) || {};
    const fixed: Bills = { month: selectedMonth, year: selectedYear, seatRent: +billRaw.seatRent || 0, utilityBill: +billRaw.utilityBill || 0, wifiBill: +billRaw.wifiBill || 0, cookBill: +billRaw.cookBill || 0, electricityBill: +billRaw.electricityBill || 0 };

    const monthMeals = meals.filter(x => String(x.month || x.date?.slice(0,7)) === selectedMonth);
    const monthBazars = bazars.filter(x => String(x.month || x.date?.slice(0,7)) === selectedMonth);
    const totalMeals = mealCount(monthMeals);
    const totalBazar = approvedBazarTotal(monthBazars);
    const mealRate = totalMeals ? totalBazar / totalMeals : 0;
    const myMeals = monthMeals.filter(x => samePhone(x.phone, user.phone));
    const myMealCount = mealCount(myMeals);
    const myBazar = approvedBazarTotal(monthBazars.filter(x => samePhone(x.phone, user.phone)));
    const mealCost = myMealCount * mealRate;
    const fixedBills = fixedBillTotal(fixed);
    const payable = mealCost + fixedBills;
    const net = payable - myBazar;
    const todayKey = today();
    const todayMeals = users.map((usr, i) => {
      return { sn: i + 1, name: usr.name, phone: usr.phone, lunch: latestMealCount(meals, usr.phone, 'lunch', todayKey), dinner: latestMealCount(meals, usr.phone, 'dinner', todayKey) };
    });
    const sortedBazars = monthBazars.sort((a:any,b:any)=>String(b.submittedAt||b.id||'').localeCompare(String(a.submittedAt||a.id||'')));
    const myBazarRows = sortedBazars.filter(x => samePhone(x.phone, user.phone));
    const bazarByPerson = users.map(usr => ({ name: usr.name, phone: usr.phone, amount: approvedBazarTotal(monthBazars.filter(x => samePhone(x.phone, usr.phone))) }));

    return NextResponse.json({
      user: { name: user.name, phone: user.phone, role: user.role }, today: todayKey, month: selectedMonth, settings, users: allUsers, todayMeals,
      summary: { totalMeals, totalBazar, mealRate, myMealCount, myBazar, mealCost, fixedBills, payable, receivable: net < 0 ? Math.abs(net) : 0, due: net > 0 ? net : 0 },
      bazars: sortedBazars, myBazarRows, bazarByPerson, bills: fixed
    });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 401 }); }
}
