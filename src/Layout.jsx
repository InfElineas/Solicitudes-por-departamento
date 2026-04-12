import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  FileText, BarChart2, Trash2, Users, Building2,
  ChevronLeft, LogOut, Zap, AlertTriangle, Shield, Package, BookOpen, ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationBell from '@/components/notifications/NotificationBell';
import UserProfileModal from '@/components/profile/UserProfileModal';

const NAV = [
  { name: 'Solicitudes', path: '/Requests', icon: FileText, roles: ['admin', 'superadmin', 'support', 'employee', 'jefe'] },
  { name: 'Mi historial', path: '/UserHistory', icon: FileText, roles: ['employee'] },
  { name: 'Incidencias', path: '/Incidents', icon: AlertTriangle, roles: ['admin', 'superadmin', 'support', 'employee'] },
  { name: 'Dashboard & Análisis', path: '/Analysis', icon: BarChart2, roles: ['admin', 'superadmin', 'support'] },
  { name: 'Guardias', path: '/Guards', icon: Shield, roles: ['admin', 'superadmin', 'support'] },
  { name: 'Activos', path: '/Assets', icon: Package, roles: ['admin', 'superadmin', 'support'] },
  { name: 'Base de Conocimientos', path: '/KnowledgeBase', icon: BookOpen, roles: ['admin', 'superadmin', 'support', 'employee', 'jefe'] },
  { name: 'Auditoría', path: '/AuditLog', icon: ShieldCheck, roles: ['admin', 'superadmin'] },
  { name: 'Papelera', path: '/Trash', icon: Trash2, roles: ['admin', 'superadmin'] },
  { name: 'Usuarios', path: '/ManageUsers', icon: Users, roles: ['admin', 'superadmin'] },
  { name: 'Departamentos', path: '/Departments', icon: Building2, roles: ['admin', 'superadmin'] },
  { name: 'Automatización', path: '/AutomationRules', icon: Zap, roles: ['admin', 'superadmin'] },
];

const AVATAR_COLORS = ['bg-pink-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-cyan-500'];

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [departments, setDepartments] = useState([]);
  const location = useLocation();

  useEffect(() => {
    base44.entities.Department.filter({ is_active: true }).then(setDepartments).catch(() => {});
  }, []);

  const role = user?.role || 'employee';
  const navItems = NAV.filter(n => n.roles.includes(role));

  const currentNav = NAV.find(n =>
    n.path === location.pathname ||
    n.path === `/${currentPageName}`
  );

  const displayName = user?.display_name || user?.full_name || '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  const avatarColor = AVATAR_COLORS[(user?.email?.charCodeAt(0) || 0) % AVATAR_COLORS.length];



  return (
    // h-screen + overflow-hidden on root = sidebar never scrolls with content
    <div className="h-screen flex overflow-hidden" style={{ background: 'hsl(222,47%,8%)', color: 'hsl(210,40%,98%)' }}>

      {/* ── Sidebar (fixed height, never scrolls) ── */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-200 border-r"
        style={{
          width: collapsed ? 56 : 210,
          background: 'hsl(222,47%,9%)',
          borderColor: 'hsl(217,33%,16%)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-3 shrink-0 border-b"
          style={{ height: 52, borderColor: 'hsl(217,33%,16%)' }}
        >
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-[10px] font-semibold tracking-widest uppercase truncate" style={{ color: 'hsl(215,20%,45%)' }}>PLATAFORMA</span>
              <span className="text-sm font-bold text-white truncate">Solicitudes</span>
            </div>
          )}
          <button
            className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
              style={{ color: 'hsl(215,20%,55%)' }}
            />
          </button>
        </div>

        {/* Nav items — scrollable if many items */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || `/${currentPageName}` === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive ? 'text-white' : 'hover:text-white hover:bg-white/5'
                }`}
                style={
                  isActive
                    ? { background: 'hsl(217,91%,22%)', color: 'white', boxShadow: 'inset 3px 0 0 hsl(217,91%,60%)' }
                    : { color: 'hsl(215,20%,58%)' }
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div
          className="shrink-0 border-t px-2 py-2"
          style={{ borderColor: 'hsl(217,33%,16%)' }}
        >
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-2 w-full px-1.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="h-7 w-7 rounded-full object-cover shrink-0" />
            ) : (
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={`${avatarColor} text-white text-xs font-bold`}>{initials}</AvatarFallback>
              </Avatar>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.display_name || user?.full_name || 'Mi perfil'}</p>
                <p className="text-[10px] truncate" style={{ color: 'hsl(215,20%,50%)' }}>
                  {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Administrador' : role === 'support' ? 'Soporte' : role === 'jefe' ? 'Jefe de Depto.' : 'Empleado'}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Right side: header + scrollable content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header (fixed height, never scrolls) */}
        <header
          className="flex items-center justify-between px-6 shrink-0 border-b"
          style={{ height: 52, borderColor: 'hsl(217,33%,16%)', background: 'hsl(222,47%,9%)' }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: 'hsl(215,20%,45%)' }}>PANEL</span>
            <span className="text-xs" style={{ color: 'hsl(217,33%,35%)' }}>/</span>
            <span className="text-sm font-semibold text-white">{currentNav?.name || currentPageName}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <NotificationBell user={user} />
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors"
              style={{ color: 'hsl(215,20%,55%)' }}
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              {<span className="hidden sm:inline">Salir</span>}
            </button>
          </div>
        </header>

        {/* Main content — ONLY this scrolls */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* ── Profile Modal ── */}
      {showProfile && (
        <UserProfileModal
          user={user}
          departments={departments}
          onClose={() => setShowProfile(false)}
          onSaved={(updated) => {
            setUser(u => ({ ...u, ...updated }));
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
}