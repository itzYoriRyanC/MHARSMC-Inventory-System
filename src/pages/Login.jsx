import "./login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import logo from "../assets/LogoMhars.png";

export default function Login() {
const nav = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [showPw, setShowPw] = useState(false);
const [loading, setLoading] = useState(false);
const [err, setErr] = useState("");

const onSubmit = async (e) => {
e.preventDefault();
setErr("");


const em = email.trim();
if (!em || !password) {
  setErr("Please enter your email and password.");
  return;
}

setLoading(true);

try {

  const cred = await signInWithEmailAndPassword(auth, em, password);

  // 🔐 Load user profile
  const userRef = doc(db, "users", cred.user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await signOut(auth);
    throw new Error("User profile not found.");
  }

  const profile = snap.data();

  // 🚨 Block disabled users
  if (profile.disabled) {
    await signOut(auth);
    throw new Error("This account has been disabled by the administrator.");
  }

  // success
  nav("/dashboard");

} catch (e2) {

  console.error("Firebase login error:", e2);

  const code = String(e2?.code || "");

  if (
    code.includes("auth/invalid-credential") ||
    code.includes("auth/wrong-password")
  ) {
    setErr("Invalid email or password.");
  } else if (code.includes("auth/user-not-found")) {
    setErr("No account found with that email.");
  } else if (code.includes("auth/too-many-requests")) {
    setErr("Too many attempts. Try again later.");
  } else {
    setErr(e2.message || "Login failed. Please try again.");
  }

} finally {
  setLoading(false);
}


};

return ( <div className="login-bg"> <div className="login-shell"> <div className="login-card"> <div className="login-brand"> <div className="login-logo"> <img src={logo} alt="MHARSMC Logo" className="login-logo-img" /> </div>


        <div>
          <div className="login-title">MHARSMC</div>
          <div className="login-sub">Inventory System</div>
        </div>
      </div>

      <h1 className="login-h">Sign in</h1>
      <p className="login-p">Use your admin credentials to continue.</p>

      {err && <div className="login-error">{err}</div>}

      <form onSubmit={onSubmit} className="login-form">
        <label className="login-label">
          Email
          <input
            className="login-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@mharmsmc.com"
          />
        </label>

        <label className="login-label">
          Password
          <div className="login-pwrow">
            <input
              className="login-input"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="login-foot">
          <span className="login-foot-muted">
            Optimizing Par-Level Inventory Management
          </span>
        </div>
      </form>
    </div>

    <div className="login-side">
      <div className="login-side-box">
        <div className="login-side-h">What you’ll see after login</div>
        <ul className="login-side-ul">
          <li>Low Stock alerts (below par)</li>
          <li>Near Expiry (FEFO) overview</li>
          <li>Fast moving usage insights</li>
          <li>Export-ready reports</li>
        </ul>
      </div>
    </div>
  </div>
</div>

);
}
