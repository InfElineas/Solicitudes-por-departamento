// src/components/layout/HeaderBar.jsx
import React, { useState, useEffect } from "react";
import { LogOut, Menu } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ThemeToggle } from "../ui/theme-toggle";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

import { Input } from "../ui/input";
import { Label } from "../ui/label";

function HeaderBar({ user, onLogout, onUpdateProfile, title, onOpenMobileNav }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    password: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        password: "",
      });
    }
  }, [user]);

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {};
    if (form.full_name.trim()) payload.full_name = form.full_name.trim();
    if (form.password.trim()) payload.password = form.password;

    try {
      await onUpdateProfile(payload); // ✅ SIN ID
      setOpen(false);
    } catch (err) {
      console.error("Profile update error:", err);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-slate-200/70 dark:border-slate-800 p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            onClick={onOpenMobileNav}
            aria-label="Abrir navegación"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Panel
            </span>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h1>
          </div>
        </div>

        {/* Usuario + Logout */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          {/* Perfil */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center space-x-2 focus:outline-none"
                title="Abrir perfil"
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    backgroundColor: user?.full_name
                      ? `hsl(${
                          Array.from(user.full_name).reduce(
                            (h, c) => h + c.charCodeAt(0),
                            0,
                          ) % 360
                        },70%,50%)`
                      : "#6b7280",
                  }}
                >
                  {(user?.full_name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>

                <span className="sr-only">{user?.full_name || "Perfil"}</span>
              </button>
            </DialogTrigger>

              {/* Modal Perfil */}
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Mi perfil</DialogTitle>
                  <DialogDescription>
                    Solo puedes modificar tu nombre y contraseña.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSave} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Nombre completo</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) =>
                        handleChange("full_name", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nueva contraseña</Label>
                    <Input
                      type="password"
                      value={form.password}
                      placeholder="Dejar en blanco para no cambiar"
                      onChange={(e) => handleChange("password", e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Guardar cambios</Button>
                  </div>
                </form>
              </DialogContent>
          </Dialog>

          {/* Logout con tooltip hacia ABAJO */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Tooltip abajo */}
            <span className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
              Cerrar sesión
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
