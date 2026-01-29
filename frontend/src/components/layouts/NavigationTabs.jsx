import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, Users, Building, Trash2 } from "lucide-react";

const NavigationTabs = ({ user }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <TabsList className="flex min-w-full flex-nowrap gap-2 px-2 py-2 sm:px-4 sm:py-3 justify-start">
          <TabsTrigger
            value="requests"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <FileText className="h-4 w-4" />
            <span>Solicitudes</span>
          </TabsTrigger>

          {(user?.role === "support" || user?.role === "admin") && (
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Análisis</span>
            </TabsTrigger>
          )}

          {(user?.role === "support" || user?.role === "admin") && (
            <TabsTrigger
              value="trash"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              <span>Papelera</span>
            </TabsTrigger>
          )}

          {(user?.role === "support" || user?.role === "admin") && (
            <TabsTrigger
              value="users"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              <span>Usuarios</span>
            </TabsTrigger>
          )}

          {(user?.role === "support" || user?.role === "admin") && (
            <TabsTrigger
              value="departments"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Building className="h-4 w-4" />
              <span>Departamentos</span>
            </TabsTrigger>
          )}
        </TabsList>
      </div>
    </div>
  );
};

export default NavigationTabs;
