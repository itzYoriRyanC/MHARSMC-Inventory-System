// src/pages/Dashboard.jsx
// ✅ FIXES WHITE SCREEN (shows error UI instead of crashing)
// ✅ Uses dashboardService safe queries (no composite index needed)

import "./dashboard.css";
import { useEffect, useMemo, useState } from "react";
import { dashboardService } from "../services/dashboardService";

// ---------- helpers ----------
const parseDateYYYYMMDD = (s) => {
  // supports "2026-3-15" or "2026-03-15"
  if (!s) return null;
  const parts = String(s).split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const daysFromNow = (dateObj) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const lowStatus = (onHand, par) => {
  if (!par || par <= 0) return "—";
  const ratio = onHand / par;
  return ratio <= 0.5 ? "Critical" : "Low";
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [movementsOut30, setMovementsOut30] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    setErr("");

    try {
      const [itemsData, out30] = await Promise.all([
        dashboardService.getItems(),
        dashboardService.getOutMovementsSinceDays(30),
      ]);

      setItems(itemsData);
      setMovementsOut30(out30);
    } catch (e) {
      console.error("Dashboard load error:", e);
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- computed ----------
  const totalItems = items.length;

  const lowStock = useMemo(() => {
    return items
      .filter((it) => it.parLevel > 0 && it.onHand < it.parLevel)
      .map((it) => ({ ...it, status: lowStatus(it.onHand, it.parLevel) }))
      .sort((a, b) => (a.onHand / (a.parLevel || 1)) - (b.onHand / (b.parLevel || 1)));
  }, [items]);

  const criticalLow = useMemo(() => {
    return lowStock.filter((x) => x.status === "Critical").slice(0, 6);
  }, [lowStock]);

  const nearExpiryCounts = useMemo(() => {
    const buckets = { d30: 0, d60: 0, d90: 0 };
    for (const it of items) {
      const dt = parseDateYYYYMMDD(it.expirationDate);
      if (!dt) continue;
      const days = daysFromNow(dt);
      if (days <= 30) buckets.d30 += 1;
      else if (days <= 60) buckets.d60 += 1;
      else if (days <= 90) buckets.d90 += 1;
    }
    return buckets;
  }, [items]);

  const outCount30 = movementsOut30.length;

  const fastMovingTop = useMemo(() => {
    const totals = new Map();
    for (const m of movementsOut30) {
      const itemId = m.itemId || "UNKNOWN";
      const name = m.itemName || "Unnamed";
      const qty = Number(m.quantity || 0) || 0;

      const prev = totals.get(itemId) || { itemId, name, outQty: 0 };
      totals.set(itemId, { ...prev, outQty: prev.outQty + qty });
    }
    return Array.from(totals.values()).sort((a, b) => b.outQty - a.outQty).slice(0, 5);
  }, [movementsOut30]);

  // ---------- UI ----------
  return (
    <div className="dash-wrap">
      <div className="dash-top">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Inventory health overview and alerts</p>
        </div>

        <button className="dash-btn" onClick={loadDashboard} type="button">
          Refresh
        </button>
      </div>

      {/* ✅ ERROR CARD instead of white screen */}
      {err && (
        <div className="dash-error">
          <div className="dash-error-title">Failed to load dashboard data</div>
          <div className="dash-error-msg">{err}</div>
          <div className="dash-error-tip">
            Most common: Firestore Rules blocked read OR missing index. (Check browser console too.)
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="dash-cards">
        <div className="dash-card">
          <div className="dash-card-title">Total Items</div>
          <div className="dash-card-num">{loading ? "—" : totalItems}</div>
          <div className="dash-card-sub">All units</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-title">Low Stock</div>
          <div className="dash-card-num">{loading ? "—" : lowStock.length}</div>
          <div className="dash-card-sub">Needs action</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-title">High Usage Logs</div>
          <div className="dash-card-num">{loading ? "—" : outCount30}</div>
          <div className="dash-card-sub">OUT entries (30 days)</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="dash-grid">
        {/* Critical Low Stock */}
        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <div className="dash-panel-title">Critical Low Stock</div>
              <div className="dash-panel-sub">Prioritize replenishment (≤ 50% of Par)</div>
            </div>
            <span className="dash-pill dash-pill-alert">Alert</span>
          </div>

          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Unit</th>
                  <th>On Hand</th>
                  <th>Par</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="dash-empty">Loading…</td>
                  </tr>
                ) : criticalLow.length ? (
                  criticalLow.map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.unit}</td>
                      <td>{it.onHand}</td>
                      <td>{it.parLevel}</td>
                      <td>
                        <span className="dash-pill dash-pill-critical">{it.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="dash-empty">No critical low stock items.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Near Expiry */}
        <div className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <div className="dash-panel-title">Near Expiry (FEFO)</div>
              <div className="dash-panel-sub">Counts within 30/60/90 days</div>
            </div>
            <span className="dash-pill dash-pill-fefo">FEFO</span>
          </div>

          <div className="dash-kpis">
            <div className="dash-kpi">
              <div className="dash-kpi-label">30 days</div>
              <div className="dash-kpi-value">{loading ? "—" : nearExpiryCounts.d30}</div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi-label">60 days</div>
              <div className="dash-kpi-value">{loading ? "—" : nearExpiryCounts.d60}</div>
            </div>
            <div className="dash-kpi">
              <div className="dash-kpi-label">90 days</div>
              <div className="dash-kpi-value">{loading ? "—" : nearExpiryCounts.d90}</div>
            </div>
          </div>
        </div>

        {/* Fast Moving */}
        <div className="dash-panel dash-panel-wide">
          <div className="dash-panel-head">
            <div>
              <div className="dash-panel-title">Top Fast Moving</div>
              <div className="dash-panel-sub">Most OUT qty (last 30 days)</div>
            </div>
            <span className="dash-pill dash-pill-usage">Usage</span>
          </div>

          <div className="dash-list">
            {loading ? (
              <div className="dash-empty">Loading…</div>
            ) : fastMovingTop.length ? (
              fastMovingTop.map((x) => (
                <div className="dash-row" key={x.itemId}>
                  <div className="dash-row-name">{x.name}</div>
                  <div className="dash-row-val">{x.outQty}</div>
                </div>
              ))
            ) : (
              <div className="dash-empty">No OUT movements yet.</div>
            )}
          </div>

          <div className="dash-tip">
            Tip: Fast-moving + Low stock = highest priority for reorder.
          </div>
        </div>
      </div>
    </div>
  );
}
