import "./Users.css";
import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  getAuth
} from "firebase/auth";

import {
  initializeApp,
  deleteApp
} from "firebase/app";

import { db } from "../services/firebase";
import { firebaseConfig } from "../services/firebase";

export default function Users() {

  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [fullName,setFullName] = useState("");
  const [role,setRole] = useState("staff");
  const [unit,setUnit] = useState("CSR");

  const loadUsers = async () => {

    try {

      setLoading(true);

      const snap = await getDocs(collection(db,"users"));

      const list = snap.docs.map(d => ({
        id:d.id,
        ...d.data()
      }));

      setUsers(list);

    } catch(err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  useEffect(()=>{
    loadUsers();
  },[]);


  const createUser = async (e) => {

    e.preventDefault();

    try {

      const tempApp = initializeApp(firebaseConfig,"Secondary");

      const tempAuth = getAuth(tempApp);

      const cred = await createUserWithEmailAndPassword(
        tempAuth,
        email,
        password
      );

      await setDoc(
        doc(db,"users",cred.user.uid),
        {
          email,
          fullName,
          role,
          unit,
          disabled:false,
          createdAt:new Date()
        }
      );

      await tempAuth.signOut();

      await deleteApp(tempApp);

      alert("User created successfully");

      setEmail("");
      setPassword("");
      setFullName("");

      loadUsers();

    } catch(err) {

      alert(err.message);

    }

  };


  const toggleDisable = async(user) => {

    try {

      await updateDoc(
        doc(db,"users",user.id),
        {
          disabled: !user.disabled
        }
      );

      loadUsers();

    } catch(err) {

      alert(err.message);

    }

  };


  return(

  <div className="users-wrap">

  <h1 className="page-title">User Management</h1>

  <div className="users-grid">

  <div className="users-card">

  <h3>Create User</h3>

  <form onSubmit={createUser} className="users-form">

  <input
  placeholder="Full name"
  value={fullName}
  onChange={(e)=>setFullName(e.target.value)}
  required
  />

  <input
  placeholder="Email"
  value={email}
  onChange={(e)=>setEmail(e.target.value)}
  required
  />

  <input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(e)=>setPassword(e.target.value)}
  required
  />

  <select
  value={role}
  onChange={(e)=>setRole(e.target.value)}
  >

  <option value="admin">Admin</option>
  <option value="staff">Staff</option>

  </select>

  <select
  value={unit}
  onChange={(e)=>setUnit(e.target.value)}
  >

  <option value="CSR">CSR</option>
  <option value="OR">OR</option>
  <option value="Supply Office">Supply Office</option>

  </select>

  <button type="submit" className="users-btn">
  Create User
  </button>

  </form>

  </div>

  <div className="users-card">

  <h3>Users</h3>

  {loading ? "Loading..." : (

  <table className="users-table">

  <thead>

  <tr>
  <th>Name</th>
  <th>Email</th>
  <th>Role</th>
  <th>Unit</th>
  <th>Status</th>
  <th>Action</th>
  </tr>

  </thead>

  <tbody>

  {users.map(u => (

  <tr key={u.id}>

  <td>{u.fullName}</td>
  <td>{u.email}</td>
  <td>{u.role}</td>
  <td>{u.unit}</td>
  <td>{u.disabled ? "Disabled":"Active"}</td>

  <td>

  <button
  className="users-btn-small"
  onClick={()=>toggleDisable(u)}
  >

  {u.disabled ? "Enable":"Disable"}

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

  );

}