/**
 * base44Client.js  –  re-exported as Supabase-backed implementation.
 * The rest of the codebase imports { base44 } from '@/api/base44Client'
 * and uses base44.entities.*, base44.integrations.*, base44.auth.*, base44.users.*
 * — all of which now route through Supabase.
 */
import { entities, integrations, auth, users } from './entityClient';

export const base44 = {
  entities,
  integrations,
  auth,
  users,
};
