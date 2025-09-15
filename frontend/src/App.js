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
import { Users, FileText, BarChart3, Plus, LogOut, User, Building, Clock, CheckCircle, TrendingUp } from 'lucide-react';

// ===== Axios client + interceptor =====
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; // ej: http://localhost:8000
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');

  // Login state
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Requests state (paginated)
  const [requests, setRequests] = useState([]);
  const [requestDialog, setRequestDialog] = useState(false);
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'Media',
    process_type: ''
  });

  // Filtros / orden / paginación
  const [filters, setFilters] = useState({
    status: 'all',       // all | Pendiente | En progreso | Completada | Rechazada
    department: 'all',   // all | <nombre>
    q: '',               // búsqueda texto
    sort: '-created_at', // -created_at | created_at | status | -status | department | -department
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Users state (admin only)
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

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('month');

  // Departments (puedes dejarlo estático o traerlo del backend)
  const departments = [
    'Facturación', 'Inventario', 'Inteligencia comercial', 'Comerciales',
    'Recursos Humanos', 'Directivos', 'Atención al Cliente', 'Creación de Anuncios'
  ];

  // ===== Effects =====
  useEffect(() => {
    if (token) fetchCurrentUser();
  }, [token]);

  useEffect(() => {
    if (!user) return;

    // Cargar solicitudes cuando cambien filtros/paginación
    fetchRequests();

    // Admin: cargar usuarios
    if (user.role === 'admin') fetchUsers();

    // Support/Admin: analítica
    if (user.role === 'support' || user.role === 'admin') fetchAnalytics();
    
  }, [user, analyticsPeriod, page, pageSize, filters]);

  // ===== API calls =====
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

      const { data } = await api.get(`/requests?${params.toString()}`);
      setRequests(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Error al cargar solicitudes');
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

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get(`/analytics/dashboard?period=${analyticsPeriod}`);
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

  const createRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/requests', newRequest);
      setNewRequest({ title: '', description: '', priority: 'Media', process_type: '' });
      setRequestDialog(false);
      // Vuelve a la primera página para ver la nueva solicitud
      setPage(1);
      fetchRequests();
      toast.success('Solicitud creada exitosamente');
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error('Error al crear solicitud');
    }
  };

  const updateRequestStatus = async (requestId, status, assignedTo = null) => {
    try {
      await api.put(`/requests/${requestId}`, { status, assigned_to: assignedTo });
      fetchRequests();
      toast.success('Solicitud actualizada');
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error al actualizar solicitud');
    }
  };

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
      toast.error('Error al crear usuario');
    }
  };

  // ===== Helpers =====
  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'En progreso': return 'bg-blue-100 text-blue-800';
      case 'Completada': return 'bg-green-100 text-green-800';
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

  // ===== UI (Login) =====
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
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Usuarios de prueba:</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Admin:</strong> admin / admin123</p>
                <p><strong>Soporte:</strong> soporte1 / soporte123</p>
                <p><strong>Empleado:</strong> facturacion1 / user123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== UI (App) =====
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
          <TabsList className="grid w-full grid-cols-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                        <Label htmlFor="process_type">Tipo de Proceso</Label>
                        <Input
                          id="process_type"
                          value={newRequest.process_type}
                          onChange={(e) => setNewRequest({ ...newRequest, process_type: e.target.value })}
                          placeholder="ej: Facturación, Inventario..."
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Crear Solicitud</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtros / Búsqueda */}
            <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
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
                    <SelectItem value="Completada">Completada</SelectItem>
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
                <Label className="text-sm">Orden</Label>
                <Select
                  value={filters.sort}
                  onValueChange={(value) => { setFilters({ ...filters, sort: value }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Más recientes</SelectItem>
                    <SelectItem value="created_at">Más antiguos</SelectItem>
                    <SelectItem value="status">Estado (A→Z)</SelectItem>
                    <SelectItem value="-status">Estado (Z→A)</SelectItem>
                    <SelectItem value="department">Depto (A→Z)</SelectItem>
                    <SelectItem value="-department">Depto (Z→A)</SelectItem>
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
                        <CardDescription className="flex items-center space-x-4 mt-2">
                          <span>{request.requester_name}</span>
                          <span>•</span>
                          <span>{request.department}</span>
                          <span>•</span>
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
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
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Tipo:</span> {request.process_type}
                        {request.assigned_to_name && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Asignado a:</span> {request.assigned_to_name}
                          </>
                        )}
                      </div>
                      {(user?.role === 'support' || user?.role === 'admin') && request.status === 'Pendiente' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'En progreso', user.id)}
                          >
                            Tomar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateRequestStatus(request.id, 'Rechazada')}
                          >
                            Rechazar
                          </Button>
                        </div>
                      )}
                      {(user?.role === 'support' || user?.role === 'admin') && request.status === 'En progreso' && (
                        <Button
                          size="sm"
                          onClick={() => updateRequestStatus(request.id, 'Completada')}
                        >
                          Completar
                        </Button>
                      )}
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
                        <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.total_requests}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{analytics.completed_requests}</div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.completion_rate}% tasa de finalización
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{analytics.in_progress_requests}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analytics.avg_resolution_hours}h</div>
                        <p className="text-xs text-muted-foreground">
                          Resolución promedio
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Department Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Solicitudes por Departamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(analytics.requests_by_department || {})
                          .sort(([, a], [, b]) => b - a)
                          .map(([dept, count]) => (
                            <div key={dept} className="flex items-center justify-between">
                              <span className="text-sm font-medium">{dept}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{
                                      width: `${(count / Math.max(...Object.values(analytics.requests_by_department || {}))) * 100}%`
                                    }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                              </div>
                            </div>
                          ))}
                      </div>
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
                          <p className="text-sm text-gray-600">@{u.username}</p>
                          <p className="text-sm text-gray-500">{u.department} • {u.position}</p>
                        </div>
                        <Badge variant={u.role === 'admin' ? 'default' : u.role === 'support' ? 'secondary' : 'outline'}>
                          {u.role === 'admin' ? 'Administrador' :
                           u.role === 'support' ? 'Soporte' : 'Empleado'}
                        </Badge>
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
        </Tabs>
      </main>
    </div>
  );
}

export default App;
