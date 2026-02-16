// Settings.jsx
// ✅ Clean version
// ✅ No more Back to Dashboard button
// ✅ Proper grid layout

import "./settings.css";
import { useAuth } from "../services/authContext";
import { useState } from "react";

export default function Settings() {
  const { user, profile } = useAuth();

  const [t1, setT1] = useState(30);
  const [t2, setT2] = useState(60);
  const [t3, setT3] = useState(90);

  const save = () => {
    alert("Saved (demo). Next step: save to Firestore.");
  };

  return (
    <div className="settings-wrap">
      {/* Page Title */}
      <div className="settings-top">
        <h1>Settings</h1>
      </div>

      {/* ================= USER PROFILE ================= */}
      <div className="settings-card">
        <h3>User Profile</h3>

        <div className="settings-profile-grid">
          <div className="settings-field">
            <label>Email</label>
            <input value={user?.email || ""} disabled />
          </div>

          <div className="settings-field">
            <label>Full Name</label>
            <input value={profile?.fullName || ""} disabled />
          </div>

          <div className="settings-field">
            <label>Role</label>
            <input value={profile?.role || ""} disabled />
          </div>

          <div className="settings-field">
            <label>Unit</label>
            <input value={profile?.unit || ""} disabled />
          </div>
        </div>
      </div>

      {/* ================= EXPIRY SETTINGS ================= */}
      <div className="settings-card">
        <h3>Expiry Alert Thresholds (Days)</h3>

        <div className="settings-threshold-grid">
          <div className="settings-field">
            <label>Near Expiry 1</label>
            <input
              type="number"
              value={t1}
              onChange={(e) => setT1(Number(e.target.value))}
              min={1}
            />
          </div>

          <div className="settings-field">
            <label>Near Expiry 2</label>
            <input
              type="number"
              value={t2}
              onChange={(e) => setT2(Number(e.target.value))}
              min={1}
            />
          </div>

          <div className="settings-field">
            <label>Near Expiry 3</label>
            <input
              type="number"
              value={t3}
              onChange={(e) => setT3(Number(e.target.value))}
              min={1}
            />
          </div>
        </div>

        <button className="settings-save" onClick={save}>
          Save Settings
        </button>
      </div>
    </div>
  );
}
