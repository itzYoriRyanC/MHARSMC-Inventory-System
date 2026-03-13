import "./Inventory.css";
import { useEffect, useMemo, useState } from "react";

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

import { db } from "../services/firebase";

const PAGE_SIZE = 50;

export default function Inventory() {

  const [items,setItems] = useState([]);
  const [loading,setLoading] = useState(true);

  const [lastDoc,setLastDoc] = useState(null);
  const [hasMore,setHasMore] = useState(true);

  // form
  const [name,setName] = useState("");
  const [unit,setUnit] = useState("CSR");
  const [onHand,setOnHand] = useState("");
  const [parLevel,setParLevel] = useState("");
  const [expirationDate,setExpirationDate] = useState("");
  const [category,setCategory] = useState("A");

  // filters
  const [q,setQ] = useState("");
  const [unitFilter,setUnitFilter] = useState("ALL");
  const [moveQty,setMoveQty] = useState(1);


  // LOAD FIRST PAGE
  const loadItems = async () => {

    setLoading(true);

    const qRef = query(
      collection(db,"items"),
      orderBy("name"),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(qRef);

    const docs = snap.docs.map(d=>({
      id:d.id,
      ...d.data()
    }));

    setItems(docs);
    setLastDoc(snap.docs[snap.docs.length-1]);
    setHasMore(snap.docs.length === PAGE_SIZE);

    setLoading(false);
  };


  // LOAD MORE (pagination)
  const loadMore = async () => {

    if(!lastDoc || !hasMore) return;

    const qRef = query(
      collection(db,"items"),
      orderBy("name"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(qRef);

    const docs = snap.docs.map(d=>({
      id:d.id,
      ...d.data()
    }));

    setItems(prev=>[...prev,...docs]);
    setLastDoc(snap.docs[snap.docs.length-1]);
    setHasMore(snap.docs.length === PAGE_SIZE);
  };


  useEffect(()=>{
    loadItems();
  },[]);


  // ADD ITEM
  const addItem = async(e)=>{

    e.preventDefault();

    if(!name.trim()) {
      alert("Item name required");
      return;
    }

    await addDoc(collection(db,"items"),{
      name:name.trim(),
      unit,
      onHand:onHand==="" ? null : Number(onHand),
      parLevel:parLevel==="" ? null : Number(parLevel),
      expirationDate:expirationDate || "",
      category,
      createdAt:serverTimestamp()
    });

    setName("");
    setOnHand("");
    setParLevel("");
    setExpirationDate("");

    loadItems();
  };


  // STOCK MOVEMENT
  const moveStock = async(item,type)=>{

    const qty = Number(moveQty);

    if(!qty || qty <= 0){
      alert("Enter valid quantity");
      return;
    }

    const current = Number(item.onHand || 0);

    if(type==="OUT" && current - qty < 0){
      alert("Cannot OUT more than available stock");
      return;
    }

    await updateDoc(doc(db,"items",item.id),{
      onHand: increment(type==="IN" ? qty : -qty)
    });

    await addDoc(collection(db,"stockMovements"),{
      itemId:item.id,
      itemName:item.name,
      unit:item.unit,
      quantity:qty,
      type,
      date:serverTimestamp()
    });

    loadItems();
  };


  // FILTER
  const filtered = useMemo(()=>{

    const text = q.trim().toLowerCase();

    return items.filter(it=>{

      const matchText =
        !text ||
        (it.name||"").toLowerCase().includes(text) ||
        (it.category||"").toLowerCase().includes(text);

      const matchUnit =
        unitFilter==="ALL" ||
        it.unit===unitFilter;

      return matchText && matchUnit;

    });

  },[items,q,unitFilter]);


  return (

<div className="inv-wrap">

<div className="inv-top">
<div>
<h1 className="page-title">Inventory</h1>
<p className="page-subtitle">
Add items, update stock (IN/OUT), and track expiry
</p>
</div>

<button className="inv-btn" onClick={loadItems}>
Refresh
</button>

</div>


<div className="inv-grid">


{/* ADD ITEM */}

<div className="inv-card">

<h3>Add Item</h3>

<form className="inv-form" onSubmit={addItem}>

<input
className="inv-input"
value={name}
onChange={e=>setName(e.target.value)}
placeholder="Item name"
/>

<div className="inv-row-3">

<select
className="inv-select"
value={unit}
onChange={e=>setUnit(e.target.value)}
>
<option value="CSR">CSR</option>
<option value="OR">OR</option>
<option value="Supply Office">Supply Office</option>
</select>

<select
className="inv-select"
value={category}
onChange={e=>setCategory(e.target.value)}
>
<option value="A">A</option>
<option value="B">B</option>
<option value="C">C</option>
</select>

<input
className="inv-input"
type="date"
value={expirationDate}
onChange={e=>setExpirationDate(e.target.value)}
/>

</div>

<div className="inv-row-2">

<input
className="inv-input"
type="number"
value={onHand}
onChange={e=>setOnHand(e.target.value)}
placeholder="On Hand"
/>

<input
className="inv-input"
type="number"
value={parLevel}
onChange={e=>setParLevel(e.target.value)}
placeholder="Par Level"
/>

</div>

<button className="inv-btn-primary">
Save Item
</button>

</form>

</div>


{/* ITEMS TABLE */}

<div className="inv-card inv-card-items">

<h3>Items</h3>

<div className="inv-row-3">

<input
className="inv-input"
value={q}
onChange={e=>setQ(e.target.value)}
placeholder="Search item..."
/>

<select
className="inv-select"
value={unitFilter}
onChange={e=>setUnitFilter(e.target.value)}
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
onChange={e=>setMoveQty(e.target.value)}
min={1}
/>

</div>


<div className="inv-table-wrap">

{loading ? (

<div style={{padding:12}}>Loading...</div>

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

{filtered.map(it=>(

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
onClick={()=>moveStock(it,"IN")}
>
IN
</button>

<button
className="inv-btn inv-btn-out"
onClick={()=>moveStock(it,"OUT")}
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


{hasMore && (

<button
className="inv-btn"
style={{marginTop:10}}
onClick={loadMore}
>
Load More
</button>

)}

</div>

</div>

</div>

  );
}