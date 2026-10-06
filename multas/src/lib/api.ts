import { supabase } from './supabase'
import type { CreateTeamPayload, Permissions, PrivateTeam, PublicTeam, Role } from './types'

export class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new ApiError(error.message, error.code)
  return data as T
}

export const SESSION_EXPIRED = '28000'

export const api = {
  createTeam: (payload: CreateTeamPayload) =>
    rpc<{ slug: string; token: string; role: Role }>('create_team', { p_payload: payload }),

  getPublicTeam: (slug: string) => rpc<PublicTeam | null>('get_public_team', { p_slug: slug }),

  openSession: (slug: string, pin: string) =>
    rpc<{ ok: false } | { ok: true; token: string; role: Role }>('open_session', { p_slug: slug, p_pin: pin }),

  closeSession: (token: string) => rpc<void>('close_session', { p_token: token }),

  getPrivateTeam: (token: string) => rpc<PrivateTeam>('get_private_team', { p_token: token }),

  imposeFine: (token: string, memberId: string, catalogId: string, amount: number) =>
    rpc<string>('impose_fine', { p_token: token, p_member_id: memberId, p_catalog_id: catalogId, p_amount: amount }),

  markPaid: (token: string, fineId: string) => rpc<void>('mark_fine_paid', { p_token: token, p_fine_id: fineId }),

  voidFine: (token: string, fineId: string) => rpc<void>('void_fine', { p_token: token, p_fine_id: fineId }),

  updateTeamSettings: (
    token: string,
    patch: Partial<{ name: string; logo_url: string | null; primary_color: string; secondary_color: string; rules: string }>,
  ) => rpc<void>('update_team_settings', { p_token: token, p_patch: patch }),

  saveMember: (token: string, id: string | null, name: string, active = true) =>
    rpc<string>('save_member', { p_token: token, p_id: id, p_name: name, p_active: active }),

  saveCatalogItem: (token: string, id: string | null, reason: string, baseAmount: number, active = true) =>
    rpc<string>('save_catalog_item', {
      p_token: token,
      p_id: id,
      p_reason: reason,
      p_base_amount: baseAmount,
      p_active: active,
    }),

  saveRole: (token: string, id: string | null, role: Permissions & { name: string }, pin: string | null) =>
    rpc<string>('save_role', { p_token: token, p_id: id, p_role: role, p_pin: pin }),

  deleteRole: (token: string, id: string) => rpc<void>('delete_role', { p_token: token, p_id: id }),
}
