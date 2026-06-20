'use client';

import { useEffect, useState } from 'react';

type Data = any;
type MealType = 'lunch' | 'dinner';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function money(n: any) {
  return Number(n || 0).toFixed(0);
}

function Tally({ count }: { count: number }) {
  const n = Math.max(0, Number(count || 0));
  if (n === 0) return <span className="tally zero">0</span>;

  const groups = [] as string[];
  let left = n;

  while (left > 0) {
    const take = Math.min(5, left);
    groups.push(take === 5 ? '||||/' : '|'.repeat(take));
    left -= take;
  }

  return (
    <span className="tally">
      {groups.map((g, i) => (
        <span key={i} className="tallyGroup">
          {g}
        </span>
      ))}
    </span>
  );
}

function getDaysInMonth(month: string) {
  const [year, monthNo] = month.split('-').map(Number);
  return new Date(year, monthNo, 0).getDate();
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

function timeToMinutes(time: string | undefined, fallback: string) {
  const safe = time || fallback;
  const [h, m] = safe.split(':').map(Number);
  return h * 60 + m;
}

function getMealEditInfo(mealType: MealType, settings: any) {
  const now = dhakaNow();
  const today = formatDate(now);
  const tomorrow = formatDate(addDays(now, 1));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (mealType === 'lunch') {
    const start = timeToMinutes(settings?.lunchLockStart, '10:00');
    const end = timeToMinutes(settings?.lunchLockEnd, '13:00');

    if (currentMinutes >= start && currentMinutes < end) {
      return {
        locked: true,
        targetDate: today,
        label: 'Lunch editing locked',
        help: `Lunch is locked from ${settings?.lunchLockStart || '10:00'} to ${
          settings?.lunchLockEnd || '13:00'
        }. Today's lunch is already counted.`,
      };
    }

    if (currentMinutes >= end) {
      return {
        locked: false,
        targetDate: tomorrow,
        label: `Tomorrow lunch plan (${tomorrow})`,
        help: `Today's lunch is already counted. Lunch changes now apply to tomorrow.`,
      };
    }

    return {
      locked: false,
      targetDate: today,
      label: `Today lunch plan (${today})`,
      help: `Lunch changes now apply to today.`,
    };
  }

  const start = timeToMinutes(settings?.dinnerLockStart, '18:00');
  const end = timeToMinutes(settings?.dinnerLockEnd, '21:00');

  if (currentMinutes >= start && currentMinutes < end) {
    return {
      locked: true,
      targetDate: today,
      label: 'Dinner editing locked',
      help: `Dinner is locked from ${settings?.dinnerLockStart || '18:00'} to ${
        settings?.dinnerLockEnd || '21:00'
      }. Today's dinner is already counted.`,
    };
  }

  if (currentMinutes >= end) {
    return {
      locked: false,
      targetDate: tomorrow,
      label: `Tomorrow dinner plan (${tomorrow})`,
      help: `Today's dinner is already counted. Dinner changes now apply to tomorrow.`,
    };
  }

  return {
    locked: false,
    targetDate: today,
    label: `Today dinner plan (${today})`,
    help: `Dinner changes now apply to today.`,
  };
}

function getAllMealRows(data: any) {
  return [
    ...(data.meals || []),
    ...(data.monthMeals || []),
    ...(data.mealRows || []),
    ...(data.allMeals || []),
  ];
}

function getUserDayMeal(data: any, phone: string, date: string) {
  const rows = getAllMealRows(data);

  const found = rows.find(
    (m: any) =>
      String(m.phone || '').trim() === phone &&
      String(m.date || '').trim() === date
  );

  if (found) {
    return Number(found.lunch || 0) + Number(found.dinner || 0);
  }

  if (String(data.today || '').trim() === date) {
    const todayFound = (data.todayMeals || []).find(
      (m: any) => String(m.phone || '').trim() === phone
    );

    if (todayFound) {
      return Number(todayFound.lunch || 0) + Number(todayFound.dinner || 0);
    }
  }

  return 0;
}

function getUserMealCountForDate(
  data: any,
  phone: string,
  date: string,
  mealType: MealType
) {
  const rows = getAllMealRows(data);

  const found = rows.find(
    (m: any) =>
      String(m.phone || '').trim() === phone &&
      String(m.date || '').trim() === date
  );

  if (found) {
    return Number(found[mealType] || 0);
  }

  if (String(data.today || '').trim() === date) {
    const todayFound = (data.todayMeals || []).find(
      (m: any) => String(m.phone || '').trim() === phone
    );

    if (todayFound) {
      return Number(todayFound[mealType] || 0);
    }
  }

  return 0;
}

export default function DashboardClient() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState(currentMonth());

  async function load(m = month) {
    const r = await fetch(`/api/dashboard?month=${m}`, { cache: 'no-store' });
    const j = await r.json();

    if (!r.ok) {
      if (j.error === 'Unauthorized') {
        location.href = '/login';
        return;
      }

      setErr(j.error);
      return;
    }

    setErr('');
    setData(j);
  }

  useEffect(() => {
    load(month);
  }, [month]);

  async function setMeal(type: MealType, count: number) {
    const r = await fetch('/api/meal/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealType: type, count }),
    });

    const j = await r.json();

    if (!r.ok) {
      alert(j.error);
      return;
    }

    if (j.message) {
      alert(j.message);
    }

    await load();
  }

  async function submitBazar(e: any) {
    e.preventDefault();

    const r = await fetch('/api/bazar/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, note, date }),
    });

    const j = await r.json();

    if (!r.ok) {
      alert(j.error);
    } else {
      alert(j.message || 'Submitted');
      setAmount('');
      setNote('');
      setDate('');
      await load();
    }
  }

  if (err) {
    return (
      <main className="page">
        <div className="card error">{err}</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page">
        <div className="card">Loading...</div>
      </main>
    );
  }

  const userPhone = String(data.user.phone || '').trim();
  const daysInMonth = getDaysInMonth(month);
  const mealRate = Number(data.summary.mealRate || 0);

  const lunchEdit = getMealEditInfo('lunch', data.settings);
  const dinnerEdit = getMealEditInfo('dinner', data.settings);

  const lunchCount = getUserMealCountForDate(
    data,
    userPhone,
    lunchEdit.targetDate,
    'lunch'
  );

  const dinnerCount = getUserMealCountForDate(
    data,
    userPhone,
    dinnerEdit.targetDate,
    'dinner'
  );

  return (
    <main className="page">
      <div className="top">
        <div>
          <h1>Meal Dashboard</h1>
          <p className="muted">
            Welcome, {data.user.name} · Today {data.today}
          </p>
        </div>

        <div className="nav">
          {data.user.role === 'admin' && (
            <a className="btn2" href="/admin">
              Admin Panel
            </a>
          )}

          <button className="btn2" onClick={() => load(month)}>
            Refresh
          </button>

          <button
            className="btn2"
            onClick={() =>
              fetch('/api/auth/logout', { method: 'POST' }).then(
                () => (location.href = '/login')
              )
            }
          >
            Logout
          </button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <label>View month/year</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <p className="muted">
          Reports are calculated month-wise and year-wise from the selected month.
        </p>
      </section>

      <section className="grid grid2">
        <div className="card">
          <p className="muted">Meal Rate</p>
          <div className="stat">৳ {Number(data.summary.mealRate).toFixed(2)}</div>
        </div>

        <div className="card">
          <p className="muted">My Meals</p>
          <div className="stat">{data.summary.myMealCount}</div>
        </div>

        <div className="card">
          <p className="muted">Due</p>
          <div className="stat">৳ {money(data.summary.due)}</div>
        </div>

        <div className="card">
          <p className="muted">Receivable</p>
          <div className="stat">৳ {money(data.summary.receivable)}</div>
        </div>
      </section>

      <br />

      <section className="grid grid2">
        <div className="card">
          <h2>Meal Cost</h2>
          <p>Meal rate × my meals</p>
          <p className="bigline">
            ৳ {Number(data.summary.mealRate).toFixed(2)} ×{' '}
            {data.summary.myMealCount} = ৳ {money(data.summary.mealCost)}
          </p>
        </div>

        <div className="card">
          <h2>Fixed Monthly Cost</h2>
          <p>Seat rent: ৳ {money(data.bills.seatRent)}</p>
          <p>Utility: ৳ {money(data.bills.utilityBill)}</p>
          <p>WiFi: ৳ {money(data.bills.wifiBill)}</p>
          <p>Cook: ৳ {money(data.bills.cookBill)}</p>
          <p>Electricity: ৳ {money(data.bills.electricityBill)}</p>
          <p>
            <b>Total fixed: ৳ {money(data.summary.fixedBills)}</b>
          </p>
        </div>
      </section>

      <br />

      <section className="card">
        <h2>Monthly Meal Calculation ({month})</h2>
        <p className="muted">
          Day-wise consumed meal count. Total TK = Total Meal × Meal Rate.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="w-full">
            <thead>
              <tr>
                <th>SN</th>
                <th>Name</th>
                <th>Phone</th>

                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1}>{i + 1}</th>
                ))}

                <th>Total Meal</th>
                <th>Total TK</th>
              </tr>
            </thead>

            <tbody>
              {(data.users || []).map((u: any, index: number) => {
                const phone = String(u.phone || '').trim();

                const dailyMeals = Array.from({ length: daysInMonth }, (_, i) => {
                  const day = String(i + 1).padStart(2, '0');
                  const mealDate = `${month}-${day}`;
                  return getUserDayMeal(data, phone, mealDate);
                });

                const totalMeal = dailyMeals.reduce(
                  (sum: number, val: number) => sum + val,
                  0
                );

                const totalTk = totalMeal * mealRate;

                return (
                  <tr key={phone || index}>
                    <td>{index + 1}</td>
                    <td>{u.name}</td>
                    <td>{u.phone}</td>

                    {dailyMeals.map((v: number, i: number) => (
                      <td key={i}>{v || '-'}</td>
                    ))}

                    <td>{totalMeal}</td>
                    <td>৳ {money(totalTk)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <br />

      <section className="card">
        <h2>My Current Meal Plan</h2>

        <div className="mealControls">
          <div>
            <b>Lunch</b>
            <p className="muted">{lunchEdit.label}</p>

            <div className="counter">
              <button
                className="btn2"
                disabled={lunchEdit.locked}
                onClick={() =>
                  setMeal('lunch', Math.max(0, Number(lunchCount) - 1))
                }
              >
                −
              </button>

              <span>{lunchCount}</span>

              <button
                className="btn2"
                disabled={lunchEdit.locked}
                onClick={() => setMeal('lunch', Number(lunchCount) + 1)}
              >
                +
              </button>
            </div>

            <p className="muted">{lunchEdit.help}</p>
          </div>

          <div>
            <b>Dinner</b>
            <p className="muted">{dinnerEdit.label}</p>

            <div className="counter">
              <button
                className="btn2"
                disabled={dinnerEdit.locked}
                onClick={() =>
                  setMeal('dinner', Math.max(0, Number(dinnerCount) - 1))
                }
              >
                −
              </button>

              <span>{dinnerCount}</span>

              <button
                className="btn2"
                disabled={dinnerEdit.locked}
                onClick={() => setMeal('dinner', Number(dinnerCount) + 1)}
              >
                +
              </button>
            </div>

            <p className="muted">{dinnerEdit.help}</p>
          </div>
        </div>

        <p className="muted">
          Use 0 for OFF, 1 for yourself, 2+ when you have guest meals. Lunch
          lock: {data.settings.lunchLockStart || '10:00'}–
          {data.settings.lunchLockEnd || '13:00'} · Dinner lock:{' '}
          {data.settings.dinnerLockStart || '18:00'}–
          {data.settings.dinnerLockEnd || '21:00'}
        </p>
      </section>

      <br />

      <section className="card">
        <h2>Real-time Meal Status</h2>
        <table>
          <thead>
            <tr>
              <th>SN</th>
              <th>Name</th>
              <th>Lunch</th>
              <th>Dinner</th>
            </tr>
          </thead>

          <tbody>
            {data.todayMeals.map((r: any) => (
              <tr key={r.phone}>
                <td>{r.sn}</td>
                <td>{r.name}</td>
                <td>
                  <Tally count={r.lunch} />
                </td>
                <td>
                  <Tally count={r.dinner} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <br />

      <section className="grid grid2">
        <form onSubmit={submitBazar} className="card grid">
          <h2>Submit Daily Bazar</h2>

          <div>
            <label>Date</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
            />
          </div>

          <div>
            <label>Amount BDT</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="1"
            />
          </div>

          <div>
            <label>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <button className="btn">Submit for Admin Verification</button>

          <p className="muted">
            Admin can approve/reject. If no action within 72 hours, it
            auto-approves.
          </p>
        </form>

        <div className="card">
          <h2>My Bazar Summary</h2>
          <p>Total approved bazar by me: ৳ {money(data.summary.myBazar)}</p>
          <p>Total payable: ৳ {money(data.summary.payable)}</p>
          <p className="muted">
            Payable = meal cost + fixed monthly cost. Receivable happens when your
            approved bazar is higher than payable.
          </p>
        </div>
      </section>

      <br />

      <section className="card">
        <h2>Month-wise Bazar Contribution ({month})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Total Approved Bazar</th>
            </tr>
          </thead>

          <tbody>
            {(data.bazarByPerson || []).map((x: any) => (
              <tr key={x.phone}>
                <td>{x.name}</td>
                <td>৳ {money(x.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <br />

      <section className="card">
        <h2>All Bazar Entries ({month})</h2>

        <div
          style={{
            maxHeight: '430px',
            overflowY: 'auto',
            paddingRight: '8px',
          }}
        >
          <table className="w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {(data.bazars || []).map((b: any) => (
                <tr key={b.id}>
                  <td>{b.date}</td>
                  <td>{b.name}</td>
                  <td>৳ {b.amount}</td>
                  <td>{b.note}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <br />

      <section className="card">
        <h2>My Bazar Entries ({month})</h2>

        <div
          style={{
            maxHeight: '430px',
            overflowY: 'auto',
            paddingRight: '8px',
          }}
        >
          <table className="w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Note</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {(data.myBazarRows || []).map((b: any) => (
                <tr key={b.id}>
                  <td>{b.date}</td>
                  <td>৳ {b.amount}</td>
                  <td>{b.note}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
