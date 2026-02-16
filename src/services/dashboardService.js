// src/services/dashboardService.js
// ✅ Safe Firestore queries (NO composite index needed)
// ✅ OUT movements filtered in JS (prevents FAILED_PRECONDITION)
// ✅ Works with Timestamp dates

import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ---------- helpers ----------
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalizeItem = (raw) => {
  // supports both onhand/onHand + parlevel/parLevel
  const onHand = raw.onHand ?? raw.onhand ?? 0;
  const parLevel = raw.parLevel ?? raw.parlevel ?? 0;

  return {
    id: raw.id,
    name: raw.name ?? "Unnamed",
    unit: raw.unit ?? "—",
    category: raw.category ?? "—",
    expirationDate: raw.expirationDate ?? raw.expirationdate ?? "",
    onHand: toNum(onHand),
    parLevel: toNum(parLevel),
  };
};

const tsToDate = (val) => {
  // Firestore Timestamp -> JS Date
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate(); // Timestamp
  return null;
};

// ---------- service ----------
export const dashboardService = {
  // ✅ Items (simple query)
  async getItems() {
    const snap = await getDocs(collection(db, "items"));
    return snap.docs.map((d) => normalizeItem({ id: d.id, ...d.data() }));
  },

  // ✅ OUT movements in last X days (safe fallback = no composite index)
  async getOutMovementsSinceDays(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    // ✅ SAFE query: ONLY type == OUT (no date condition = no composite index)
    const qMov = query(collection(db, "stockMovements"), where("type", "==", "OUT"));
    const snap = await getDocs(qMov);

    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // ✅ Filter by date in JS (works even if date is Timestamp)
    return all.filter((m) => {
      const dt = tsToDate(m.date);
      if (!dt) return false;
      return dt >= from;
    });
  },
};
