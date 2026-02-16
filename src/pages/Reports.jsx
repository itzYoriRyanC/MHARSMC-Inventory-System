// src/pages/Reports.jsx
// ✅ SHORT + CLEAN Reports UI
// ✅ Firestore logic moved to ReportsService (OOP)
// ✅ Export moved to reportsExport.js
// ✅ Fix: "Failed to load reports data" avoided via fallback query

import "./reports.css";
import { useEffect, useMemo, useState } from "react";
import { db } from "../services/firebase";
import { ReportsService } from "../services/reportsService";
import { exportCSV, exportPDF } from "../services/reportsExport";

const svc = new ReportsService(db);

function parseDateYYYYMMDD(s) {
  if (!s) return null;
  const parts = String(s).split("-");
  if (parts.length !== 3) return null;

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;

  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysFromNow(dateObj) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function lowStockStatus(onHand, par) {
  if (par <= 0) return "—";
  const ratio = onHand / par;
  if (ratio <= 0.5) return "Critical";
  return "Low";
}

export default function Reports() {
  const [loading, setLoading] = useState(true);

  // Data
  const [items, setItems] = useState([]);
  const [movementsOut30, setMovementsOut30] = useState([]);
  const [thresholds, setThresholds] = useState({ d30: 30, d60: 60, d90: 90 });

  // UI
  const [tab, setTab] = useState("LOW"); // LOW | EXPIRY | FAST
  const [qText, setQText] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [catFilter, setCatFilter] = useState("ALL");

  const loadAll = async () => {
    setLoading(true);
    try {
      const bundle = await svc.loadBundle();
      setThresholds(bundle.thresholds);
      setItems(bundle.items);
      setMovementsOut30(bundle.movementsOut30);
    } catch (e) {
      console.error("Reports load error:", e);
      alert("Failed to load reports data. (Check Firestore rules / internet)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // Shared filters
  // ---------------------------
  const filteredItems = useMemo(() => {
    const t = qText.trim().toLowerCase();
    return items.filter((it) => {
      const matchText =
        !t ||
        it.name.toLowerCase().includes(t) ||
        String(it.category).toLowerCase().includes(t);

      const matchUnit = unitFilter === "ALL" || it.unit === unitFilter;
      const matchCat = catFilter === "ALL" || it.category === catFilter;

      return matchText && matchUnit && matchCat;
    });
  }, [items, qText, unitFilter, catFilter]);

  // ---------------------------
  // Low Stock
  // ---------------------------
  const lowStock = useMemo(() => {
    return filteredItems
      .filter((it) => it.parLevel > 0 && it.onHand < it.parLevel)
      .map((it) => ({ ...it, status: lowStockStatus(it.onHand, it.parLevel) }))
      .sort((a, b) => (a.onHand / (a.parLevel || 1)) - (b.onHand / (b.parLevel || 1)));
  }, [filteredItems]);

  // ---------------------------
  // Near Expiry
  // ---------------------------
  const nearExpiry = useMemo(() => {
    const d30 = thresholds.d30 ?? 30;
    const d60 = thresholds.d60 ?? 60;
    const d90 = thresholds.d90 ?? 90;

    return filteredItems
      .map((it) => {
        const dt = parseDateYYYYMMDD(it.expirationDate);
        if (!dt) return null;

        const days = daysFromNow(dt);
        if (days < 0) return { ...it, daysLeft: days, bucket: "Expired" };
        if (days <= d30) return { ...it, daysLeft: days, bucket: `${d30} days` };
        if (days <= d60) return { ...it, daysLeft: days, bucket: `${d60} days` };
        if (days <= d90) return { ...it, daysLeft: days, bucket: `${d90} days` };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [filteredItems, thresholds]);

  // ---------------------------
  // Fast Moving (aggregate OUT)
  // ---------------------------
  const fastMoving = useMemo(() => {
    const totals = new Map();
    for (const m of movementsOut30) {
      const itemId = m.itemId || "UNKNOWN";
      const name = m.itemName || "Unnamed";
      const unit = m.unit || "—";
      const qty = Number(m.quantity || 0);

      const prev = totals.get(itemId) || { itemId, name, unit, outQty: 0 };
      totals.set(itemId, { ...prev, outQty: prev.outQty + qty });
    }
    return Array.from(totals.values()).sort((a, b) => b.outQty - a.outQty);
  }, [movementsOut30]);

  const topFast = fastMoving[0];

  // Summary cards
  const lowCount = lowStock.length;
  const expiryCount30 = useMemo(() => {
    const d30 = thresholds.d30 ?? 30;
    return nearExpiry.filter((x) => x.bucket === `${d30} days` || x.bucket === "Expired").length;
  }, [nearExpiry, thresholds]);

  const tableTitle = useMemo(() => {
    if (tab === "LOW") return "Low Stock Items (Below Par)";
    if (tab === "EXPIRY") return "Near Expiry Items (FEFO)";
    return "Fast Moving Items (Last 30 Days OUT)";
  }, [tab]);

  // Export HTML (for PDF)
  const tableHTML = useMemo(() => {
    if (tab === "LOW") {
      const rows = lowStock
        .map(
          (it) => `
        <tr>
          <td>${it.name}</td><td>${it.unit}</td><td>${it.onHand}</td><td>${it.parLevel}</td><td>${it.status}</td><td>${it.category}</td>
        </tr>`
        )
        .join("");

      return `<table><thead><tr>
        <th>Item</th><th>Unit</th><th>On Hand</th><th>Par</th><th>Status</th><th>Category</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
    }

    if (tab === "EXPIRY") {
      const rows = nearExpiry
        .map(
          (it) => `
        <tr>
          <td>${it.name}</td><td>${it.unit}</td><td>${it.expirationDate || "—"}</td><td>${it.daysLeft}</td><td>${it.bucket}</td><td>${it.category}</td>
        </tr>`
        )
        .join("");

      return `<table><thead><tr>
        <th>Item</th><th>Unit</th><th>Expiry</th><th>Days Left</th><th>Bucket</th><th>Category</th>
      </tr></thead><tbody>${rows}</tbody></table>`;
    }

    const rows = fastMoving
      .map((x) => `<tr><td>${x.name}</td><td>${x.unit}</td><td>${x.outQty}</td></tr>`)
      .join("");

    return `<table><thead><tr>
      <th>Item</th><th>Unit</th><th>OUT Qty (30d)</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
  }, [tab, lowStock, nearExpiry, fastMoving]);

  // Export CSV
  const doExportCSV = () => {
    if (tab === "LOW") {
      exportCSV("low_stock.csv", [
        ["Item", "Unit", "On Hand", "Par", "Status", "Category"],
        ...lowStock.map((it) => [it.name, it.unit, it.onHand, it.parLevel, it.status, it.category]),
      ]);
      return;
    }

    if (tab === "EXPIRY") {
      exportCSV("near_expiry.csv", [
        ["Item", "Unit", "Expiry", "Days Left", "Bucket", "Category"],
        ...nearExpiry.map((it) => [it.name, it.unit, it.expirationDate || "—", it.daysLeft, it.bucket, it.category]),
      ]);
      return;
    }

    exportCSV("fast_moving.csv", [
      ["Item", "Unit", "OUT Qty (30d)"],
      ...fastMoving.map((x) => [x.name, x.unit, x.outQty]),
    ]);
  };

  const doExportPDF = () => exportPDF(`MHARSMC Reports - ${tableTitle}`, tableHTML);

  return (
    <div className="rep-wrap">
      {/* Header */}
      <div className="rep-top">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Generate and review inventory summaries (Low Stock, Near Expiry, Fast Moving)
          </p>
        </div>

        <div className="rep-actions">
          <button className="rep-btn" onClick={doExportCSV} type="button">
            Export CSV
          </button>
          <button className="rep-btn rep-btn-primary" onClick={doExportPDF} type="button">
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="rep-cards">
        <div className="rep-card">
          <div className="rep-card-head">
            <div className="rep-card-title">Low Stock</div>
            <span className="tag tag-warn">Needs Action</span>
          </div>
          <div className="rep-card-number">{loading ? "—" : lowCount}</div>
          <div className="rep-card-sub">Items below Par level</div>
        </div>

        <div className="rep-card">
          <div className="rep-card-head">
            <div className="rep-card-title">Near Expiry</div>
            <span className="tag tag-fefo">FEFO</span>
          </div>
          <div className="rep-card-number">{loading ? "—" : expiryCount30}</div>
          <div className="rep-card-sub">Expiring soon / expired</div>
          <div className="rep-mini">
            Thresholds: {thresholds.d30}/{thresholds.d60}/{thresholds.d90} days
          </div>
        </div>

        <div className="rep-card">
          <div className="rep-card-head">
            <div className="rep-card-title">Fast Moving</div>
            <span className="tag tag-usage">Usage</span>
          </div>
          <div className="rep-card-big">{loading ? "—" : topFast ? topFast.name : "—"}</div>
          <div className="rep-card-sub">Top item by OUT qty (30 days)</div>
        </div>
      </div>

      {/* Tabs + Filters + Table */}
      <div className="rep-table-card">
        <div className="rep-tabs-row">
          <div className="rep-tabs">
            <button className={tab === "LOW" ? "rep-tab active" : "rep-tab"} onClick={() => setTab("LOW")} type="button">
              Low Stock
            </button>
            <button className={tab === "EXPIRY" ? "rep-tab active" : "rep-tab"} onClick={() => setTab("EXPIRY")} type="button">
              Near Expiry (FEFO)
            </button>
            <button className={tab === "FAST" ? "rep-tab active" : "rep-tab"} onClick={() => setTab("FAST")} type="button">
              Fast Moving
            </button>
          </div>

          <button className="rep-btn" onClick={loadAll} type="button">
            Refresh
          </button>
        </div>

        {/* ✅ Responsive filter row */}
        <div className="rep-filters">
          <input className="rep-input" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Search item..." />
          <select className="rep-select" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="ALL">All Units</option>
            <option value="CSR">CSR</option>
            <option value="OR">OR</option>
            <option value="Supply Office">Supply Office</option>
          </select>
          <select className="rep-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>

        <div className="rep-table-title">{tableTitle}</div>

        <div className="rep-table-wrap">
          {loading ? (
            <div className="rep-loading">Loading...</div>
          ) : tab === "LOW" ? (
            <table className="rep-table">
              <thead>
                <tr><th>Item</th><th>Unit</th><th>On Hand</th><th>Par</th><th>Status</th><th>Category</th></tr>
              </thead>
              <tbody>
                {lowStock.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{it.unit}</td>
                    <td>{it.onHand}</td>
                    <td>{it.parLevel}</td>
                    <td>
                      <span className={it.status === "Critical" ? "pill pill-red" : "pill pill-yellow"}>
                        {it.status}
                      </span>
                    </td>
                    <td>{it.category}</td>
                  </tr>
                ))}
                {lowStock.length === 0 && (
                  <tr><td colSpan={6} className="rep-empty">No low stock items found.</td></tr>
                )}
              </tbody>
            </table>
          ) : tab === "EXPIRY" ? (
            <table className="rep-table">
              <thead>
                <tr><th>Item</th><th>Unit</th><th>Expiry</th><th>Days Left</th><th>Bucket</th><th>Category</th></tr>
              </thead>
              <tbody>
                {nearExpiry.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{it.unit}</td>
                    <td>{it.expirationDate || "—"}</td>
                    <td>{it.daysLeft}</td>
                    <td>
                      <span className={it.bucket === "Expired" ? "pill pill-red" : "pill pill-fefo"}>
                        {it.bucket}
                      </span>
                    </td>
                    <td>{it.category}</td>
                  </tr>
                ))}
                {nearExpiry.length === 0 && (
                  <tr><td colSpan={6} className="rep-empty">No near-expiry items found.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="rep-table">
              <thead>
                <tr><th>Item</th><th>Unit</th><th>OUT Qty (30d)</th></tr>
              </thead>
              <tbody>
                {fastMoving.map((x) => (
                  <tr key={x.itemId}>
                    <td>{x.name}</td>
                    <td>{x.unit}</td>
                    <td>{x.outQty}</td>
                  </tr>
                ))}
                {fastMoving.length === 0 && (
                  <tr><td colSpan={3} className="rep-empty">No movements found (try stock OUT first).</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="rep-tip">
          Tip: Prioritize <b>Category A</b> supplies in Low Stock + Near Expiry to reduce risk and wastage.
        </div>
      </div>
    </div>
  );
}
