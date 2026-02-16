// src/routes/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authContext";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  // IMPORTANT: use lowercase /login
  if (!user) return <Navigate to="/login" replace />;

  const role = profile?.role;

  if (allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Access Denied</h2>
        <p>Your account does not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
