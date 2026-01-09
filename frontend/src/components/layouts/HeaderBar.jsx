// src/components/layout/HeaderBar.jsx

import React from "react";
import { LogOut, User, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

function HeaderBar({ user, onLogout }) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 flex-wrap">
          {/* Logo y título */}
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">
              Sistema de Solicitudes
            </h1>
          </div>

          {/* Usuario + Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700 truncate max-w-xs">
              <User className="h-4 w-4 text-gray-500" />
              <span className="truncate">{user?.full_name}</span>
              <Badge
                variant="secondary"
                className="text-xs capitalize max-sm:hidden"
              >
                {user?.role === "admin"
                  ? "Administrador"
                  : user?.role === "support"
                    ? "Soporte"
                    : "Empleado"}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
