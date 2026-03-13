// src/routes/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authContext";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, profile, loading } = useAuth();

  // Wait for Firebase auth to initialize
  if (loading) {
    return <div style={{ padding: "20px" }}>Loading authentication...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check (if roles are required)
  const role = profile?.role;

  if (allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}