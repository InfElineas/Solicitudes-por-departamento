export const AUTH_EXPIRED_EVENT = "auth-expired";

export function getStoredToken() {
  try {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token")
    );
  } catch (e) {
    return null;
  }
}

export function storeToken(token) {
  if (!token) return;
  try {
    localStorage.setItem("token", token);
    sessionStorage.setItem("token", token);
  } catch (e) {
    // noop
  }
}

export function clearStoredToken() {
  try {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("access_token");
  } catch (e) {
    // noop
  }
}

/**
 * Limpia las credenciales locales y notifica al árbol React que la sesión venció.
 * Usa CustomEvent para evitar dependencias directas entre interceptores y componentes.
 */
export function notifyAuthExpired(
  message = "Tu sesión expiró. Inicia sesión nuevamente.",
) {
  clearStoredToken();

  if (typeof window !== "undefined") {
    const detail = { message };
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail }));
  }
}
