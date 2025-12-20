import React, { useState, useEffect, useMemo } from "react";
import "./App.css";
import axios from "axios";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog"; // o '@/components/ui/dialog'

import AnalyticsView from "./components/analytics/AnalyticsView";
import DepartmentsView from "./components/departaments/DepartmentsView.jsx";
import UsersView from "./components/users/UsersView";
import HeaderBar from "./components/layouts/HeaderBar.jsx";
import AssignDialog from "./components/requests/AssignDialog";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

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

/* ===========================
   Axios client + interceptors
   =========================== */
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const api = axios.create({ baseURL: `${BACKEND_URL.replace(/\/+$/, "")}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      if (!err?.config?.url?.includes("/auth/login")) {
        toast.error("Tu sesión expiró. Inicia sesión nuevamente.");
        setTimeout(() => window.location.reload(), 800);
      }
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
    level: [
      "all",
      "1 (simple/capacitación)",
      "2 (soporte/correcciones)",
      "3 (desarrollo/automatización)",
    ],
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
    };
    const f = { ...def, ...(raw || {}) };
    const pick = (k) => (VALID[k].includes(f[k]) ? f[k] : def[k]);
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

  // analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(
    () => localStorage.getItem("analyticsPeriod") || "month",
  );
  useEffect(() => {
    localStorage.setItem("analyticsPeriod", analyticsPeriod);
  }, [analyticsPeriod]);

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
  const departments = VALID.department.filter((d) => d !== "all");

  /* ===========================
             Effects
     =========================== */
  useEffect(() => {
    if (token) fetchCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
    if (user.role === "admin") fetchUsers();
    if (user.role === "support" || user.role === "admin") fetchAnalytics();
  }, [user, analyticsPeriod, page, pageSize, filters]);

  /* ===========================
            API calls
     =========================== */
  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
      logout();
    }
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

      const { data } = await api.get(`/requests?${params.toString()}`);
      setRequests(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error("Error fetching requests:", error?.response || error);
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
      toast.error("Error al cargar usuarios");
    }
  };

  const periodMap = { day: "daily", week: "weekly", month: "monthly" };
  const fetchAnalytics = async () => {
    try {
      const period = periodMap[analyticsPeriod] || "monthly";
      const { data } = await api.get(`/reports/summary?period=${period}`);
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Error al cargar análisis");
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(
        "/auth/login",
        { username: loginData.username, password: loginData.password },
        { headers: { "Content-Type": "application/json" } },
      );
      const { access_token } = data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      toast.success("¡Bienvenido!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error?.response?.data?.detail || "Credenciales incorrectas");
    }
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    setActiveTab("requests");
    toast.success("Sesión cerrada");
  };

  // Crear solicitud
  const createRequest = async (e) => {
    e.preventDefault();
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

  // Eliminar solicitud
  const deleteRequest = async (requestId) => {
    if (!window.confirm("¿Mover la solicitud a la papelera por 14 días?"))
      return;
    try {
      await api.delete(`/requests/${requestId}`);
      toast.success("Solicitud enviada a papelera");
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo eliminar");
    }
  };

  // Crear usuario (admin)
  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", newUser);
      setNewUser({
        username: "",
        password: "",
        full_name: "",
        department: "",
        position: "Especialista",
        role: "employee",
      });
      setUserDialog(false);
      fetchUsers();
      toast.success("Usuario creado exitosamente");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error?.response?.data?.detail || "Error al crear usuario");
    }
  };

  //Eliminar usuario(admin)
  const deleteUser = async (userId) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success("Usuario eliminado");
      fetchUsers();
    } catch (e) {
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
      user.id === req.assigned_by_id ||
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
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Sistema de Solicitudes
            </CardTitle>
            <CardDescription>Inicia sesión para continuar</CardDescription>
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
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-normal text-gray-700 mb-2">
                Plataforma desarrollada por el grupo de Soporte de Elineas
              </p>
              <div className="text-xs text-gray-600 space-y-1"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderBar user={user} onLogout={logout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger
              value="requests"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Solicitudes</span>
            </TabsTrigger>
            {(user?.role === "support" || user?.role === "admin") && (
              <TabsTrigger
                value="analytics"
                className="flex items-center space-x-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Análisis</span>
              </TabsTrigger>
            )}

            {user?.role === "admin" && (
              <TabsTrigger
                value="trash"
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Papelera</span>
              </TabsTrigger>
            )}

            {user?.role === "admin" && (
              <>
                <TabsTrigger
                  value="users"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Usuarios</span>
                </TabsTrigger>
                <TabsTrigger
                  value="departments"
                  className="flex items-center space-x-2"
                >
                  <Building className="h-4 w-4" />
                  <span>Departamentos</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

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
              />
            </TabsContent>
          )}

          {/* Users Tab (Admin only) */}
          {user?.role === "admin" && (
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

              <UsersView users={users} onDeleteUser={deleteUser} />
            </TabsContent>
          )}

          {/* Departments Tab (Admin only) */}
          {user?.role === "admin" && (
            <TabsContent value="departments" className="space-y-4">
              <DepartmentsView
                departments={departments}
                users={users}
                requests={requests}
              />
            </TabsContent>
          )}

          {/* Trash Tab(Admin only) */}
          {user?.role === "admin" && (
            <TabsContent value="trash" className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Papelera</h2>
              <TrashView api={api} />
            </TabsContent>
          )}
        </Tabs>
      </main>

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
