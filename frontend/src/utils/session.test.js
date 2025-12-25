import { AUTH_EXPIRED_EVENT, notifyAuthExpired } from "./session";

describe("notifyAuthExpired", () => {
  it("borra credenciales y emite el evento de expiración", () => {
    localStorage.setItem("token", "abc");
    sessionStorage.setItem("token", "abc");

    const handler = jest.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);

    notifyAuthExpired("Sesión vencida");

    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.message).toBe("Sesión vencida");

    window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  });
});
