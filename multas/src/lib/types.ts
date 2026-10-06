export type Permissions = {
  can_impose: boolean
  can_mark_paid: boolean
  can_delete_history: boolean
  can_manage_settings: boolean
}

export type Role = Permissions & {
  id: string
  name: string
  is_creator: boolean
}

export type PendingFine = {
  id: string
  reason: string
  amount: number
  created_at: string
}

export type Debtor = {
  member_id: string
  name: string
  pending_total: number
  fines: PendingFine[]
}

export type PublicTeam = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  total_collected: number
  total_pending: number
  debtors: Debtor[]
}

export type Member = { id: string; name: string; active: boolean }

export type CatalogItem = { id: string; reason: string; base_amount: number; active: boolean }

export type FineStatus = 'pending' | 'paid' | 'void'

export type HistoryFine = {
  id: string
  member_id: string
  member_name: string
  reason: string
  amount: number
  status: FineStatus
  created_at: string
  paid_at: string | null
  voided_at: string | null
}

export type PrivateTeam = {
  role: Role
  team: PublicTeam
  members: Member[]
  catalog: CatalogItem[]
  history: HistoryFine[]
  rules: string | null
  roles: Role[] | null
}

export type NewRoleInput = Permissions & { name: string; pin: string }

export type CreateTeamPayload = {
  name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  rules: string
  creator_role: { name: string; pin: string }
  roles: NewRoleInput[]
  members: string[]
  catalog: { reason: string; base_amount: number }[]
}

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  can_impose: 'Puede imponer multas',
  can_mark_paid: 'Puede marcar como pagado',
  can_delete_history: 'Puede borrar historial',
  can_manage_settings: 'Puede modificar ajustes del equipo',
}
