export const AUTH_EXPIRED_EVENT = "auth-expired";

/**
 * Limpia las credenciales locales y notifica al árbol React que la sesión venció.
 * Usa CustomEvent para evitar dependencias directas entre interceptores y componentes.
 */
export function notifyAuthExpired(
  message = "Tu sesión expiró. Inicia sesión nuevamente.",
) {
  try {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
  } catch (e) {
    // noop
  }

  if (typeof window !== "undefined") {
    const detail = { message };
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail }));
  }
}
