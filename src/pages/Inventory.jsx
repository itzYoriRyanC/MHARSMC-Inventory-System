// Inventory Page (UPDATED)
// ✅ On Hand + Par Level default is BLANK (not 0) to avoid confusion
// ✅ Items card has class "inv-card-items" so CSS can force fixed layout
// ✅ Everything else unchanged

import "./inventory.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

export default function Inventory() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // form
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("CSR");

  // ✅ CHANGED: blank default instead of 0
  const [onHand, setOnHand] = useState("");
  const [parLevel, setParLevel] = useState("");

  const [expirationDate, setExpirationDate] = useState("");
  const [category, setCategory] = useState("A");

  // UI filters
  const [q, setQ] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [moveQty, setMoveQty] = useState(1);

  const loadItems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "items"));
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Load items error:", e);
      alert("Failed to load items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // ✅ Add item
  const addItem = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Item name is required.");

    try {
      await addDoc(collection(db, "items"), {
        name: name.trim(),
        unit,

        // ✅ CHANGED: if blank, store null (not 0)
        onHand: onHand === "" ? null : Number(onHand),
        parLevel: parLevel === "" ? null : Number(parLevel),

        expirationDate: expirationDate || "",
        category: category || "A",
      });

      setName("");

      // ✅ CHANGED: reset to blank (not 0)
      setOnHand("");
      setParLevel("");

      setExpirationDate("");
      setCategory("A");

      await loadItems();
    } catch (e2) {
      console.error("Add item error:", e2);
    }
  };

  // ✅ Stock IN/OUT
  const moveStock = async (item, type) => {
    const qty = Number(moveQty || 0);
    if (!qty || qty <= 0) return alert("Enter valid quantity.");

    const currentOnHand = Number(item.onHand || 0);

    if (type === "OUT" && currentOnHand - qty < 0) {
      return alert("Cannot OUT more than available stock.");
    }

    try {
      await updateDoc(doc(db, "items", item.id), {
        onHand: increment(type === "IN" ? qty : -qty),
      });

      await addDoc(collection(db, "stockMovements"), {
        itemId: item.id,
        itemName: item.name || "Unnamed",
        unit: item.unit || "Unknown",
        quantity: qty,
        type,
        date: serverTimestamp(),
      });

      await loadItems();
    } catch (e) {
      console.error("Move stock error:", e);
    }
  };

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter((it) => {
      const matchText =
        !text ||
        (it.name || "").toLowerCase().includes(text) ||
        (it.category || "").toLowerCase().includes(text);

      const matchUnit = unitFilter === "ALL" || it.unit === unitFilter;

      return matchText && matchUnit;
    });
  }, [items, q, unitFilter]);

  return (
    <div className="inv-wrap">
      {/* =============================
          HEADER
      ============================== */}
      <div className="inv-top">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            Add items, update stock (IN/OUT), and track expiry
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="inv-btn" onClick={loadItems}>
            Refresh
          </button>
        </div>
      </div>

      {/* =============================
          MAIN GRID
      ============================== */}
      <div className="inv-grid">
        {/* Add Item Card */}
        <div className="inv-card">
          <h3>Add Item</h3>

          <form className="inv-form" onSubmit={addItem}>
            <input
              className="inv-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name (e.g., Syringe 10ml)"
            />

            <div className="inv-row-3">
              <select
                className="inv-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="CSR">CSR</option>
                <option value="OR">OR</option>
                <option value="Supply Office">Supply Office</option>
              </select>

              <select
                className="inv-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="A">A (High value / High usage)</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>

              <input
                className="inv-input"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>

            <div className="inv-row-2">
              {/* ✅ CHANGED: blank default */}
              <input
                className="inv-input"
                type="number"
                value={onHand}
                onChange={(e) => setOnHand(e.target.value)}
                placeholder="On Hand"
              />

              {/* ✅ CHANGED: blank default */}
              <input
                className="inv-input"
                type="number"
                value={parLevel}
                onChange={(e) => setParLevel(e.target.value)}
                placeholder="Par Level"
              />
            </div>

            <button className="inv-btn-primary" type="submit">
              Save Item
            </button>
          </form>
        </div>

        {/* Items Table */}
        {/* ✅ IMPORTANT: this class is required */}
        <div className="inv-card inv-card-items">
          <h3>Items</h3>

          <div className="inv-row-3" style={{ marginBottom: 10 }}>
            <input
              className="inv-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search item..."
            />

            <select
              className="inv-select"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="ALL">All Units</option>
              <option value="CSR">CSR</option>
              <option value="OR">OR</option>
              <option value="Supply Office">Supply Office</option>
            </select>

            <input
              className="inv-input"
              type="number"
              value={moveQty}
              onChange={(e) => setMoveQty(e.target.value)}
              placeholder="Move Qty"
              min={1}
            />
          </div>

          <div className="inv-table-wrap">
            {loading ? (
              <div style={{ padding: 12 }}>Loading...</div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unit</th>
                    <th>On Hand</th>
                    <th>Par</th>
                    <th>Expiry</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.unit}</td>
                      <td>{it.onHand ?? 0}</td>
                      <td>{it.parLevel ?? 0}</td>
                      <td>{it.expirationDate || "—"}</td>
                      <td>{it.category}</td>
                      <td>
                        <button
                          className="inv-btn inv-btn-in"
                          type="button"
                          onClick={() => moveStock(it, "IN")}
                        >
                          IN
                        </button>

                        <button
                          className="inv-btn inv-btn-out"
                          type="button"
                          onClick={() => moveStock(it, "OUT")}
                        >
                          OUT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
