// src/App.js
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import "./App.css";
import axios from "axios";
import {
  AUTH_EXPIRED_EVENT,
  clearStoredToken,
  getStoredToken,
  notifyAuthExpired,
  storeToken,
} from "./utils/session";

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
import Sidebar from "./components/layouts/Sidebar.jsx";
import AssignDialog from "./components/requests/AssignDialog";

import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent } from "./components/ui/tabs";
import { Sheet, SheetContent } from "./components/ui/sheet";
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
  Trash2,
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
import { ThemeToggle } from "./components/ui/theme-toggle";

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

const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

// Inyecta Bearer
api.interceptors.request.use((config) => {
  const token = getStoredToken();
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
      (err.code === "ECONNABORTED" || err.message?.includes("Network Error")) &&
      !String(cfg?.url || "").includes("/auth/login");

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
  const [token, setToken] = useState(getStoredToken());
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const skipNextAuthCheck = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [creatingDeptUser, setCreatingDeptUser] = React.useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

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
    department: "", // espejo para el single-select UI
    departments: [], // canonical: siempre array (se envía al backend)
    position: "Especialista",
    role: "employee",
  });
  const [departmentUserDialog, setDepartmentUserDialog] = useState(false);
  const [departmentUserForm, setDepartmentUserForm] = useState({
    full_name: "",
    email: "",
    role: "employee",
    status: "active",
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
    clearStoredToken();
    setActiveTab("requests");
    setAuthChecked(true);

    // Decidir si el `message` es realmente informativo
    if (isMeaningfulMessage(message)) {
      // Si message viene como objeto, convertirlo a html legible
      const messageHtml =
        typeof message === "string"
          ? translateIfEnglishAuth(message)
          : getErrorMessage({ response: { data: message } }, String(message));

      // sesión finalizada con detalle -> modal con botón
      showAuthAlert("Hasta pronto", "Has cerrado sesión correctamente.", {
        icon: "success",
        timer: 2000,
        allowOutsideClick: true,
      });
    } else {
      // cierre manual -> alerta transitoria, cordial y sin botón
      showAuthAlert("Hasta pronto", "Has cerrado sesión correctamente.", {
        icon: "success",
        timer: 2000,
        allowOutsideClick: true,
      });
    }
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
    if (skipNextAuthCheck.current) {
      skipNextAuthCheck.current = false;
      setAuthChecked(true);
      return;
    }
    setAuthChecked(false);
    fetchCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(
      async () => {
        try {
          await api.get("/auth/me");
        } catch (error) {
          if (error?.response?.status === 401) {
            notifyAuthExpired();
          }
        }
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(interval);
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
        const message = getErrorMessage(
          error,
          "No se pudo validar tu sesión. Verifica la conexión y reintenta.",
        );
        await showAuthAlert("No se pudo validar la sesión", message, "error");
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
      const raw = data || [];

      const normalized = raw.map((u) => {
        // Normalizar department -> siempre array de strings
        let deptArray = [];
        if (Array.isArray(u.department)) {
          deptArray = u.department;
        } else if (u.department && typeof u.department === "string") {
          deptArray = [u.department];
        } else if (u.department && typeof u.department === "object") {
          if (u.department.name) deptArray = [u.department.name];
          else if (u.department.id) deptArray = [u.department.id];
          else {
            try {
              deptArray = [JSON.stringify(u.department)];
            } catch {
              deptArray = [];
            }
          }
        } else {
          deptArray = [];
        }

        return {
          ...u,
          department: deptArray,
        };
      });

      // Si el current user es Jefe (y NO es admin/support) filtrar sólo los usuarios de sus deptos
      const isDeptHead =
        user?.position === "Jefe de departamento" &&
        user?.role !== "admin" &&
        user?.role !== "support";
      let finalList = normalized;
      if (isDeptHead) {
        const allowedDepts = Array.isArray(user?.department)
          ? user.department
          : user?.department
            ? [user.department]
            : [];
        finalList = normalized.filter((u) => {
          // cualquier intersección entre arrays
          if (!Array.isArray(u.department) || u.department.length === 0)
            return false;
          return u.department.some((d) => allowedDepts.includes(d));
        });
      }

      setUsers(finalList);
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
      const accessToken = data?.access_token || data?.token;
      const userFromLogin =
        data?.user || data?.current_user || data?.profile || null;
      if (!accessToken) {
        toast.error("No se recibió un token válido.");
        setLoading(false);
        return;
      }

      storeToken(accessToken);
      skipNextAuthCheck.current = true;
      if (userFromLogin) {
        setUser(userFromLogin);
      } else {
        const meResponse = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setUser(meResponse.data);
      }
      setToken(accessToken);
      setAuthChecked(true);

      // SweetAlert transitoria de éxito (si quieres más cordial: incluir el nombre)
      const displayName = (
        userFromLogin?.full_name ||
        userFromLogin?.username ||
        ""
      ).trim();
      const welcome = displayName
        ? `¡Bienvenido, ${displayName}!`
        : "¡Bienvenido!";
      // mostrar 1.5s y sin botón
      await showAuthAlert(welcome, "Has iniciado sesión correctamente.", {
        icon: "success",
        timer: 1500,
      });

      // fallback toast
      toast.success("¡Bienvenido!");
    } catch (error) {
      console.error("Login error:", error);
      clearStoredToken();

      // Extraer mensaje en html legible
      const messageHtml = getErrorMessage(error, "No se pudo iniciar sesión");

      // Si es 401 -> credenciales inválidas (traducido por getErrorMessage)
      if (error?.response?.status === 401) {
        await showAuthAlert("Credenciales inválidas", messageHtml, {
          icon: "error",
          showConfirmButton: true,
        });
      } else {
        // Network / timeout / otros -> alerta
        await showAuthAlert("Error al iniciar sesión", messageHtml, {
          icon: "error",
          showConfirmButton: true,
        });
      }
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
      const payload = {
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        department:
          Array.isArray(newUser.departments) && newUser.departments.length
            ? newUser.departments
            : newUser.department
              ? [newUser.department]
              : [],
        position: newUser.position,
        role: newUser.role,
      };

      await api.post("/users", payload);

      // reset UI
      setNewUser({
        username: "",
        password: "",
        full_name: "",
        department: "",
        departments: [],
        position: "Especialista",
        role: "employee",
      });
      setUserDialog(false);
      await fetchUsers();

      // SweetAlert after success
      await Swal.fire({
        title: "Creado",
        html: `Usuario <strong>@${payload.username}</strong> creado exitosamente.`,
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

      toast.error(message);
    }
  };

  const createDepartmentUser = async (event) => {
    event.preventDefault();
    if (creatingDeptUser) return; // evita dobles envíos

    const trimmedName = (departmentUserForm.full_name || "").trim();
    const trimmedEmail = (departmentUserForm.email || "").trim().toLowerCase();
    const allowedRoles = ["employee", "support"];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validaciones básicas
    if (!trimmedName) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!emailPattern.test(trimmedEmail)) {
      toast.error("El correo no es válido");
      return;
    }
    if (!allowedRoles.includes(departmentUserForm.role)) {
      toast.error("Selecciona un rol permitido");
      return;
    }

    // Determinar departamento a usar
    // Prioridad: departmentContext (si viene), luego campo del formulario (si añadiste select), luego departamentos del jefe
    const allowedDepts = Array.isArray(user?.department)
      ? user.department
      : user?.department
        ? [user.department]
        : [];
    let deptToUse = null;

    if (departmentContext?.departmentName) {
      deptToUse = departmentContext.departmentName;
    } else if (departmentUserForm.department) {
      deptToUse = departmentUserForm.department;
    } else if (allowedDepts.length === 1) {
      deptToUse = allowedDepts[0];
    }

    // Si el creador es Jefe de departamento, forzar que deptToUse pertenezca a sus depts
    const isDeptHead =
      user?.position === "Jefe de departamento" &&
      user?.role !== "admin" &&
      user?.role !== "support";
    if (isDeptHead) {
      if (!deptToUse) {
        toast.error(
          "Debes seleccionar a qué departamento pertenece el usuario",
        );
        return;
      }
      if (!allowedDepts.includes(deptToUse)) {
        toast.error("Solo puedes crear usuarios para tus departamentos");
        return;
      }
    }

    // Si departmentContext no existe y no hay departamento elegido, bloquear
    if (!deptToUse) {
      toast.error("No se pudo determinar el departamento del nuevo usuario");
      return;
    }

    // Preparar payload: genera username desde la parte antes del @ y password aleatoria
    const usernameLocal = trimmedEmail.split("@")[0] || trimmedEmail;
    const randomPassword =
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6);

    const payload = {
      username: usernameLocal,
      password: randomPassword,
      full_name: trimmedName,
      // Backend acepta department string o lista; enviamos string (el backend normaliza)
      department: deptToUse,
      position: departmentUserForm.position || "Especialista",
      // never allow creating admin unless current user is admin
      role:
        user?.role === "admin"
          ? departmentUserForm.role || "employee"
          : departmentUserForm.role || "employee",
      // extras (si tu API los acepta)
      email: trimmedEmail,
      is_active: departmentUserForm.status === "active",
    };

    // UX: bloquear botón y mostrar que se está creando
    setCreatingDeptUser(true);

    try {
      await api.post("/users", payload);

      toast.success("Usuario creado exitosamente");
      setDepartmentUserDialog(false);
      setDepartmentUserForm({
        full_name: "",
        email: "",
        role: "employee",
        status: "active",
        position: "Especialista",
        department: "",
      });

      // refresca la lista
      await fetchUsers();
    } catch (error) {
      console.error("Error creating department user:", error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Error al crear usuario";
      toast.error(message);
    } finally {
      setCreatingDeptUser(false);
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
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200";
      case "En progreso":
        return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200";
      case "En revisión":
        return "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200";
      case "Finalizada":
        return "bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200";
      case "Rechazada":
        return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-700/40 dark:text-slate-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Alta":
        return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200";
      case "Media":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200";
      case "Baja":
        return "bg-green-100 text-green-800 dark:bg-emerald-500/20 dark:text-emerald-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-700/40 dark:text-slate-200";
    }
  };

  /* ===========================
   Helpers para errores auth
   =========================== */

  /**
   * Convierte objetos/arrays en HTML legible para Swal (listas / pares key:value).
   */
  const formatErrorContentToHtml = (value) => {
    try {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value.replace(/\n/g, "<br/>");
      if (Array.isArray(value)) {
        const items = value
          .map(
            (it) =>
              `<li style="text-align:left;margin:4px 0">${String(it)}</li>`,
          )
          .join("");
        return `<ul style="text-align:left;padding-left:18px;margin:0">${items}</ul>`;
      }
      if (typeof value === "object") {
        const rows = Object.entries(value)
          .map(
            ([k, v]) =>
              `<div style="text-align:left;margin:6px 0"><strong>${k}:</strong> ${Array.isArray(v) ? formatErrorContentToHtml(v) : String(v)}</div>`,
          )
          .join("");
        return rows || JSON.stringify(value);
      }
      return String(value);
    } catch (e) {
      return String(value);
    }
  };

  /**
   * Traduce frases comunes de errores de auth en inglés al español.
   */
  const translateIfEnglishAuth = (msg) => {
    if (!msg || typeof msg !== "string") return msg;
    const m = msg.trim();
    const map = {
      "Incorrect username or password": "Usuario o contraseña incorrectos",
      "Incorrect username or password.": "Usuario o contraseña incorrectos",
      "Invalid credentials": "Credenciales inválidas",
      "Invalid username or password": "Usuario o contraseña incorrectos",
      Unauthorized: "No autorizado",
      "Unauthorized.": "No autorizado",
    };
    return map[m] || msg;
  };

  /**
   * Extrae un mensaje razonable desde un error de Axios (o fallback).
   */
  const getErrorMessage = (error, fallback = "Ocurrió un error") => {
    try {
      if (!error) return fallback;

      // Sin response -> timeout / network
      if (!error.response) {
        if (error.code === "ECONNABORTED")
          return "Tiempo de espera agotado al conectar con el servidor.";
        if (
          String(error.message || "")
            .toLowerCase()
            .includes("network error")
        )
          return "No hay conexión con el servidor. Revisa tu red.";
        return "No se pudo conectar con el servidor. Revisa tu conexión.";
      }

      // Con response -> priorizar response.data.detail / message / errors
      const data = error.response.data;
      if (!data) {
        if (error.response.status) {
          return `Error ${error.response.status}: ${error.response.statusText || ""}`;
        }
        return fallback;
      }

      // Si data es string
      if (typeof data === "string") {
        const translated = translateIfEnglishAuth(data);
        return formatErrorContentToHtml(translated);
      }

      // Si existe detail o message
      const primary = data.detail ?? data.message ?? data.error ?? null;
      if (primary) {
        // primary puede ser objeto/array/string
        const maybeTranslated =
          typeof primary === "string"
            ? translateIfEnglishAuth(primary)
            : primary;
        return formatErrorContentToHtml(maybeTranslated);
      }

      // Si hay 'errors' (objetos con listas)
      if (data.errors) return formatErrorContentToHtml(data.errors);

      // Si data es un objeto con info -> stringify legible
      return formatErrorContentToHtml(data);
    } catch (e) {
      return fallback;
    }
  };

  /**
   * Determina si `message` tiene contenido "significativo" que mostrar.
   * Ignora numbers simples, true/false, empty string y objetos vacíos.
   */
  const isMeaningfulMessage = (msg) => {
    if (msg === undefined || msg === null) return false;
    if (typeof msg === "string") return msg.trim().length > 0;
    if (typeof msg === "number") return false; // evita mostrar '1' accidental
    if (typeof msg === "boolean") return false;
    if (msg instanceof Error) return !!msg.message;
    if (typeof msg === "object") {
      // si viene un axios error-like { response: { data: ... } }
      if (msg.response && msg.response.data) {
        const d = msg.response.data;
        if (typeof d === "string") return d.trim().length > 0;
        if (typeof d === "object") return Object.keys(d).length > 0;
        return true;
      }
      // objeto normal: solo si tiene keys
      return Object.keys(msg).length > 0;
    }
    return false;
  };

  /**
   * Mostrar SweetAlert estilizado para errores de autenticación / sesión.
   */
  /**
   * Mostrar SweetAlert genérico con opciones:
   * opts: { icon, timer, showConfirmButton }
   * - si timer se pasa, la alerta se cerrará automáticamente (transitoria)
   */
  const showAuthAlert = async (title, messageHtmlOrText, opts = {}) => {
    try {
      const {
        icon = "error",
        timer = null,
        showConfirmButton = true,
        allowOutsideClick = false,
      } = opts;

      const config = {
        title,
        // wrapper centrado por defecto; contenido complejo puede traer su propio left
        html: `<div style="text-align:center">${messageHtmlOrText || ""}</div>`,
        icon,
        showConfirmButton,
        allowOutsideClick,
      };

      if (timer && Number.isFinite(timer)) {
        config.timer = timer;
        config.timerProgressBar = true;
        config.showConfirmButton = false;
        config.allowOutsideClick = true;
      }

      await Swal.fire(config);
    } catch (e) {
      // fallback a toast con texto plano (quita tags HTML)
      const plain =
        (typeof messageHtmlOrText === "string"
          ? messageHtmlOrText.replace(/<[^>]+>/g, "")
          : String(messageHtmlOrText)) || "Error";
      toast.error(plain);
    }
  };

  const pageInfo = useMemo(() => {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return { from, to };
  }, [page, pageSize, total]);

  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isDepartmentManager =
    user?.position === "Jefe de departamento" ||
    normalizedRole === "jefe_departamento" ||
    normalizedRole === "department_manager";

  const departmentContext = useMemo(() => {
    const deptList = Array.isArray(user?.department)
      ? user.department
      : user?.department
        ? [user.department]
        : [];

    const departmentId = user?.department_id ?? null;
    // Para casos en que el usuario tenga varios departamentos, usamos el primero como contexto simple
    const departmentName = deptList.length ? deptList[0] : null;

    return { departmentId, departmentName, departmentList: deptList };
  }, [user]);

  // TODO: reemplazar por filtrado en backend cuando exista endpoint por departamento.
  const departmentUsers = useMemo(() => {
    const { departmentId, departmentName } = departmentContext;
    if (!departmentId && !departmentName) return users;
    return users.filter((candidate) => {
      const candidateDepartmentId =
        candidate?.department_id ??
        (typeof candidate?.department === "object"
          ? candidate?.department?.id
          : null);
      const candidateDepartmentName =
        typeof candidate?.department === "string"
          ? candidate.department
          : (candidate?.department?.name ?? candidate?.department_name ?? null);

      if (departmentId) {
        if (candidateDepartmentId) {
          return String(candidateDepartmentId) === String(departmentId);
        }
        if (departmentName && candidateDepartmentName) {
          return candidateDepartmentName === departmentName;
        }
        return false;
      }

      if (departmentName && candidateDepartmentName) {
        return candidateDepartmentName === departmentName;
      }

      return false;
    });
  }, [departmentContext, users]);

  const departmentStats = useMemo(() => {
    const resolveActiveFlag = (candidate) => {
      if (typeof candidate?.is_active === "boolean") return candidate.is_active;
      if (typeof candidate?.active === "boolean") return candidate.active;
      const statusValue = candidate?.status ?? candidate?.estado ?? null;
      if (statusValue) {
        const normalized = String(statusValue).toLowerCase();
        if (
          ["activo", "activa", "active", "enabled", "habilitado"].includes(
            normalized,
          )
        ) {
          return true;
        }
        if (
          ["inactivo", "inactive", "disabled", "deshabilitado"].includes(
            normalized,
          )
        ) {
          return false;
        }
      }
      return null;
    };

    const now = Date.now();
    let activeCount = 0;
    let inactiveCount = 0;
    let recentCount = 0;
    let hasCreatedAt = false;

    departmentUsers.forEach((candidate) => {
      const activeFlag = resolveActiveFlag(candidate);
      if (activeFlag === true) activeCount += 1;
      if (activeFlag === false) inactiveCount += 1;

      if (candidate?.created_at) {
        hasCreatedAt = true;
        const createdAtTime = new Date(candidate.created_at).getTime();
        if (!Number.isNaN(createdAtTime)) {
          const diffDays = (now - createdAtTime) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) recentCount += 1;
        }
      }
    });

    return {
      total: departmentUsers.length,
      active: activeCount,
      inactive: inactiveCount,
      recent: recentCount,
      hasCreatedAt,
    };
  }, [departmentUsers]);

  const navItems = useMemo(
    () => [
      {
        value: "requests",
        label: "Solicitudes",
        icon: FileText,
        show: true,
      },
      {
        value: "analytics",
        label: "Análisis",
        icon: BarChart3,
        show: user?.role === "support" || user?.role === "admin",
      },
      {
        value: "trash",
        label: "Papelera",
        icon: Trash2,
        show: user?.role === "support" || user?.role === "admin",
      },
      {
        value: "users",
        label: "Usuarios",
        icon: Users,
        show:
          user?.role === "support" ||
          user?.role === "admin" ||
          isDepartmentManager,
      },
      {
        value: "departments",
        label: "Departamentos",
        icon: Building,
        show: user?.role === "support" || user?.role === "admin",
      },
    ],
    [isDepartmentManager, user],
  );

  const activeTitle =
    navItems.find((item) => item.value === activeTab)?.label || "Panel";

  /* ===========================
               UI
     =========================== */
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          Validando sesión…
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.6),_transparent_60%)]" />
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-2 bg-white/70 dark:bg-slate-900/80 backdrop-blur border border-slate-200/70 dark:border-slate-800 shadow-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Sistema de Solicitudes
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                Una plataforma centralizada para crear, priorizar y dar
                seguimiento a solicitudes internas con un flujo claro.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                Autenticación segura y verificada.
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-sky-500" /> Diseño
                optimizado para móvil y desktop.
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500" /> Insights
                y métricas en tiempo real.
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-white/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 shadow-md">
            <CardHeader className="text-left space-y-2">
              <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Inicia sesión
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-300">
                Accede con tus credenciales corporativas para continuar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    className="h-11"
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
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? "Validando acceso..." : "Iniciar sesión"}
                </Button>
              </form>
              <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Seguridad reforzada
                </p>
                <p>
                  Tu sesión se valida antes de ingresar para evitar accesos
                  inconsistentes.
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
    if (!userObj) return;

    // ✅ Validación dura: debe tener username o role para ser usuario
    if (!userObj.username && !userObj.role) {
      console.error("openEditUser recibió objeto que NO es usuario:", userObj);
      return;
    }

    // Normalizar nombre y posición
    const normalize = (val) => {
      if (val === undefined || val === null) return "";
      if (typeof val === "string" || typeof val === "number")
        return String(val);
      if (typeof val === "object") {
        return val.name || val.id || "";
      }
      return String(val);
    };

    // Normalizar departamentos a array
    let deptArray = [];
    if (Array.isArray(userObj.department)) {
      deptArray = userObj.department;
    } else if (userObj.department && typeof userObj.department === "string") {
      deptArray = [userObj.department];
    } else if (userObj.department && typeof userObj.department === "object") {
      deptArray = [
        userObj.department.name ||
          userObj.department.id ||
          JSON.stringify(userObj.department),
      ];
    }

    setEditUser({
      id: userObj.id || "",
      username: userObj.username || "",
      full_name: userObj.full_name || "",
      role: userObj.role || "employee",
      department: deptArray[0] || "",
      departments: deptArray,
      position: userObj.position || "Especialista",
      password: "",
    });

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <div className="hidden lg:flex">
        <Sidebar
          items={navItems}
          activeTab={activeTab}
          onChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0">
          <Sidebar
            items={navItems}
            activeTab={activeTab}
            onChange={setActiveTab}
            collapsed={false}
            onToggleCollapse={() => {}}
            onNavigate={() => setMobileNavOpen(false)}
            isMobile
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Header */}
        <HeaderBar
          user={user}
          onLogout={logout}
          onUpdateProfile={updateProfile}
          title={activeTitle}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-none">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    filters={filters}
                    setFilters={setFilters}
                    users={users.filter((u) => u.role === "support")}
                  />
                </TabsContent>
              )}

              {/* Users Tab (Support/Admin) */}
              {(user?.role === "support" || user?.role === "admin") && (
                <TabsContent value="users" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
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

                              {newUser.position === "Jefe de departamento" ? (
                                <div className="max-h-52 w-full overflow-y-auto p-3 border border-slate-200 dark:border-slate-800 bg-white/5 dark:bg-slate-900/60 rounded-md">
                                  <div className="flex flex-col gap-2">
                                    {(departments || [])
                                      .filter((dept) => {
                                        // permitir todo a admins/support
                                        if (
                                          user?.role === "admin" ||
                                          user?.role === "support"
                                        )
                                          return true;

                                        // si current user es Jefe de departamento -> sólo mostrar sus departamentos
                                        if (
                                          user?.position ===
                                          "Jefe de departamento"
                                        ) {
                                          const allowed = Array.isArray(
                                            user.department,
                                          )
                                            ? user.department
                                            : user.department
                                              ? [user.department]
                                              : [];
                                          return allowed.includes(dept.name);
                                        }

                                        // por defecto permitir (si quieres bloquear otros roles, cambia aquí)
                                        return true;
                                      })
                                      .map((dept) => {
                                        const checked = (
                                          newUser?.departments || []
                                        ).includes(dept.name);
                                        return (
                                          <label
                                            key={dept.id}
                                            className="flex items-start gap-3 py-2 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer select-none"
                                            title={
                                              dept.description || dept.name
                                            }
                                          >
                                            <input
                                              type="checkbox"
                                              className="mt-1 h-4 w-4 rounded-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                              checked={checked}
                                              onChange={(e) => {
                                                const current =
                                                  newUser.departments || [];
                                                const next = e.target.checked
                                                  ? [...current, dept.name]
                                                  : current.filter(
                                                      (d) => d !== dept.name,
                                                    );
                                                setNewUser({
                                                  ...newUser,
                                                  departments: next,
                                                  department: next[0] || "",
                                                });
                                              }}
                                              aria-label={`Seleccionar ${dept.name}`}
                                            />
                                            <div className="text-sm">
                                              <div className="font-medium leading-5">
                                                {dept.name}
                                              </div>
                                              {dept.description && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                  {dept.description}
                                                </div>
                                              )}
                                            </div>
                                          </label>
                                        );
                                      })}
                                  </div>
                                </div>
                              ) : (
                                // Single select (para Especialista, etc.)
                                <Select
                                  value={newUser.department}
                                  onValueChange={(value) => {
                                    setNewUser({
                                      ...newUser,
                                      department: value,
                                      departments: value ? [value] : [],
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(departments || [])
                                      .filter((dept) => {
                                        if (
                                          user?.role === "admin" ||
                                          user?.role === "support"
                                        )
                                          return true;
                                        if (
                                          user?.position ===
                                          "Jefe de departamento"
                                        ) {
                                          const allowed = Array.isArray(
                                            user.department,
                                          )
                                            ? user.department
                                            : user.department
                                              ? [user.department]
                                              : [];
                                          return allowed.includes(dept.name);
                                        }
                                        return true;
                                      })
                                      .map((dept) => (
                                        <SelectItem
                                          key={dept.id}
                                          value={dept.name}
                                        >
                                          {dept.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Puesto</Label>
                              <Select
                                value={newUser.position}
                                onValueChange={(value) => {
                                  let nextDepartments =
                                    newUser.departments || [];
                                  if (value !== "Jefe de departamento") {
                                    // si no es jefe, conservar solo el primer departamento (o vaciar si prefieres)
                                    nextDepartments = nextDepartments.length
                                      ? [nextDepartments[0]]
                                      : [];
                                  }
                                  setNewUser({
                                    ...newUser,
                                    position: value,
                                    departments: nextDepartments,
                                    department: nextDepartments[0] || "",
                                  });
                                }}
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
                                {/* admin sólo para administradores del sistema */}
                                {user?.role === "admin" && (
                                  <SelectItem value="admin">
                                    Administrador
                                  </SelectItem>
                                )}
                                <SelectItem value="support">
                                  Soporte Técnico
                                </SelectItem>
                                <SelectItem value="employee">
                                  Empleado
                                </SelectItem>
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

              {/* Users Tab (Department Manager) */}
              {isDepartmentManager && (
                <TabsContent value="users" className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                        Usuarios del Departamento
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-300">
                        Visualiza y administra usuarios de tu área.
                      </p>
                    </div>
                    <Dialog
                      open={departmentUserDialog}
                      onOpenChange={setDepartmentUserDialog}
                    >
                      <DialogTrigger asChild>
                        <Button className="flex items-center space-x-2">
                          <UserPlus className="h-4 w-4" />
                          <span>Crear usuario</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            Crear usuario del departamento
                          </DialogTitle>
                          <DialogDescription>
                            Solo podrás crear usuarios para tu departamento.
                          </DialogDescription>
                        </DialogHeader>
                        <form
                          onSubmit={createDepartmentUser}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="dept_full_name">
                              Nombre completo
                            </Label>
                            <Input
                              id="dept_full_name"
                              value={departmentUserForm.full_name}
                              onChange={(event) =>
                                setDepartmentUserForm({
                                  ...departmentUserForm,
                                  full_name: event.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dept_email">Correo</Label>
                            <Input
                              id="dept_email"
                              type="email"
                              value={departmentUserForm.email}
                              onChange={(event) =>
                                setDepartmentUserForm({
                                  ...departmentUserForm,
                                  email: event.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Rol</Label>
                              <Select
                                value={departmentUserForm.role}
                                onValueChange={(value) =>
                                  setDepartmentUserForm({
                                    ...departmentUserForm,
                                    role: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="employee">
                                    Empleado
                                  </SelectItem>
                                  <SelectItem value="support">
                                    Soporte Técnico
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Estado</Label>
                              <Select
                                value={departmentUserForm.status}
                                onValueChange={(value) =>
                                  setDepartmentUserForm({
                                    ...departmentUserForm,
                                    status: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Activo</SelectItem>
                                  <SelectItem value="inactive">
                                    Inactivo
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Departamento</Label>
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {departmentContext.departmentName ||
                                departmentContext.departmentId ||
                                "Sin información"}
                            </div>
                          </div>
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={
                              !departmentContext.departmentId &&
                              !departmentContext.departmentName
                            }
                          >
                            Crear usuario
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {!departmentContext.departmentId &&
                    !departmentContext.departmentName && (
                      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <div>
                          <p className="font-medium">
                            No se pudo determinar el departamento del usuario.
                          </p>
                          <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
                            Los datos se mostrarán sin filtro hasta que se
                            defina el departamento.
                          </p>
                        </div>
                      </div>
                    )}

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Total usuarios</CardDescription>
                        <CardTitle className="text-3xl">
                          {departmentStats.total}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Activos</CardDescription>
                        <CardTitle className="text-3xl">
                          {departmentStats.active}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Inactivos</CardDescription>
                        <CardTitle className="text-3xl">
                          {departmentStats.inactive}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    {departmentStats.hasCreatedAt && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Nuevos (7 días)</CardDescription>
                          <CardTitle className="text-3xl">
                            {departmentStats.recent}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    )}
                  </div>

                  <UsersView
                    users={departmentUsers}
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
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    Papelera
                  </h2>
                  <TrashView api={api} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>

      {/* === Dialog: Editar Usuario (nuevo) === */}
      <Dialog
        open={editUserDialog}
        onOpenChange={(open) => {
          setEditUserDialog(open);
          if (!open) {
            setEditUser(null); // limpia el formulario al cerrar
          }
        }}
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

                // username editable
                if (editUser.username && editUser.username.trim() !== "") {
                  payload.username = editUser.username.trim();
                }

                // password opcional
                if (editUser.password && editUser.password.trim() !== "") {
                  payload.password = editUser.password;
                }

                // role/position
                if (editUser.role) payload.role = editUser.role;
                if (editUser.position) payload.position = editUser.position;

                // department: enviar siempre como array
                payload.department =
                  Array.isArray(editUser.departments) &&
                  editUser.departments.length
                    ? editUser.departments
                    : editUser.department
                      ? [editUser.department]
                      : [];

                updateUser(editUser.id, payload)
                  .then(() => {
                    setEditUserDialog(false);
                    setEditUser(null);
                  })
                  .catch(() => {
                    // deja el diálogo abierto para que el usuario corrija
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

                  {editUser.position === "Jefe de departamento" ? (
                    <div className="max-h-52 w-full overflow-y-auto p-3 border border-slate-200 dark:border-slate-800 bg-white/5 dark:bg-slate-900/60 rounded-md">
                      <div className="flex flex-col gap-2">
                        {(departments || [])
                          .filter((dept) => {
                            // permitir todo a admins/support
                            if (
                              user?.role === "admin" ||
                              user?.role === "support"
                            )
                              return true;

                            // si current user es Jefe de departamento -> sólo mostrar sus departamentos
                            if (user?.position === "Jefe de departamento") {
                              const allowed = Array.isArray(user.department)
                                ? user.department
                                : user.department
                                  ? [user.department]
                                  : [];
                              return allowed.includes(dept.name);
                            }

                            // por defecto permitir (si quieres bloquear otros roles, cambia aquí)
                            return true;
                          })
                          .map((dept) => {
                            const checked = (
                              editUser?.departments || []
                            ).includes(dept.name);
                            return (
                              <label
                                key={dept.id}
                                className="flex items-start gap-3 py-2 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer select-none"
                                title={dept.description || dept.name}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 rounded-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  checked={checked}
                                  onChange={(e) => {
                                    const current = editUser.departments || [];
                                    const next = e.target.checked
                                      ? [...current, dept.name]
                                      : current.filter((d) => d !== dept.name);
                                    setEditUser({
                                      ...editUser,
                                      departments: next,
                                      department: next[0] || "",
                                    });
                                  }}
                                  aria-label={`Seleccionar ${dept.name}`}
                                />
                                <div className="text-sm">
                                  <div className="font-medium leading-5">
                                    {dept.name}
                                  </div>
                                  {dept.description && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {dept.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={editUser.department || ""}
                      onValueChange={(value) =>
                        setEditUser({
                          ...editUser,
                          department: value,
                          departments: value ? [value] : [],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(departments || [])
                          .filter((dept) => {
                            // admin/support ven todos
                            if (
                              user?.role === "admin" ||
                              user?.role === "support"
                            )
                              return true;

                            // si current user es Jefe de departamento -> solo sus depts
                            if (user?.position === "Jefe de departamento") {
                              const allowed = Array.isArray(user.department)
                                ? user.department
                                : user.department
                                  ? [user.department]
                                  : [];
                              return allowed.includes(dept.name);
                            }

                            // por defecto permitir (ajusta según tu política)
                            return true;
                          })
                          .map((dept) => (
                            <SelectItem key={dept.id} value={dept.name}>
                              {dept.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Select
                    value={editUser.position || "Especialista"}
                    onValueChange={(value) => {
                      let nextDepartments = editUser.departments || [];
                      if (value !== "Jefe de departamento") {
                        nextDepartments = nextDepartments.length
                          ? [nextDepartments[0]]
                          : [];
                      }
                      setEditUser({
                        ...editUser,
                        position: value,
                        departments: nextDepartments,
                        department: nextDepartments[0] || "",
                      });
                    }}
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
                    {/* admin sólo para administradores del sistema */}
                    {user?.role === "admin" && (
                      <SelectItem value="admin">Administrador</SelectItem>
                    )}
                    <SelectItem value="support">Soporte Técnico</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditUserDialog(false);
                    setEditUser(null);
                  }}
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
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
