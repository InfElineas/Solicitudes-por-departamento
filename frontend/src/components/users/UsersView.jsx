// src/components/users/UsersView.jsx

import React from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { User } from "lucide-react";

// Componente para generar un avatar
const Avatar = ({ name }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const color = stringToColor(name);

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
};

// Función para generar color a partir de string
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 50%)`;
  return color;
};

function UsersView({ users, onDeleteUser, onEditUser }) {
  return (
    <div className="grid gap-4">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar
                  className="w-20 h-20"
                  name={u.full_name || u.username}
                />
                <div>
                  <h3 className="font-semibold">{u.full_name}</h3>
                  <p
                    variant={
                      u.role === "admin"
                        ? "default"
                        : u.role === "support"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {u.role === "admin"
                      ? "Administrador"
                      : u.role === "support"
                      ? "Soporte"
                      : "Empleado"}
                  </p>
                  <p className="text-sm text-gray-500">@{u.username}</p>
                  <p className="text-sm text-gray-500">
                    {u.department} • {u.position}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-2">
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditUser && onEditUser(u)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteUser(u.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UsersView;
