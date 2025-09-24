import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import axios from 'axios';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { toast } from 'sonner';
import {
  Users, FileText, BarChart3, Plus, LogOut, User, Building, Clock,
  CheckCircle, TrendingUp, ThumbsUp, ThumbsDown, Settings2, UserPlus, Link as LinkIcon, AlertTriangle
} from 'lucide-react';
import TrashView from './components/requests/TrashView';


/* ===========================
   Axios client + interceptors
   =========================== */
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: `${BACKEND_URL.replace(/\/+$/,'')}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      if (!err?.config?.url?.includes('/auth/login')) {
        toast.error('Tu sesión expiró. Inicia sesión nuevamente.');
        setTimeout(() => window.location.reload(), 800);
      }
    }
    return Promise.reject(err);
  }
);

/* ===========================
            App
   =========================== */
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  // pestaña activa (persistente)
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'requests');
  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  // login
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // requests (paginado)
  const [requests, setRequests] = useState([]);
  const [requestDialog, setRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
  title: '',
  description: '',
  priority: 'Media',
  type: 'Soporte',
  channel: 'Sistema',
  // campos avanzados (solo aplican si el usuario es admin)
  level: '1',
  assigned_to: '',
  estimated_hours: '',
  estimated_due: ''
  });


  // ==== catálogos válidos para sanitizar filtros ====
  const VALID = {
    status: ['all','Pendiente','En progreso','En revisión','Finalizada','Rechazada'],
    department: [
      'all',
      'Administración',
      'Contabilidad y Finanzas',
      'Comercial',
      'Inventario',
      'Informática',
      'Facturación',
      'Expedición',
      'Calidad',
      'Transporte y Distribución',
      'Mantenimiento',
      'Punto de Venta',
      'Almacén',
      'Picker and Packer',
      'Estibadores'
    ],
    type: ['all','Soporte','Mejora','Desarrollo','Capacitación'],
    level: ['all','1 (simple/capacitación)','2 (soporte/correcciones)','3 (desarrollo/automatización)'],
    channel: ['all','Sistema','Google Sheets','Correo Electrónico','WhatsApp'],
    sort: [
      '-created_at','created_at','-requested_at','requested_at',
      'status','-status','department','-department',
      'priority','-priority','level','-level'
    ]
  };

  const sanitizeFilters = (raw) => {
    const def = {
      status: 'all', department: 'all', type: 'all', level: 'all',
      channel: 'all', q: '', sort: '-created_at'
    };
    const f = { ...def, ...(raw || {}) };
    const pick = (k) => VALID[k].includes(f[k]) ? f[k] : def[k];
    return {
      status: pick('status'),
      department: pick('department'),
      type: pick('type'),
      level: VALID.level.includes(String(f.level)) ? String(f.level) : def.level,
      channel: pick('channel'),
      q: typeof f.q === 'string' ? f.q : '',
      sort: pick('sort'),
    };
  };

  const [filters, setFilters] = useState(() => {
    try { return sanitizeFilters(JSON.parse(localStorage.getItem('filters'))); }
    catch { return sanitizeFilters(null); }
  });
  useEffect(() => { localStorage.setItem('filters', JSON.stringify(filters)); }, [filters]);

  const [page, setPage] = useState(() => Number(localStorage.getItem('page')) || 1);
  useEffect(() => { localStorage.setItem('page', String(page)); }, [page]);

  const [pageSize, setPageSize] = useState(() => Number(localStorage.getItem('pageSize')) || 10);
  useEffect(() => { localStorage.setItem('pageSize', String(pageSize)); }, [pageSize]);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // users (admin)
  const [users, setUsers] = useState([]);
  const [userDialog, setUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    department: '',
    position: 'Especialista',
    role: 'employee'
  });

  // analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(() => localStorage.getItem('analyticsPeriod') || 'month');
  useEffect(() => { localStorage.setItem('analyticsPeriod', analyticsPeriod); }, [analyticsPeriod]);

  // diálogos/acciones
  const [classifyDialogFor, setClassifyDialogFor] = useState(null);
  const [assignDialogFor, setAssignDialogFor] = useState(null);
  const [classifyData, setClassifyData] = useState({ level: '1', priority: 'Media' });
  const [assignData, setAssignData] = useState({ assigned_to: '', estimated_hours: '', estimated_due: '' });
  const [feedbackDialogFor, setFeedbackDialogFor] = useState(null);
  const [feedbackData, setFeedbackData] = useState({ rating: 'up', comment: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, id: null, reason: '' });
  const [reviewDialog, setReviewDialog] = useState({ open: false, id: null, link: '' });
  const departments = VALID.department.filter(d => d !== 'all');

  /* ===========================
             Effects
     =========================== */
  useEffect(() => { if (token) fetchCurrentUser(); }, [token]);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
    if (user.role === 'admin') fetchUsers();
    if (user.role === 'support' || user.role === 'admin') fetchAnalytics();
  }, [user, analyticsPeriod, page, pageSize, filters]);

  /* ===========================
            API calls
     =========================== */
  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    }
  };

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', pageSize);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.q?.trim()) params.set('q', filters.q.trim());
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.department !== 'all') params.set('department', filters.department);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (filters.level !== 'all') params.set('level', Number(filters.level));
      if (filters.channel !== 'all') params.set('channel', filters.channel);

      const { data } = await api.get(`/requests?${params.toString()}`);
      setRequests(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error('Error fetching requests:', error?.response || error);
      toast.error('Error al cargar solicitudes');
      setRequests([]);
      setTotal(0);
      setTotalPages(1);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    }
  };

  const periodMap = { day: 'daily', week: 'weekly', month: 'monthly' };
  const fetchAnalytics = async () => {
    try {
      const period = periodMap[analyticsPeriod] || 'monthly';
      const { data } = await api.get(`/reports/summary?period=${period}`);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Error al cargar análisis');
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post(
        '/auth/login',
        { username: loginData.username, password: loginData.password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const { access_token } = data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      toast.success('¡Bienvenido!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error?.response?.data?.detail || 'Credenciales incorrectas');
    }
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setActiveTab('requests');
    toast.success('Sesión cerrada');
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
      if (user?.role === 'admin') {
        if (newRequest.level) payload.level = Number(newRequest.level);
        if (newRequest.assigned_to) payload.assigned_to = newRequest.assigned_to;
        if (newRequest.estimated_hours) payload.estimated_hours = Number(newRequest.estimated_hours);
        if (newRequest.estimated_due) payload.estimated_due = newRequest.estimated_due;
      }
      await api.post('/requests', payload);
      setNewRequest({
        title:'', description:'', priority:'Media', type:'Soporte', channel:'Sistema',
        level:'1', assigned_to:'', estimated_hours:'', estimated_due:''
      });
      setRequestDialog(false);
      setPage(1);
      await fetchRequests();
      toast.success('Solicitud creada exitosamente');
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error?.response?.data?.detail || 'Error al crear solicitud');
    }
  };

  // Eliminar solicitud
  const deleteRequest = async (requestId) => {
    if (!window.confirm('¿Mover la solicitud a la papelera por 14 días?')) return;
    try {
      await api.delete(`/requests/${requestId}`);
      toast.success('Solicitud enviada a papelera');
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo eliminar');
    }
  };

  // Crear usuario (admin)
  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setNewUser({
        username: '', password: '', full_name: '', department: '',
        position: 'Especialista', role: 'employee'
      });
      setUserDialog(false);
      fetchUsers();
      toast.success('Usuario creado exitosamente');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error?.response?.data?.detail || 'Error al crear usuario');
    }
  };

  //Eliminar usuario(admin)
  const deleteUser = async (userId) => {
  if (!window.confirm('¿Eliminar este usuario?')) return;
  try {
    await api.delete(`/users/${userId}`);
    toast.success('Usuario eliminado');
    fetchUsers();
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'No se pudo eliminar el usuario');
  }
};

  // ---- Acciones del flujo ----
  const classifyRequest = async (requestId, level, priority) => {
    try {
      await api.post(`/requests/${requestId}/classify`, { level: Number(level), priority });
      toast.success('Solicitud clasificada');
      fetchRequests();
      setClassifyDialogFor(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo clasificar');
    }
  };
 
  // Asignar solicitud
  const assignRequest = async (requestId, assigned_to, estimated_hours, estimated_due) => {
    try {
      const payload = {
        assigned_to: assigned_to || undefined,
        estimated_hours: estimated_hours ? Number(estimated_hours) : undefined,
        estimated_due: estimated_due || undefined
      };
      await api.post(`/requests/${requestId}/assign`, payload);
      toast.success('Solicitud asignada');
      fetchRequests();
      setAssignDialogFor(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo asignar');
    }
  };

  // Soporte toma ticket
  const takeRequest = async (requestId) => {
    try {
      await api.put(`/requests/${requestId}`, { assigned_to: user.id, status: 'En progreso' });
      toast.success('Solicitud tomada');
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo tomar la solicitud');
    }
  };

  // Diálogo de rechazo (motivo obligatorio)
  const openReject = (id) => setRejectDialog({ open: true, id, reason: '' });
  const submitReject = async () => {
    const { id, reason } = rejectDialog;
    if (!reason.trim()) { toast.error('Debes indicar el motivo.'); return; }
    try {
      await api.post(`/requests/${id}/transition`, { to_status: 'Rechazada', comment: reason.trim() });
      setRejectDialog({ open: false, id: null, reason: '' });
      toast.success('Solicitud rechazada');
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo rechazar');
    }
  };

  // Enviar a revisión: solo asignado o quien asignó (o admin)
  const canSendReview = (req) => {
    if (!user) return false;
    return user.id === req.assigned_to || user.id === req.assigned_by_id || user.role === 'admin';
  };
  const openReview = (id) => setReviewDialog({ open: true, id, link: '' });
  const validURL = (u) => {
    try { const x = new URL(u); return ['http:','https:'].includes(x.protocol); } catch { return false; }
  };
  const submitReview = async () => {
    const { id, link } = reviewDialog;
    if (!validURL(link)) { toast.error('Ingresa un enlace válido (http/https).'); return; }
    try {
      await api.post(`/requests/${id}/transition`, { to_status: 'En revisión', evidence_link: link.trim() });
      setReviewDialog({ open: false, id: null, link: '' });
      toast.success('Enviado a revisión');
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo enviar a revisión');
    }
  };
  const transitionRequest = async (requestId, to_status) => {
    try {
      await api.post(`/requests/${requestId}/transition`, { to_status });
      toast.success(`Estado actualizado a ${to_status}`);
      fetchRequests();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo cambiar el estado');
    }
  };
  const rejectRequest = async (requestId) => openReject(requestId);
  const sendToReview = async (requestId) => openReview(requestId);
  const backToProgress = async (requestId) => transitionRequest(requestId, 'En progreso');
  const finishRequest = async (requestId) => transitionRequest(requestId, 'Finalizada');
  const submitFeedback = async (requestId, rating, comment) => {
    try {
      await api.post(`/requests/${requestId}/feedback`, { rating, comment });
      toast.success('¡Gracias por tu retroalimentación!');
      fetchRequests();
      setFeedbackDialogFor(null);
      setFeedbackData({ rating: 'up', comment: '' });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudo enviar el feedback');
    }
  };

  /* ===========================
             Helpers
     =========================== */
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'En progreso': return 'bg-blue-100 text-blue-800';
      case 'En revisión': return 'bg-purple-100 text-purple-800';
      case 'Finalizada': return 'bg-green-100 text-green-800';
      case 'Rechazada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Alta': return 'bg-red-100 text-red-800';
      case 'Media': return 'bg-yellow-100 text-yellow-800';
      case 'Baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
            <CardTitle className="text-2xl font-bold text-gray-900">Sistema de Solicitudes</CardTitle>
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
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-normal text-gray-700 mb-2">Plataforma desarrollada por el grupo de Soporte de Elineas</p>
              <div className="text-xs text-gray-600 space-y-1">
                
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-indigo-600" />
                <h1 className="text-xl font-bold text-gray-900">Sistema de Solicitudes</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user?.full_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {user?.role === 'admin' ? 'Administrador' :
                   user?.role === 'support' ? 'Soporte' : 'Empleado'}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="requests" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Solicitudes</span>
            </TabsTrigger>
            {(user?.role === 'support' || user?.role === 'admin') && (
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Análisis</span>
              </TabsTrigger>
            )}

            {user?.role === 'admin' && (
              <TabsTrigger value="trash" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Papelera</span>
              </TabsTrigger>
            )}

            {user?.role === 'admin' && (
              <>
                <TabsTrigger value="users" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Usuarios</span>
                </TabsTrigger>
                <TabsTrigger value="departments" className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Departamentos</span>
                </TabsTrigger>
              </>
            )}

          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Solicitudes de Automatización</h2>
              <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Nueva Solicitud</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Solicitud</DialogTitle>
                    <DialogDescription>
                      Completa los detalles de tu solicitud de automatización
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createRequest} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={newRequest.title}
                        onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newRequest.description}
                        onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                        required
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select
                          value={newRequest.priority}
                          onValueChange={(value) => setNewRequest({ ...newRequest, priority: value })}
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

                      <div className="space-y-2">
                        <Label>Tipo de Solicitud</Label>
                        <Select
                          value={newRequest.type}
                          onValueChange={(value) => setNewRequest({ ...newRequest, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Soporte">Soporte</SelectItem>
                            <SelectItem value="Mejora">Mejora</SelectItem>
                            <SelectItem value="Desarrollo">Desarrollo</SelectItem>
                            <SelectItem value="Capacitación">Capacitación</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Canal</Label>
                        <Select
                          value={newRequest.channel}
                          onValueChange={(value) => setNewRequest({ ...newRequest, channel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sistema">Sistema</SelectItem>
                            <SelectItem value="Correo">Correo</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <>
                        <div className="border-t my-2" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nivel</Label>
                            <Select
                              value={newRequest.level}
                              onValueChange={(v) => setNewRequest({ ...newRequest, level: v })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Técnico (opcional)</Label>
                            <Select
                              value={newRequest.assigned_to}
                              onValueChange={(v) => setNewRequest({ ...newRequest, assigned_to: v })}
                            >
                              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                              <SelectContent>
                                {users
                                  .filter(u => u.role === 'support' || u.role === 'admin')
                                  .map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Horas estimadas</Label>
                            <Input
                              type="number" min="0" step="0.5"
                              value={newRequest.estimated_hours}
                              onChange={(e) => setNewRequest({ ...newRequest, estimated_hours: e.target.value })}
                              placeholder="Ej: 4"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Fecha compromiso (opcional)</Label>
                            <Input
                              type="datetime-local"
                              value={newRequest.estimated_due}
                              onChange={(e) => setNewRequest({ ...newRequest, estimated_due: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    )}


                    <Button type="submit" className="w-full">Crear Solicitud</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtros */}
            <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Label className="text-sm">Buscar</Label>
                <Input
                  placeholder="Título o descripción..."
                  value={filters.q}
                  onChange={(e) => { setFilters({ ...filters, q: e.target.value }); setPage(1); }}
                />
              </div>

              <div>
                <Label className="text-sm">Estado</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => { setFilters({ ...filters, status: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En progreso">En progreso</SelectItem>
                    <SelectItem value="En revisión">En revisión</SelectItem>
                    <SelectItem value="Finalizada">Finalizada</SelectItem>
                    <SelectItem value="Rechazada">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Departamento</Label>
                <Select
                  value={filters.department}
                  onValueChange={(value) => { setFilters({ ...filters, department: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Tipo</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => { setFilters({ ...filters, type: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Soporte">Soporte</SelectItem>
                    <SelectItem value="Mejora">Mejora</SelectItem>
                    <SelectItem value="Desarrollo">Desarrollo</SelectItem>
                    <SelectItem value="Capacitación">Capacitación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Nivel</Label>
                <Select
                  value={filters.level}
                  onValueChange={(value) => { setFilters({ ...filters, level: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Canal</Label>
                <Select
                  value={filters.channel}
                  onValueChange={(value) => { setFilters({ ...filters, channel: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Sistema">Sistema</SelectItem>
                    <SelectItem value="Correo">Correo</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-sm">Orden</Label>
                <Select
                  value={filters.sort}
                  onValueChange={(value) => { setFilters({ ...filters, sort: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Creación: más recientes</SelectItem>
                    <SelectItem value="created_at">Creación: más antiguos</SelectItem>
                    <SelectItem value="-requested_at">Solicitada: más recientes</SelectItem>
                    <SelectItem value="requested_at">Solicitada: más antiguas</SelectItem>
                    <SelectItem value="status">Estado (A→Z)</SelectItem>
                    <SelectItem value="-status">Estado (Z→A)</SelectItem>
                    <SelectItem value="department">Depto (A→Z)</SelectItem>
                    <SelectItem value="-department">Depto (Z→A)</SelectItem>
                    <SelectItem value="priority">Prioridad (A→Z)</SelectItem>
                    <SelectItem value="-priority">Prioridad (Z→A)</SelectItem>
                    <SelectItem value="level">Nivel (1→3)</SelectItem>
                    <SelectItem value="-level">Nivel (3→1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista de solicitudes */}
            <div className="grid gap-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                          <span>{request.requester_name}</span>
                          <span>•</span>
                          <span>{request.department}</span>
                          <span>•</span>
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                          {request.level && (
                            <>
                              <span>•</span>
                              <span className="font-medium">Nivel:</span> {request.level}
                            </>
                          )}
                          <span>•</span>
                          <span className="font-medium">Tipo:</span> {request.type}
                          <span>•</span>
                          <span className="font-medium">Canal:</span> {request.channel}
                          {request.assigned_by_name && (
                            <>
                              <span>•</span>
                              <span className="font-medium">Asignado por:</span> {request.assigned_by_name}
                            </>
                          )}
                          {request.review_evidence?.url && (
                            <>
                              <span>•</span>
                              <a href={request.review_evidence.url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" /> Evidencia
                              </a>
                            </>
                          )}
                          {request.status === 'Rechazada' && request.rejection_reason && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-3 w-3" /> {request.rejection_reason}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{request.description}</p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-sm text-gray-500">
                        {request.assigned_to_name && (
                          <>
                            <span className="font-medium">Asignado a:</span> {request.assigned_to_name}
                            <span className="mx-2">•</span>
                          </>
                        )}
                        {request.estimated_hours && (
                          <>
                            <span className="font-medium">Estimado:</span> {request.estimated_hours} h
                            <span className="mx-2">•</span>
                          </>
                        )}
                        {request.estimated_due && (
                          <>
                            <span className="font-medium">Compromiso:</span> {new Date(request.estimated_due).toLocaleDateString()}
                          </>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-wrap gap-2">
                        {/* Admin: Clasificar / Asignar */}
                        {user?.role === 'admin' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => {
                              setClassifyDialogFor(request.id);
                              setClassifyData({ level: String(request.level || '1'), priority: request.priority || 'Media' });
                            }}>
                              <Settings2 className="h-4 w-4 mr-2" /> Clasificar
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => {
                              setAssignDialogFor(request.id);
                              setAssignData({
                                assigned_to: request.assigned_to || '',
                                estimated_hours: request.estimated_hours || '',
                                estimated_due: request.estimated_due ? new Date(request.estimated_due).toISOString().slice(0, 16) : ''
                              });
                            }}>
                              <UserPlus className="h-4 w-4 mr-2" /> Asignar
                            </Button>
                          </>
                        )}

                        {(user?.role === 'support' || user?.role === 'admin') && request.status === 'Pendiente' && (
                          <>
                            <Button size="sm" onClick={() => takeRequest(request.id)}>Tomar</Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectRequest(request.id)}>Rechazar</Button>
                          </>
                        )}

                        {(user?.role === 'support' || user?.role === 'admin') && request.status === 'En progreso' && (
                          <Button size="sm" onClick={() => canSendReview(request) ? sendToReview(request.id) : toast.error('No tienes permisos para enviar a revisión.')}>
                            Enviar a revisión
                          </Button>
                        )}

                        {(user?.role === 'support' || user?.role === 'admin') && request.status === 'En revisión' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => backToProgress(request.id)}>Devolver a progreso</Button>
                            <Button size="sm" onClick={() => finishRequest(request.id)}>Finalizar</Button>
                          </>
                        )}

                        {/* Feedback del solicitante */}
                        {request.status === 'Finalizada' && !request.feedback && user?.id === request.requester_id && (
                          <Button size="sm" variant="outline" onClick={() => setFeedbackDialogFor(request.id)}>
                            Valorar
                          </Button>
                        )}
                        {request.status === 'Finalizada' && request.feedback && (
                          <div className="flex items-center text-sm text-gray-600">
                            {request.feedback.rating === 'up' ? <ThumbsUp className="h-4 w-4 mr-1" /> : <ThumbsDown className="h-4 w-4 mr-1" />}
                            <span>Feedback enviado</span>
                          </div>
                        )}
                        {user?.role === 'admin' && (
                <Button size="sm" variant="destructive" onClick={() => deleteRequest(request.id)}>
                  Eliminar
                 </Button>
                  )}

                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {requests.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No hay solicitudes que coincidan con el filtro.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Paginación */}
            <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-medium">{pageInfo.from}</span>–<span className="font-medium">{pageInfo.to}</span> de <span className="font-medium">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm mr-2">Por página</Label>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v, 10)); setPage(1); }}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-700">
                    Página <span className="font-medium">{page}</span> / {totalPages}
                  </span>
                  <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          {(user?.role === 'support' || user?.role === 'admin') && (
            <TabsContent value="analytics" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Análisis y Métricas</h2>
                <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Último día</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {analytics && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de solicitudes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.totals?.total_requests ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Acumulado</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nuevas (&lt;24h)</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.totals?.new_last_24h ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{analytics.finished}</div>
                        <p className="text-xs text-muted-foreground">Cerradas en el periodo</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendientes ahora</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{analytics.pending_now}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solicitudes asignadas</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.totals?.assigned_total ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Actualmente</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sin asignar</CardTitle>
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.totals?.unassigned_total ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Actualmente</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.avg_cycle_hours}h</div>
                        <p className="text-xs text-muted-foreground">Ciclo de creación → cierre</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Productividad por técnico */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Productividad por técnico</CardTitle>
                      <CardDescription>
                        Asignadas (acumulado), Atendidas (finalizadas en el periodo) y Pendientes (estado actual)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(analytics.productivity_by_tech && analytics.productivity_by_tech.length > 0) ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-left text-gray-600">
                              <tr>
                                <th className="py-2 pr-2">Técnico</th>
                                <th className="py-2 pr-2 text-right">Asignadas</th>
                                <th className="py-2 pr-2 text-right">Atendidas (periodo)</th>
                                <th className="py-2 pr-2 text-right">Pendientes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.productivity_by_tech.map((row) => (
                                <tr key={row.user_id}>
                                  <td className="py-2 pr-2">{row.name || 'Sin asignación'}</td>
                                  <td className="py-2 pr-2 text-right">{row.assigned_total ?? 0}</td>
                                  <td className="py-2 pr-2 text-right">{row.attended_period ?? 0}</td>
                                  <td className="py-2 pr-2 text-right">{row.pending_now ?? 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin datos en el periodo seleccionado.</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}

          {/* Users Tab (Admin only) */}
          {user?.role === 'admin' && (
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
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
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Contraseña</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre Completo</Label>
                        <Input
                          id="full_name"
                          value={newUser.full_name}
                          onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Departamento</Label>
                          <Select value={newUser.department} onValueChange={(value) => setNewUser({ ...newUser, department: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Puesto</Label>
                          <Select value={newUser.position} onValueChange={(value) => setNewUser({ ...newUser, position: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Jefe de departamento">Jefe de departamento</SelectItem>
                              <SelectItem value="Especialista">Especialista</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Rol</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
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
                      <Button type="submit" className="w-full">Crear Usuario</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {users.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{u.full_name}</h3>
                          <p variant={u.role === 'admin' ? 'default' : u.role === 'support' ? 'secondary' : 'outline'}>
                            {u.role === 'admin' ? 'Administrador' :
                            u.role === 'support' ? 'Soporte' : 'Empleado'} 
                          </p>
                          <p className="text-sm text-gray-600">@{u.username}</p>
                          <p className="text-sm text-gray-500">{u.department} • {u.position}</p>
                        </div>
                        
                        <div className="flex items-center justify-between space-x-2">
                          
                          {user?.role === 'admin' && (
                            <Badge variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>
                              Eliminar
                            </Badge>
                          )}
                          
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Departments Tab (Admin only) */}
          {user?.role === 'admin' && (
            <TabsContent value="departments" className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Departamentos</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departments.map((dept) => (
                  <Card key={dept}>
                    <CardHeader>
                      <CardTitle className="text-lg">{dept}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        <p>Usuarios activos: {users.filter(u => u.department === dept).length}</p>
                        <p>Solicitudes: {requests.filter(r => r.department === dept).length}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Trash Tab(Admin only) */}
          {user?.role === 'admin' && (
            <TabsContent value="trash" className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Papelera</h2>
              <TrashView api={api} />
            </TabsContent>
          )}

        </Tabs>
      </main>

      {/* === Dialog: Clasificar (admin) === */}
      <Dialog open={!!classifyDialogFor} onOpenChange={(open) => !open && setClassifyDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clasificar solicitud</DialogTitle>
            <DialogDescription>Define el nivel (1-3) y la prioridad</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select value={classifyData.level} onValueChange={(v) => setClassifyData({ ...classifyData, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (simple/capacitación)</SelectItem>
                  <SelectItem value="2">2 (soporte/correcciones)</SelectItem>
                  <SelectItem value="3">3 (desarrollo/automatización)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={classifyData.priority} onValueChange={(v) => setClassifyData({ ...classifyData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClassifyDialogFor(null)}>Cancelar</Button>
            <Button onClick={() => classifyRequest(classifyDialogFor, classifyData.level, classifyData.priority)}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Asignar (admin) === */}
      <Dialog open={!!assignDialogFor} onOpenChange={(open) => !open && setAssignDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar responsable</DialogTitle>
            <DialogDescription>Selecciona técnico y estimación</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Técnico</Label>
              <Select
                value={assignData.assigned_to}
                onValueChange={(v) => setAssignData({ ...assignData, assigned_to: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.role === 'support' || u.role === 'admin')
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horas estimadas</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={assignData.estimated_hours}
                onChange={(e) => setAssignData({ ...assignData, estimated_hours: e.target.value })}
                placeholder="Ej: 4"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Fecha compromiso (opcional)</Label>
              <Input
                type="datetime-local"
                value={assignData.estimated_due}
                onChange={(e) => setAssignData({ ...assignData, estimated_due: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignDialogFor(null)}>Cancelar</Button>
            <Button onClick={() => assignRequest(assignDialogFor, assignData.assigned_to, assignData.estimated_hours, assignData.estimated_due)}>Asignar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Feedback (solicitante) === */}
      <Dialog open={!!feedbackDialogFor} onOpenChange={(open) => !open && setFeedbackDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tu opinión</DialogTitle>
            <DialogDescription>¿Cómo fue la solución entregada?</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={feedbackData.rating === 'up' ? 'default' : 'outline'}
                onClick={() => setFeedbackData({ ...feedbackData, rating: 'up' })}
              >
                <ThumbsUp className="h-4 w-4 mr-2" /> Me sirvió
              </Button>
              <Button
                variant={feedbackData.rating === 'down' ? 'default' : 'outline'}
                onClick={() => setFeedbackData({ ...feedbackData, rating: 'down' })}
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
                onChange={(e) => setFeedbackData({ ...feedbackData, comment: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFeedbackDialogFor(null)}>Cancelar</Button>
            <Button onClick={() => submitFeedback(feedbackDialogFor, feedbackData.rating, feedbackData.comment)}>Enviar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Rechazar (motivo obligatorio) === */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>Debes indicar el motivo del rechazo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              rows={3}
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Describe por qué se rechaza…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null, reason: '' })}>Cancelar</Button>
            <Button onClick={submitReject}>Rechazar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Enviar a revisión (evidencia obligatoria) === */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a revisión</DialogTitle>
            <DialogDescription>
              Incluye un enlace a la evidencia: documento, repo de GitHub, Google Sheets, Drive, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Enlace a la evidencia</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={reviewDialog.link}
              onChange={(e) => setReviewDialog(prev => ({ ...prev, link: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, id: null, link: '' })}>Cancelar</Button>
            <Button onClick={submitReview}>Enviar a revisión</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
