'use client';

import { useEffect, useState } from 'react';
import DashboardClient from './DashboardClient';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminClient() {
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState(currentMonth());

  const [settings, setSettings] = useState({
    lunchLockStart: '10:00',
    lunchLockEnd: '13:00',
    dinnerLockStart: '18:00',
    dinnerLockEnd: '21:00',
  });

  const [bills, setBills] = useState({
    seatRent: 0,
    utilityBill: 0,
    wifiBill: 0,
    cookBill: 0,
    electricityBill: 0,
  });

  async function load(m = month) {
    const r = await fetch(`/api/dashboard?month=${m}`, { cache: 'no-store' });
    const j = await r.json();

    setData(j);

    if (j.settings) {
      setSettings({
        lunchLockStart: j.settings.lunchLockStart || '10:00',
        lunchLockEnd: j.settings.lunchLockEnd || '13:00',
        dinnerLockStart: j.settings.dinnerLockStart || '18:00',
        dinnerLockEnd: j.settings.dinnerLockEnd || '21:00',
      });
    }

    if (j.bills) {
      setBills({
        seatRent: +j.bills.seatRent || 0,
        utilityBill: +j.bills.utilityBill || 0,
        wifiBill: +j.bills.wifiBill || 0,
        cookBill: +j.bills.cookBill || 0,
        electricityBill: +j.bills.electricityBill || 0,
      });
    }
  }

  useEffect(() => {
    load(month);
  }, [month]);

  async function bazar(id: string, status: string) {
    const r = await fetch('/api/admin/bazar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    const j = await r.json();
    if (!r.ok) alert(j.error);
    load();
  }

  async function saveSettings() {
    const r = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    const j = await r.json();
    alert(r.ok ? 'Saved' : j.error);
  }

  async function saveBills() {
    const r = await fetch('/api/admin/bills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bills, month }),
    });

    const j = await r.json();
    alert(r.ok ? 'Saved' : j.error);
    load();
  }

  async function updateUser(phone: string, patch: any) {
    const r = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, ...patch }),
    });

    const j = await r.json();
    if (!r.ok) alert(j.error);
    load();
  }

  async function deleteUser(phone: string) {
    if (
      !confirm(
        'Delete this user? Login will be disabled but old meal/bazar history will remain.'
      )
    ) {
      return;
    }

    const r = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    const j = await r.json();
    if (!r.ok) alert(j.error);
    load();
  }

  if (!data) {
    return (
      <main className="page">
        <div className="card">Loading...</div>
      </main>
    );
  }

  if (data.user?.role !== 'admin') {
    return <DashboardClient />;
  }

  return (
    <main className="page">
      <div className="top">
        <div>
          <h1>Admin Panel</h1>
          <p className="muted">
            Control users, bills, bazar verification and meal lock windows.
          </p>
        </div>

        <div className="nav">
          <a className="btn2" href="/dashboard">
            Dashboard
          </a>

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
        <label>Admin month/year</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </section>

      <section className="grid grid2">
        <div className="card grid">
          <h2>Meal Lock Window</h2>

          <label>Lunch Lock Start</label>
          <input
            type="time"
            value={settings.lunchLockStart}
            onChange={(e) =>
              setSettings({ ...settings, lunchLockStart: e.target.value })
            }
          />

          <label>Lunch Lock End</label>
          <input
            type="time"
            value={settings.lunchLockEnd}
            onChange={(e) =>
              setSettings({ ...settings, lunchLockEnd: e.target.value })
            }
          />

          <label>Dinner Lock Start</label>
          <input
            type="time"
            value={settings.dinnerLockStart}
            onChange={(e) =>
              setSettings({ ...settings, dinnerLockStart: e.target.value })
            }
          />

          <label>Dinner Lock End</label>
          <input
            type="time"
            value={settings.dinnerLockEnd}
            onChange={(e) =>
              setSettings({ ...settings, dinnerLockEnd: e.target.value })
            }
          />

          <button className="btn" onClick={saveSettings}>
            Save Lock Window
          </button>
        </div>

        <div className="card grid">
          <h2>Monthly Bills ({month})</h2>

          {Object.keys(bills).map((k) => (
            <div key={k}>
              <label>{k}</label>
              <input
                type="number"
                value={(bills as any)[k]}
                onChange={(e) =>
                  setBills({ ...bills, [k]: Number(e.target.value) })
                }
              />
            </div>
          ))}

          <button className="btn" onClick={saveBills}>
            Save Bills
          </button>
        </div>
      </section>

      <br />

      <section className="card">
        <h2>User Management</h2>

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
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Auth</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {(data.users || []).map((u: any) => (
                <tr key={u.phone}>
                  <td>{u.name}</td>
                  <td>{u.phone}</td>

                  <td>
                    <select
                      value={u.role || 'user'}
                      onChange={(e) =>
                        updateUser(u.phone, { role: e.target.value })
                      }
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>

                  <td>
                    <select
                      value={String(u.authStatus || '0')}
                      onChange={(e) =>
                        updateUser(u.phone, { authStatus: e.target.value })
                      }
                    >
                      <option value="0">unauthorized</option>
                      <option value="1">authorized</option>
                    </select>
                  </td>

                  <td>
                    <button
                      className="btn2 danger"
                      onClick={() => deleteUser(u.phone)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <br />

      <section className="card">
        <h2>Bazar Verification ({month})</h2>

        <p className="muted">Newest requests appear first.</p>

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
                <th>Submitted</th>
                <th>Action</th>
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
                  <td>{b.submittedAt}</td>

                  <td>
                    {b.status === 'pending' && (
                      <>
                        <button
                          className="btn2"
                          onClick={() => bazar(b.id, 'approved')}
                        >
                          Approve
                        </button>

                        <button
                          className="btn2 danger"
                          onClick={() => bazar(b.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}