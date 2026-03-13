// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

export default function App() {
  return (
    <Routes>

      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Login */}
      <Route path="/login" element={<Login />} />

      {/* Protected App Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["admin", "staff", "csr", "or", "supply"]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
      </Route>

      {/* Catch invalid URLs */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}