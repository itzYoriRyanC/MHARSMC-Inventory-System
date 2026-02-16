// src/layout/AppLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../services/authContext";
import logo from "../assets/LogoMhars.png";
import "./appLayout.css";

export default function AppLayout() {
  const { user, profile, logout } = useAuth();

  const linkClass = ({ isActive }) =>
    isActive ? "side-link active" : "side-link";

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="side-brand">
          <img className="side-logo" src={logo} alt="Logo" />
          <div>
            <div className="side-title">MHARSMC</div>
            <div className="side-sub">Inventory System</div>
          </div>
        </div>

        <nav className="side-nav">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/inventory" className={linkClass}>
            Inventory
          </NavLink>

          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>

          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
        </nav>

        <div className="side-footer">
          <div className="side-user">
            <div className="side-email">{user?.email}</div>
            <div>
              Role: <span className="pill">{profile?.role || "—"}</span>
            </div>
            <div>
              Unit: <span className="pill">{profile?.unit || "—"}</span>
            </div>
          </div>

          <button className="btn-yellowgreen" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
