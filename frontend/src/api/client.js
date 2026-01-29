// src/api/client.js
import axios from "axios";
import { toast } from "sonner";
import { getStoredToken, notifyAuthExpired } from "@/utils/session";

const BASE = (
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"
).replace(/\/+$/, "");
const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000, // 15s para cortar "pending" fantasmas
});

// Adjunta token si existe
api.interceptors.request.use((config) => {
  const t = getStoredToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Manejo centralizado de errores
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Mapea timeouts/aborts a mensajes claros
    if (err.code === "ECONNABORTED") {
      toast.error(
        "El servidor no respondió (timeout). Verifica el backend o la red.",
      );
      return Promise.reject(err);
    }
    if (
      err?.response?.status === 401 &&
      !String(err?.config?.url || "").includes("/auth/login")
    ) {
      notifyAuthExpired();
    } else if (!err.response) {
      toast.error(
        "No hay conexión con el backend. ¿Está levantado en http://localhost:8000 ?",
      );
    }
    return Promise.reject(err);
  },
);

// Exports habituales…
export const AuthAPI = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
  me: () => api.get("/auth/me"),
};

export const RequestsAPI = {
  /* … tal como lo teníamos … */
};
export const UsersAPI = {
  /* … */
};
export const DepartmentsAPI = {
  /* … */
};
export const AnalyticsAPI = {
  /* … */
};

export default api;
