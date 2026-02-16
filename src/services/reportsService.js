// src/services/reportsService.js
// ✅ OOP service: keeps Firestore logic out of Reports.jsx
// ✅ Includes fallback query so "Failed to load reports data" won't happen

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

export class ReportsService {
  constructor(db) {
    this.db = db;
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  static toNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  static normalizeItem(raw) {
    // ✅ supports BOTH: onHand/onhand + parLevel/parlevel
    const onHand = raw.onHand ?? raw.onhand ?? 0;
    const parLevel = raw.parLevel ?? raw.parlevel ?? 0;

    return {
      id: raw.id,
      name: raw.name ?? "Unnamed",
      unit: raw.unit ?? "—",
      category: raw.category ?? "—",
      expirationDate: raw.expirationDate ?? "",
      onHand: ReportsService.toNum(onHand),
      parLevel: ReportsService.toNum(parLevel),
    };
  }

  // ✅ Settings thresholds optional (settings/thresholds)
  async getThresholds(defaults = { d30: 30, d60: 60, d90: 90 }) {
    try {
      const sref = doc(this.db, "settings", "thresholds");
      const ssnap = await getDoc(sref);
      if (!ssnap.exists()) return defaults;

      const data = ssnap.data() || {};
      return {
        d30: ReportsService.toNum(data.d30, defaults.d30),
        d60: ReportsService.toNum(data.d60, defaults.d60),
        d90: ReportsService.toNum(data.d90, defaults.d90),
      };
    } catch (e) {
      console.warn("Thresholds not found/blocked. Using defaults.", e);
      return defaults;
    }
  }

  // ✅ Items
  async getItems() {
    const snap = await getDocs(collection(this.db, "items"));
    return snap.docs.map((d) => ReportsService.normalizeItem({ id: d.id, ...d.data() }));
  }

  // ✅ Movements OUT last N days
  // First try: (type + date) query. If it fails (index missing), fallback to date-only.
  async getOutMovementsLastDays(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    // 1) Try best query
    try {
      const qMov = query(
        collection(this.db, "stockMovements"),
        where("type", "==", "OUT"),
        where("date", ">=", Timestamp.fromDate(from))
      );
      const snap = await getDocs(qMov);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Composite index missing. Using fallback query.", e);
    }

    // 2) Fallback query (no composite index)
    const qFallback = query(
      collection(this.db, "stockMovements"),
      where("date", ">=", Timestamp.fromDate(from))
    );
    const snap2 = await getDocs(qFallback);
    const all = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter OUT in JS
    return all.filter((m) => String(m.type || "").toUpperCase() === "OUT");
  }

  // ✅ One function to load everything
  async loadBundle() {
    const thresholds = await this.getThresholds();
    const items = await this.getItems();
    const movementsOut30 = await this.getOutMovementsLastDays(30);
    return { thresholds, items, movementsOut30 };
  }
}
