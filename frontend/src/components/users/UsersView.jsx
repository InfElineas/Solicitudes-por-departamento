// src/components/users/UsersView.jsx
import React from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";

// util: convierte cualquier valor a texto seguro y registra objetos
const safeText = (val, context = "") => {
  if (val === undefined || val === null) return "—";
  if (Array.isArray(val)) {
    return val.length ? val.join(", ") : "—";
  }
  if (
    typeof val === "string" ||
    typeof val === "number" ||
    typeof val === "boolean"
  ) {
    return String(val);
  }
  // es objeto -> intentar name/id o stringify
  console.warn("safeText: rendering object as string", { context, val });
  if (typeof val === "object") {
    if (val.name) return String(val.name);
    if (val.id) return String(val.id);
    try {
      return JSON.stringify(val);
    } catch {
      return "object";
    }
  }
  return String(val);
};

// Avatar seguro
const Avatar = ({ name }) => {
  const safeName = safeText(name, "avatar");
  const initials = safeName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // color estable a partir del string
  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${Math.abs(hash) % 360},70%,50%)`;

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: color }}
      title={safeName}
    >
      {initials || "U"}
    </div>
  );
};

function UsersView({ users = [], onDeleteUser, onEditUser }) {
  // debug rápido: muestra en consola la forma de los primeros usuarios
  React.useEffect(() => {
    if (!users || users.length === 0) return;
  }, [users]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {users.map((u) => {
        // seguridad: normalizar labels
        const deptLabel = safeText(u?.department, `user:${u?.id}:department`);
        const positionLabel = safeText(u?.position, `user:${u?.id}:position`);
        const fullName = safeText(
          u?.full_name || u?.username,
          `user:${u?.id}:full_name`,
        );

        return (
          <Card
            key={u.id ?? JSON.stringify(u).slice(0, 8)}
            className="w-full max-w-sm sm:max-w-none mx-auto"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar name={fullName} />
                  <div>
                    <h3 className="font-semibold">{fullName}</h3>
                    <p className="text-sm">
                      {u?.role === "admin"
                        ? "Administrador"
                        : u?.role === "support"
                          ? "Soporte"
                          : "Empleado"}
                    </p>
                    <p className="text-sm text-gray-500">
                      @{safeText(u?.username, `user:${u?.id}:username`)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {deptLabel} • {positionLabel}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditUser(u)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteUser && onDeleteUser(u.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default UsersView;
