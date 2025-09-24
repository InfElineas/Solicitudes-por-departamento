// src/SecureApp.jsx
import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import HeaderBar from "./components/layouts/HeaderBar";
import AnalyticsView from "./components/analytics/AnalyticsView";
import DepartmentsView from "./components/departaments/DepartmentsView"; // respeta el nombre del folder actual
import UsersView from "./components/users/UsersView";
import TrashView from "./components/requests/TrashView";
import RequestsView from "./RequestsView";
 // si te pasé RequestsView embebido, muévelo a /src/RequestsView.jsx

import { useAuth } from "./App";

function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      {HeaderBar ? (
        <HeaderBar user={user} onLogout={logout} />
      ) : (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="text-lg font-semibold">Sistema de Solicitudes</div>
            <button className="text-sm text-gray-600" onClick={logout}>Salir</button>
          </div>
        </header>
      )}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function SecureApp() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<RequestsView />} />
        <Route element={<RequireRole roles={["support","admin"]} />}>
          <Route path="analytics" element={<AnalyticsView />} />
        </Route>
        <Route element={<RequireRole roles={["admin"]} />}>
          <Route path="papelera" element={<TrashView />} />
          <Route path="users" element={<UsersView />} />
          <Route path="departments" element={<DepartmentsView />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
