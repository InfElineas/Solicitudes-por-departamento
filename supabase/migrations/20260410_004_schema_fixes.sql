-- ============================================================
-- Migration: 004 — Schema fixes to match real data structure
-- Date: 2026-04-10
-- Description: Ajusta las tablas guardias, incidents,
--              automation_rules y request_trash para que
--              coincidan con los campos del export de Base44.
-- Ejecutar DESPUÉS de migration 001.
-- ============================================================

-- ── Guardias: reemplazar esquema genérico por campos reales de turnos ─────────
ALTER TABLE guardias
  RENAME COLUMN user_id   TO tecnico_id;
ALTER TABLE guardias
  RENAME COLUMN user_name TO tecnico_nombre;
ALTER TABLE guardias
  RENAME COLUMN notas     TO observaciones;
ALTER TABLE guardias
  DROP COLUMN IF EXISTS fecha,
  DROP COLUMN IF EXISTS turno;
ALTER TABLE guardias
  ADD COLUMN IF NOT EXISTS inicio               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fin                  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tipo                 TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS creada_por           TEXT,
  ADD COLUMN IF NOT EXISTS creada_por_nombre    TEXT,
  ADD COLUMN IF NOT EXISTS reemplazado_por_id   TEXT,
  ADD COLUMN IF NOT EXISTS reemplazado_por_nombre TEXT;

-- ── Incidents: agregar campos del export real ─────────────────────────────────
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS tool_name        TEXT,
  ADD COLUMN IF NOT EXISTS impact           TEXT,
  ADD COLUMN IF NOT EXISTS category         TEXT,
  ADD COLUMN IF NOT EXISTS department       TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_hours FLOAT,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- ── Automation Rules: agregar campos faltantes ────────────────────────────────
ALTER TABLE automation_rules
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS action        TEXT,
  ADD COLUMN IF NOT EXISTS action_config TEXT,
  ADD COLUMN IF NOT EXISTS run_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_run_at   TIMESTAMPTZ;

-- ── Request Trash: agregar snapshot y expiración ──────────────────────────────
ALTER TABLE request_trash
  ADD COLUMN IF NOT EXISTS expire_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_request_id TEXT,
  ADD COLUMN IF NOT EXISTS snapshot            JSONB;
