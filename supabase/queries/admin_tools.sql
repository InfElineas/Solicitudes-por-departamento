-- ============================================================
-- Queries: Herramientas de administración
-- ============================================================

-- Hacer admin a un usuario por email
UPDATE app_users
SET role = 'admin', updated_date = now()
WHERE email = 'reemplaza@tucorreo.com';

-- Verificar el cambio
SELECT email, display_name, role FROM app_users
WHERE email = 'reemplaza@tucorreo.com';


-- ── Eliminar rol superadmin (convertir todos a admin) ─────────────────────────
UPDATE app_users
SET role = 'admin', updated_date = now()
WHERE role = 'superadmin';

-- Verificar que no quedan superadmin
SELECT email, display_name, role FROM app_users ORDER BY role, email;
