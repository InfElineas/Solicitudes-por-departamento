// src/App.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./App.css";
import axios from "axios";
import { AUTH_EXPIRED_EVENT, notifyAuthExpired } from "./utils/session";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";

import AnalyticsView from "./components/analytics/AnalyticsView";
import { buildPeriodParams } from "./components/analytics/analyticsUtils";
import DepartmentsView from "./components/departaments/DepartmentsView.jsx";
import UsersView from "./components/users/UsersView";
import HeaderBar from "./components/layouts/HeaderBar.jsx";
import NavigationTabs from "./components/layouts/NavigationTabs.jsx";
import AssignDialog from "./components/requests/AssignDialog";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent } from "./components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  FileText,
  BarChart3,
  Plus,
  LogOut,
  User,
  Building,
  Clock,
  CheckCircle,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Settings2,
  UserPlus,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import TrashView from "./components/requests/TrashView";
import RequestsView from "./components/requests/RequestsView";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.css";

/* ===========================
   Axios client + interceptors
   =========================== */

// ¿Estamos en localhost?
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// URL de backend (evitamos import.meta para no requerir <script type="module">)
const RAW_BACKEND = (() => {
  if (typeof process !== "undefined" && process.env?.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }

  if (typeof window !== "undefined") {
    // Opciones para despliegues con variables globales inyectadas
    const globals = window.__API_URL || window.API_URL || window.BACKEND_URL;
    if (globals) return globals;
  }

  return isLocal ? "http://localhost:8000" : "";
})();

// Normalizamos
const API_BASE = RAW_BACKEND
  ? `${RAW_BACKEND.replace(/\/+$/, "")}/api`
  : "/api";

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

// Inyecta Bearer
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Reintentos básicos (2) en errores de red/timeout (útil para cold start)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config || {};
    const retriable =
      !err.response &&
      (err.code === "ECONNABORTED" || err.message?.includes("Network Error"));

    if (retriable) {
      cfg.__retryCount = (cfg.__retryCount || 0) + 1;
      if (cfg.__retryCount <= 2) {
        const backoff = 500 * Math.pow(2, cfg.__retryCount - 1);
        await new Promise((r) => setTimeout(r, backoff));
        return api(cfg);
      }
    }

    if (err?.response?.status === 401 && !cfg?.url?.includes("/auth/login")) {
      notifyAuthExpired();
    }
    return Promise.reject(err);
  },
);

