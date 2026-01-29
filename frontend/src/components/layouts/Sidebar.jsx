import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings2,
} from "lucide-react";

const Sidebar = ({
  items,
  activeTab,
  onChange,
  collapsed,
  onToggleCollapse,
  onNavigate,
  isMobile = false,
}) => {
  return (
    <aside
      className={`flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 h-screen overflow-y-auto ${
        isMobile
          ? "w-full"
          : collapsed
            ? "w-20"
            : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Plataforma
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Solicitudes
              </p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-lg border border-slate-200/70 dark:border-slate-800 p-1.5 text-slate-500 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-100 transition"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange(item.value);
                  if (onNavigate) onNavigate();
                }}
                className={`group flex items-center ${collapsed ? "justify-center" : ""} gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
      </nav>

      <div className={`px-3 pb-4 ${collapsed ? "hidden" : "block"}`}>
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 text-xs text-slate-500 dark:text-slate-300 flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Personaliza filtros y vistas desde cada módulo.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
