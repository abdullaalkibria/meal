import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSheetRows, rowToObject, appendRow, updateRange } from '@/lib/sheets';
import { Meal } from '@/lib/types';
import { safeCount } from '@/lib/calc';

type MealType = 'lunch' | 'dinner';

function samePhone(a: any, b: any) {
  return String(a || '').trim() === String(b || '').trim();
}

function mealStamp(m: Meal) {
  return `${m.date || ''}T${m.updatedAt || ''}`;
}

function latestMealCount(meals: Meal[], phone: string, type: MealType) {
  const found = meals
    .filter(
      (m) =>
        samePhone(m.phone, phone) &&
        String((m as any)[type] ?? '').trim() !== ''
    )
    .sort((a, b) => mealStamp(b).localeCompare(mealStamp(a)))[0];

  return safeCount(found ? (found as any)[type] : 0);
}

function dhakaNow() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
  );
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthKeyFromDate(dateText: string) {
  return dateText.slice(0, 7);
}

function yearKeyFromDate(dateText: string) {
  return dateText.slice(0, 4);
}

function parseTimeToMinutes(time: string | undefined, fallback: string) {
  const safe = String(time || fallback).trim();
  const [h, m] = safe.split(':').map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    const [fh, fm] = fallback.split(':').map(Number);
    return fh * 60 + fm;
  }

  return h * 60 + m;
}

function getCurrentMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function getTargetDateForMeal(mealType: MealType, settings: Record<string, string>) {
  const now = dhakaNow();
  const currentMinutes = getCurrentMinutes(now);

  const todayDate = formatDate(now);
  const tomorrowDate = formatDate(addDays(now, 1));

  if (mealType === 'lunch') {
    const start = parseTimeToMinutes(settings.lunchLockStart, '10:00');
    const end = parseTimeToMinutes(settings.lunchLockEnd, '13:00');

    if (currentMinutes >= start && currentMinutes < end) {
      return {
        locked: true,
        targetDate: todayDate,
        message: `Lunch editing is locked from ${
          settings.lunchLockStart || '10:00'
        } to ${
          settings.lunchLockEnd || '13:00'
        }. Today's lunch is already being prepared/consumed and counted.`,
      };
    }

    if (currentMinutes >= end) {
      return {
        locked: false,
        targetDate: tomorrowDate,
        message: `Today's lunch is already counted. Lunch update applied for tomorrow (${tomorrowDate}).`,
      };
    }

    return {
      locked: false,
      targetDate: todayDate,
      message: `Lunch update applied for today (${todayDate}).`,
    };
  }

  const start = parseTimeToMinutes(settings.dinnerLockStart, '18:00');
  const end = parseTimeToMinutes(settings.dinnerLockEnd, '21:00');

  if (currentMinutes >= start && currentMinutes < end) {
    return {
      locked: true,
      targetDate: todayDate,
      message: `Dinner editing is locked from ${
        settings.dinnerLockStart || '18:00'
      } to ${
        settings.dinnerLockEnd || '21:00'
      }. Today's dinner is already being prepared/consumed and counted.`,
    };
  }

  if (currentMinutes >= end) {
    return {
      locked: false,
      targetDate: tomorrowDate,
      message: `Today's dinner is already counted. Dinner update applied for tomorrow (${tomorrowDate}).`,
    };
  }

  return {
    locked: false,
    targetDate: todayDate,
    message: `Dinner update applied for today (${todayDate}).`,
  };
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const body = (await req.json()) as {
      mealType: MealType;
      value?: boolean;
      count?: number;
    };

    const { mealType } = body;

    if (!['lunch', 'dinner'].includes(mealType)) {
      return NextResponse.json(
        { error: 'Invalid meal type' },
        { status: 400 }
      );
    }

    const settingsRows = await getSheetRows('Settings');
    const settings: Record<string, string> = {};

    settingsRows.data.forEach((r) => {
      if (r[0]) {
        settings[String(r[0]).trim()] = String(r[1] ?? '').trim();
      }
    });

    const target = getTargetDateForMeal(mealType, settings);

    if (target.locked) {
      return NextResponse.json(
        { error: target.message },
        { status: 423 }
      );
    }

    const targetDate = target.targetDate;

    const newCount =
      body.count !== undefined ? safeCount(body.count) : body.value ? 1 : 0;

    const { header, data } = await getSheetRows('MealStatus');

    const meals = data
      .map((r) => rowToObject<Meal>(header, r))
      .filter(
        (x) =>
          String(x.date || '').trim() &&
          String(x.phone || '').trim()
      );

    const currentLunch = latestMealCount(meals, user.phone, 'lunch');
    const currentDinner = latestMealCount(meals, user.phone, 'dinner');

    const idx = data.findIndex((r) => {
      const row = rowToObject<Meal>(header, r);
      return row.date === targetDate && samePhone(row.phone, user.phone);
    });

    const updatedAt = new Date().toISOString();

    if (idx >= 0) {
      const row = [...data[idx]];

      while (row.length < 9) {
        row.push('');
      }

      if (String(row[6] || '') === '') {
        row[6] = String(currentLunch);
      }

      if (String(row[7] || '') === '') {
        row[7] = String(currentDinner);
      }

      row[mealType === 'lunch' ? 6 : 7] = String(newCount);
      row[8] = updatedAt;

      await updateRange(`MealStatus!A${idx + 2}:I${idx + 2}`, [row]);
    } else {
      await appendRow('MealStatus!A:I', [
        Date.now().toString(),
        targetDate,
        monthKeyFromDate(targetDate),
        yearKeyFromDate(targetDate),
        user.phone,
        user.name,
        mealType === 'lunch' ? newCount : currentLunch,
        mealType === 'dinner' ? newCount : currentDinner,
        updatedAt,
      ]);
    }

    return NextResponse.json({
      ok: true,
      message: target.message,
      targetDate,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Meal update failed' },
      { status: 401 }
    );
  }
}