/* ===========================
            App
   =========================== */
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // pestaña activa (persistente)
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("activeTab") || "requests",
  );
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // login
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  // requests (paginado)
  const [requests, setRequests] = useState([]);
  const [requestDialog, setRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: "",
    description: "",
    priority: "Media",
    type: "Soporte",
    channel: "Sistema",
    // campos avanzados (solo aplican si el usuario es admin)
    level: "1",
    assigned_to: "",
    estimated_hours: "",
    estimated_due: "",
  });

  // ==== catálogos válidos para sanitizar filtros ====
  const VALID = {
    status: [
      "all",
      "Pendiente",
      "En progreso",
      "En revisión",
      "Finalizada",
      "Rechazada",
    ],
    department: [
      "all",
      "Administración",
      "Contabilidad y Finanzas",
      "Comercial",
      "Inventario",
      "Informática",
      "Facturación",
      "Expedición",
      "Calidad",
      "Transporte y Distribución",
      "Mantenimiento",
      "Punto de Venta",
      "Almacén",
      "Picker and Packer",
      "Estibadores",
    ],
    type: ["all", "Soporte", "Mejora", "Desarrollo", "Capacitación"],
    level: ["all", "1", "2", "3"],
    channel: [
      "all",
      "Sistema",
      "Google Sheets",
      "Correo Electrónico",
      "WhatsApp",
    ],
    sort: [
      "-created_at",
      "created_at",
      "-requested_at",
      "requested_at",
      "status",
      "-status",
      "department",
      "-department",
      "priority",
      "-priority",
      "level",
      "-level",
    ],
  };

  const sanitizeFilters = (raw) => {
    const def = {
      status: "all",
      department: "all",
      type: "all",
      level: "all",
      channel: "all",
      q: "",
      sort: "-created_at",
      requester_id: "all",
      assigned_to: "all",
    };
    const f = { ...def, ...(raw || {}) };
    const pick = (k) => (VALID[k].includes(f[k]) ? f[k] : def[k]);
    const idOrAll = (val) => {
      if (val === undefined || val === null) return "all";
      const str = String(val).trim();
      return str === "" || str === "all" ? "all" : str;
    };
    return {
      status: pick("status"),
      department: pick("department"),
      type: pick("type"),
      level: VALID.level.includes(String(f.level))
        ? String(f.level)
        : def.level,
      channel: pick("channel"),
      q: typeof f.q === "string" ? f.q : "",
      sort: pick("sort"),
      requester_id: idOrAll(f.requester_id),
      assigned_to: idOrAll(f.assigned_to),
    };
  };

  const [filters, setFilters] = useState(() => {
    try {
      return sanitizeFilters(JSON.parse(localStorage.getItem("filters")));
    } catch {
      return sanitizeFilters(null);
    }
  });
  useEffect(() => {
    localStorage.setItem("filters", JSON.stringify(filters));
  }, [filters]);

  const [page, setPage] = useState(
    () => Number(localStorage.getItem("page")) || 1,
  );
  useEffect(() => {
    localStorage.setItem("page", String(page));
  }, [page]);

  const [pageSize, setPageSize] = useState(
    () => Number(localStorage.getItem("pageSize")) || 10,
  );
  useEffect(() => {
    localStorage.setItem("pageSize", String(pageSize));
  }, [pageSize]);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // users (admin)
  const [users, setUsers] = useState([]);
  const [userDialog, setUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    department: "",
    position: "Especialista",
    role: "employee",
  });

  // departments
  const [departments, setDepartments] = useState(null);

  // ---- NUEVOS estados para editar usuario ----
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(
    () => localStorage.getItem("analyticsPeriod") || "all",
  );
  const [analyticsFilters, setAnalyticsFilters] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("analyticsFilters"));
      return stored || { technician: "all", department: "all" };
    } catch (e) {
      return { technician: "all", department: "all" };
    }
  });
  useEffect(() => {
    localStorage.setItem("analyticsPeriod", analyticsPeriod);
  }, [analyticsPeriod]);
  useEffect(() => {
    localStorage.setItem("analyticsFilters", JSON.stringify(analyticsFilters));
  }, [analyticsFilters]);

  // diálogos/acciones
  const [classifyDialogFor, setClassifyDialogFor] = useState(null);
  const [assignDialogFor, setAssignDialogFor] = useState(null);
  const [classifyData, setClassifyData] = useState({
    level: "1",
    priority: "Media",
  });
  const [assignData, setAssignData] = useState({
    assigned_to: "",
    estimated_hours: "",
    estimated_due: "",
  });
  const [feedbackDialogFor, setFeedbackDialogFor] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    rating: "up",
    comment: "",
  });
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    id: null,
    reason: "",
  });
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    id: null,
    link: "",
  });

  const logout = useCallback((message) => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");
    setActiveTab("requests");
    setAuthChecked(true);
    if (message) toast.error(message);
    else toast.success("Sesión cerrada");
  }, []);

  /* ===========================
             Effects
     =========================== */
  useEffect(() => {
    const onExpired = (ev) =>
      logout(
        ev?.detail?.message || "Tu sesión expiró. Inicia sesión nuevamente.",
      );
    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      }
    };
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthChecked(true);
      return;
    }
    setAuthChecked(false);
    fetchCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user, page, pageSize, filters]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "support" || user.role === "admin") fetchAnalytics();
  }, [user, analyticsPeriod]);

  useEffect(() => {
    if (!user) return;
    if (user.role === "support" || user.role === "admin") fetchDepartments();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUsers();
  }, [user]);

  /* ===========================
            API calls
     =========================== */
  const isUnauthorized = (error) => error?.response?.status === 401;

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
      if (!isUnauthorized(error)) {
        logout("No se pudo validar tu sesión. Inicia sesión nuevamente.");
      }
    }
    setAuthChecked(true);
  };

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("page_size", pageSize);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.q?.trim()) params.set("q", filters.q.trim());
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.department !== "all")
        params.set("department", filters.department);
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.level !== "all") params.set("level", Number(filters.level));
      if (filters.channel !== "all") params.set("channel", filters.channel);
      if (filters.requester_id !== "all")
        params.set("requester_id", filters.requester_id);
      if (filters.assigned_to !== "all")
        params.set("assigned_to", filters.assigned_to);

      const { data } = await api.get(`/requests?${params.toString()}`);
      setRequests(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error("Error fetching requests:", error?.response || error);
      if (isUnauthorized(error)) return;
      toast.error("Error al cargar solicitudes");
      setRequests([]);
      setTotal(0);
      setTotalPages(1);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (isUnauthorized(error)) return;
      toast.error("Error al cargar usuarios");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params = buildPeriodParams(analyticsPeriod);
      const baseUrl = "/reports/summary";
      const qs = params.toString();
      const requestUrl = qs ? `${baseUrl}?${qs}` : baseUrl;
      const { data } = await api.get(requestUrl);
      setAnalytics({ ...data, _period: analyticsPeriod });
    } catch (error) {
      // En algunos despliegues el backend no acepta range=all. Reintentamos sin parámetros.
      if (analyticsPeriod === "all" && error?.response?.status === 422) {
        try {
          const { data } = await api.get("/reports/summary");
          setAnalytics({ ...data, _period: analyticsPeriod });
          return;
        } catch (fallbackError) {
          console.error("Error fetching analytics fallback:", fallbackError);
          if (!isUnauthorized(fallbackError))
            toast.error("Error al cargar análisis");
          return;
        }
      }
      console.error("Error fetching analytics:", error);
      if (isUnauthorized(error)) return;
      toast.error("Error al cargar análisis");
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data);
    } catch (error) {
      console.error("Error fetching departments:", error);
      if (isUnauthorized(error)) return;
      toast.error("Error al cargar departamentos");
    }
  };

  const login = async (e) => {
    try {
      e.preventDefault();
    } catch (error) {
      console.error(error);
    }
    setLoading(true);
    try {
      const { data } = await api.post(
        "/auth/login",
        { username: loginData.username, password: loginData.password },
        { headers: { "Content-Type": "application/json" } },
      );
      const { access_token } = data;
      localStorage.setItem("token", access_token);
      setAuthChecked(false);
      setToken(access_token);
      toast.success("¡Bienvenido!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error?.response?.data?.detail || "Credenciales incorrectas");
    }
    setLoading(false);
  };

  // Crear solicitud
  const createRequest = async (e) => {
    try {
      e.preventDefault();
    } catch (error) {
      console.error(error);
    }
    try {
      const payload = {
        title: newRequest.title,
        description: newRequest.description,
        priority: newRequest.priority,
        type: newRequest.type,
        channel: newRequest.channel,
      };
      if (user?.role === "admin") {
        if (newRequest.level) payload.level = Number(newRequest.level);
        if (newRequest.assigned_to)
          payload.assigned_to = newRequest.assigned_to;
        if (newRequest.estimated_hours)
          payload.estimated_hours = Number(newRequest.estimated_hours);
        if (newRequest.estimated_due)
          payload.estimated_due = newRequest.estimated_due;
      }
      await api.post("/requests", payload);
      setNewRequest({
        title: "",
        description: "",
        priority: "",
        type: "",
        channel: "Sistema",
        level: "",
        assigned_to: "",
        estimated_hours: "",
        estimated_due: "",
      });
      setRequestDialog(false);
      setPage(1);
      await fetchRequests();
      toast.success("Solicitud creada exitosamente");
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error(error?.response?.data?.detail || "Error al crear solicitud");
    }
  };

  // Eliminar solicitud (ahora con SweetAlert)
  const deleteRequest = async (requestId) => {
    const result = await Swal.fire({
      title: "Mover a papelera",
      text: "¿Mover la solicitud a la papelera por 14 días?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, mover",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/requests/${requestId}`);
      await Swal.fire("En papelera", "Solicitud enviada a papelera", "success");
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "No se pudo eliminar");
    }
  };

  // Crear usuario (admin) -> ahora pide confirmación con SweetAlert
  const createUser = async (e) => {
    try {
      e.preventDefault();
    } catch (error) {
      console.error(error);
    }

    try {
      await api.post("/users", newUser);

      // reset UI
      setNewUser({
        username: "",
        password: "",
        full_name: "",
        department: "",
        position: "Especialista",
        role: "employee",
      });
      setUserDialog(false);
      await fetchUsers();

      // SweetAlert after success
      await Swal.fire({
        title: "Creado",
        html: `Usuario <strong>@${newUser.username}</strong> creado exitosamente.`,
        icon: "success",
        confirmButtonText: "Aceptar",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Error al crear usuario";
      // SweetAlert for failure
      await Swal.fire({
        title: "Error",
        html: `<div>${message}</div>`,
        icon: "error",
        confirmButtonText: "Cerrar",
      });

      // keep toast-based error as secondary feedback (optional)
      toast.error(message);
    }
  };

  //Eliminar usuario(admin) -> SweetAlert confirm
  const deleteUser = async (userId) => {
    const result = await Swal.fire({
      title: "Eliminar usuario",
      text: "¿Eliminar este usuario?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/users/${userId}`);
      await Swal.fire("Eliminado", "Usuario eliminado", "success");
      fetchUsers();
      await fetchCurrentUser();
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.detail || "No se pudo eliminar el usuario",
      );
    }
  };

  // ---- Acciones del flujo ----
  const classifyRequest = async (requestId, level, priority) => {
    try {
      await api.post(`/requests/${requestId}/classify`, {
        level: Number(level),
        priority,
      });
      toast.success("Solicitud clasificada");
      fetchRequests();
      setClassifyDialogFor(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo clasificar");
    }
  };

  // Asignar solicitud
  const assignRequest = async (
    requestId,
    assigned_to,
    estimated_hours,
    estimated_due,
  ) => {
    try {
      const payload = {
        assigned_to: assigned_to || undefined,
        estimated_hours: estimated_hours ? Number(estimated_hours) : undefined,
        estimated_due: estimated_due || undefined,
      };
      await api.post(`/requests/${requestId}/assign`, payload);
      toast.success("Solicitud asignada");
      fetchRequests();
      setAssignDialogFor(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo asignar");
    }
  };

  // Soporte toma ticket
  const takeRequest = async (requestId) => {
    try {
      await api.put(`/requests/${requestId}`, {
        assigned_to: user.id,
        status: "En progreso",
      });
      toast.success("Solicitud tomada");
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo tomar la solicitud");
    }
  };

  // Diálogo de rechazo (motivo obligatorio)
  const openReject = (id) => setRejectDialog({ open: true, id, reason: "" });
  const submitReject = async () => {
    const { id, reason } = rejectDialog;
    if (!reason.trim()) {
      toast.error("Debes indicar el motivo.");
      return;
    }
    try {
      await api.post(`/requests/${id}/transition`, {
        to_status: "Rechazada",
        comment: reason.trim(),
      });
      setRejectDialog({ open: false, id: null, reason: "" });
      toast.success("Solicitud rechazada");
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo rechazar");
    }
  };

  // Enviar a revisión: solo asignado o quien asignó (o admin)
  const canSendReview = (req) => {
    if (!user) return false;
    return (
      user.id === req.assigned_to ||
      user.id === req.requester_id ||
      user.role === "admin"
    );
  };
  const openReview = (id) => setReviewDialog({ open: true, id, link: "" });
  const validURL = (u) => {
    try {
      const x = new URL(u);
      return ["http:", "https:"].includes(x.protocol);
    } catch {
      return false;
    }
  };
  const submitReview = async () => {
    const { id, link } = reviewDialog;
    if (!validURL(link)) {
      toast.error("Ingresa un enlace válido (http/https).");
      return;
    }
    try {
      await api.post(`/requests/${id}/transition`, {
        to_status: "En revisión",
        evidence_link: link.trim(),
      });
      setReviewDialog({ open: false, id: null, link: "" });
      toast.success("Enviado a revisión");
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo enviar a revisión");
    }
  };
  const transitionRequest = async (requestId, to_status) => {
    try {
      await api.post(`/requests/${requestId}/transition`, { to_status });
      toast.success(`Estado actualizado a ${to_status}`);
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo cambiar el estado");
    }
  };
  const rejectRequest = async (requestId) => openReject(requestId);
  const sendToReview = async (requestId) => openReview(requestId);
  const backToProgress = async (requestId) =>
    transitionRequest(requestId, "En progreso");
  const finishRequest = async (requestId) =>
    transitionRequest(requestId, "Finalizada");
  const submitFeedback = async (requestId, rating, comment) => {
    try {
      await api.post(`/requests/${requestId}/feedback`, { rating, comment });
      toast.success("¡Gracias por tu retroalimentación!");
      fetchRequests();
      setFeedbackDialogFor(null);
      setFeedbackData({ rating: "up", comment: "" });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo enviar el feedback");
    }
  };

  /* ===========================
             Helpers
     =========================== */
  const getStatusColor = (status) => {
    switch (status) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "En progreso":
        return "bg-blue-100 text-blue-800";
      case "En revisión":
        return "bg-purple-100 text-purple-800";
      case "Finalizada":
        return "bg-green-100 text-green-800";
      case "Rechazada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-800";
      case "Media":
        return "bg-yellow-100 text-yellow-800";
      case "Baja":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pageInfo = useMemo(() => {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return { from, to };
  }, [page, pageSize, total]);

  /* ===========================
               UI
     =========================== */
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-sm text-gray-600">Validando sesión…</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2 bg-white/70 backdrop-blur shadow-sm border border-indigo-50">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Sistema de Solicitudes
              </CardTitle>
              <CardDescription className="text-sm text-gray-700">
                Gestiona, asigna y da seguimiento a las solicitudes con una
                interfaz optimizada para cualquier dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" /> Sesión
                segura y control de tiempo de inactividad.
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" /> Experiencia
                responsiva en móvil, tablet y desktop.
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" /> Paneles
                de métricas en tiempo real.
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-sm">
            <CardHeader className="text-center space-y-1">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Inicia sesión
              </CardTitle>
              <CardDescription>
                Accede con tus credenciales corporativas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={login} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    value={loginData.username}
                    onChange={(e) =>
                      setLoginData({ ...loginData, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </form>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-xs font-normal text-gray-700 mb-1">
                  Plataforma desarrollada por el equipo de Soporte.
                </p>
                <p className="text-xs text-gray-600">
                  Si tu sesión expira, volverás automáticamente a esta pantalla
                  para mantener la seguridad.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Funciones para editar usuario ----
  const openEditUser = (userObj) => {
    // Clonar para evitar mutaciones directas del array users hasta guardar
    setEditUser({ ...userObj });
    setEditUserDialog(true);
  };

  // ---- Función para actualizar cualquier usuario (admin) ----
  const updateUser = async (userId, payload) => {
    try {
      // Si el usuario está editando su propio perfil -> usa /users/me
      if (user && userId === user.id) {
        await api.patch("/users/me", payload);
        // refresca el current user (para que el header muestre el nuevo nombre)
        await fetchCurrentUser();
      } else {
        // admin-edit u otro caso -> endpoint clásico
        await api.patch(`/users/${userId}`, payload);
        await fetchUsers?.();
        // si el admin edita al usuario que está logueado, refresca también
        if (user && userId === user.id) {
          await fetchCurrentUser();
        }
      }

      if (window.Swal) {
        window.Swal.fire({
          icon: "success",
          title: "Perfil actualizado",
          text: "Tus cambios se guardaron correctamente",
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        toast.success("Perfil actualizado");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Error al actualizar";
      if (window.Swal) {
        window.Swal.fire({ icon: "error", title: "Error", text: msg });
      } else {
        toast.error(msg);
      }
      throw error;
    }
  };

  // ---- Actualizar perfil del usuario logueado (/users/me) ----
  const updateProfile = async (payload) => {
    try {
      // Endpoint especial para perfil — el backend debe usar current_user del token
      const { data } = await api.patch("/users/me", payload);

      // Actualiza el state local del usuario inmediatamente para ver cambios en header
      setUser(data);

      // Si eres admin, refresca el listado de usuarios (por si cambias nombre)
      if (user?.role === "admin") {
        await fetchUsers();
      }

      if (window.Swal) {
        window.Swal.fire({
          icon: "success",
          title: "Perfil actualizado",
          timer: 1200,
          showConfirmButton: false,
        });
      } else {
        toast.success("Perfil actualizado");
      }

      return data;
    } catch (error) {
      console.error("Error updating profile (me):", error);
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Error al actualizar perfil";
      if (window.Swal) {
        window.Swal.fire({ icon: "error", title: "Error", text: msg });
      } else {
        toast.error(msg);
      }
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar
        user={user}
        onLogout={logout}
        onUpdateProfile={updateProfile}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sticky top-0 z-10 bg-gray-50 -mx-4 sm:mx-0 pb-4">
            <div className="px-4 sm:px-0">
              <NavigationTabs user={user} />
            </div>
          </div>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <RequestsView
              user={user}
              users={users}
              requests={requests}
              filters={filters}
              setFilters={setFilters}
              departments={departments}
              requestDialog={requestDialog}
              setRequestDialog={setRequestDialog}
              newRequest={newRequest}
              setNewRequest={setNewRequest}
              createRequest={createRequest}
              deleteRequest={deleteRequest}
              page={page}
              setPage={setPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              total={total}
              totalPages={totalPages}
              pageInfo={pageInfo}
              setClassifyDialogFor={setClassifyDialogFor}
              setClassifyData={setClassifyData}
              setAssignDialogFor={setAssignDialogFor}
              setAssignData={setAssignData}
              setFeedbackDialogFor={setFeedbackDialogFor}
              setFeedbackData={setFeedbackData}
              takeRequest={takeRequest}
              rejectRequest={rejectRequest}
              sendToReview={sendToReview}
              backToProgress={backToProgress}
              finishRequest={finishRequest}
            />
          </TabsContent>

          {/* Analytics Tab */}
          {(user?.role === "support" || user?.role === "admin") && (
            <TabsContent value="analytics" className="space-y-4">
              <AnalyticsView
                analytics={analytics}
                analyticsPeriod={analyticsPeriod}
                setAnalyticsPeriod={setAnalyticsPeriod}
                analyticsFilters={analyticsFilters}
                setAnalyticsFilters={setAnalyticsFilters}
                users={users.filter((u) => u.role === "support")}
              />
            </TabsContent>
          )}

          {/* Users Tab (Admin only) */}
          {(user?.role === "support" || user?.role === "admin") && (
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Gestión de Usuarios
                </h2>
                <Dialog open={userDialog} onOpenChange={setUserDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Nuevo Usuario</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={createUser} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Usuario</Label>
                          <Input
                            id="username"
                            value={newUser.username}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                username: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Contraseña</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre Completo</Label>
                        <Input
                          id="full_name"
                          value={newUser.full_name}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              full_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Departamento</Label>
                          <Select
                            value={newUser.department}
                            onValueChange={(value) =>
                              setNewUser({ ...newUser, department: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {departments?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.name}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Puesto</Label>
                          <Select
                            value={newUser.position}
                            onValueChange={(value) =>
                              setNewUser({ ...newUser, position: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Jefe de departamento">
                                Jefe de departamento
                              </SelectItem>
                              <SelectItem value="Especialista">
                                Especialista
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) =>
                            setNewUser({ ...newUser, role: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Empleado</SelectItem>
                            <SelectItem value="support">
                              Soporte Técnico
                            </SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        Crear Usuario
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Pasamos la nueva prop onEditUser */}
              <UsersView
                users={users}
                onDeleteUser={deleteUser}
                onEditUser={openEditUser}
              />
            </TabsContent>
          )}

          {/* Departments Tab (Admin only) */}
          {(user?.role === "support" || user?.role === "admin") && (
            <TabsContent value="departments" className="space-y-4">
              <DepartmentsView departments={departments} users={users} />
            </TabsContent>
          )}

          {/* Trash Tab(Admin only) */}
          {(user?.role === "support" || user?.role === "admin") && (
            <TabsContent value="trash" className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Papelera</h2>
              <TrashView api={api} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* === Dialog: Editar Usuario (nuevo) === */}
      <Dialog
        open={editUserDialog}
        onOpenChange={(open) => !open && setEditUserDialog(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los campos y guarda los cambios.
            </DialogDescription>
          </DialogHeader>
          {editUser ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();

                const payload = {
                  full_name: editUser.full_name,
                };

                if (editUser.password && editUser.password.trim() !== "") {
                  payload.password = editUser.password;
                }

                updateUser(editUser.id, payload).then(() => {
                  setEditUserDialog(false);
                  setEditUser(null);
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_username">Usuario</Label>
                  <Input
                    id="edit_username"
                    value={editUser.username}
                    onChange={(e) =>
                      setEditUser({ ...editUser, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_password">Contraseña (opcional)</Label>
                  <Input
                    id="edit_password"
                    type="password"
                    placeholder="Dejar en blanco para mantener"
                    value={editUser.password || ""}
                    onChange={(e) =>
                      setEditUser({ ...editUser, password: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Nombre Completo</Label>
                <Input
                  id="edit_full_name"
                  value={editUser.full_name || ""}
                  onChange={(e) =>
                    setEditUser({ ...editUser, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={editUser.department || ""}
                    onValueChange={(value) =>
                      setEditUser({ ...editUser, department: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Select
                    value={editUser.position || "Especialista"}
                    onValueChange={(value) =>
                      setEditUser({ ...editUser, position: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jefe de departamento">
                        Jefe de departamento
                      </SelectItem>
                      <SelectItem value="Especialista">Especialista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={editUser.role || "employee"}
                  onValueChange={(value) =>
                    setEditUser({ ...editUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="support">Soporte Técnico</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditUserDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* === Dialog: Clasificar (admin) === */}
      <Dialog
        open={!!classifyDialogFor}
        onOpenChange={(open) => !open && setClassifyDialogFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clasificar solicitud</DialogTitle>
            <DialogDescription>
              Define el nivel (1-3) y la prioridad
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select
                value={classifyData.level}
                onValueChange={(v) =>
                  setClassifyData({ ...classifyData, level: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (simple/capacitación)</SelectItem>
                  <SelectItem value="2">2 (soporte/correcciones)</SelectItem>
                  <SelectItem value="3">
                    3 (desarrollo/automatización)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={classifyData.priority}
                onValueChange={(v) =>
                  setClassifyData({ ...classifyData, priority: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setClassifyDialogFor(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                classifyRequest(
                  classifyDialogFor,
                  classifyData.level,
                  classifyData.priority,
                )
              }
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Asignar (admin) === */}
      <AssignDialog
        open={!!assignDialogFor}
        onClose={() => setAssignDialogFor(null)}
        onSubmit={() =>
          assignRequest(
            assignDialogFor,
            assignData.assigned_to,
            assignData.estimated_hours,
            assignData.estimated_due,
          )
        }
        assignData={assignData}
        setAssignData={setAssignData}
        users={users}
      />

      {/* === Dialog: Feedback (solicitante) === */}
      <Dialog
        open={!!feedbackDialogFor}
        onOpenChange={(open) => !open && setFeedbackDialogFor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu opinión</DialogTitle>
            <DialogDescription>
              ¿Cómo fue la solución entregada?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={feedbackData.rating === "up" ? "default" : "outline"}
                onClick={() =>
                  setFeedbackData({ ...feedbackData, rating: "up" })
                }
              >
                <ThumbsUp className="h-4 w-4 mr-2" /> Me sirvió
              </Button>
              <Button
                variant={feedbackData.rating === "down" ? "default" : "outline"}
                onClick={() =>
                  setFeedbackData({ ...feedbackData, rating: "down" })
                }
              >
                <ThumbsDown className="h-4 w-4 mr-2" /> No me sirvió
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Comentario (opcional)</Label>
              <Textarea
                rows={3}
                placeholder="Déjanos detalles para mejorar…"
                value={feedbackData.comment}
                onChange={(e) =>
                  setFeedbackData({ ...feedbackData, comment: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFeedbackDialogFor(null)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                submitFeedback(
                  feedbackDialogFor,
                  feedbackData.rating,
                  feedbackData.comment,
                )
              }
            >
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Rechazar (motivo obligatorio) === */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Debes indicar el motivo del rechazo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              rows={3}
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Describe por qué se rechaza…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setRejectDialog({ open: false, id: null, reason: "" })
              }
            >
              Cancelar
            </Button>
            <Button onClick={submitReject}>Rechazar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Enviar a revisión (evidencia obligatoria) === */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a revisión</DialogTitle>
            <DialogDescription>
              Incluye un enlace a la evidencia: documento, repo de GitHub,
              Google Sheets, Drive, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Enlace a la evidencia</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={reviewDialog.link}
              onChange={(e) =>
                setReviewDialog((prev) => ({ ...prev, link: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setReviewDialog({ open: false, id: null, link: "" })
              }
            >
              Cancelar
            </Button>
            <Button onClick={submitReview}>Enviar a revisión</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
