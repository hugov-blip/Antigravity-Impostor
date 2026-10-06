import { useState } from 'react'
import { PERMISSION_LABELS, type Permissions } from '../lib/types'
import { isValidPin } from '../lib/utils'
import { Alert, Button, Checkbox, Field, Input, PinInput } from './ui'

export type RoleDraft = Permissions & { name: string; pin: string }

const emptyPermissions: Permissions = {
  can_impose: false,
  can_mark_paid: false,
  can_delete_history: false,
  can_manage_settings: false,
}

type Props = {
  initial?: Partial<RoleDraft>
  pinOptional?: boolean
  lockPermissions?: boolean
  submitLabel: string
  onSubmit: (role: RoleDraft) => void | Promise<void>
  onCancel?: () => void
  error?: string | null
}

export default function RoleEditor({ initial, pinOptional, lockPermissions, submitLabel, onSubmit, onCancel, error }: Props) {
  const [draft, setDraft] = useState<RoleDraft>({ ...emptyPermissions, name: '', pin: '', ...initial })
  const [localError, setLocalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return setLocalError('Ponle un nombre al rol')
    if (!(pinOptional && draft.pin === '') && !isValidPin(draft.pin)) return setLocalError('El PIN debe tener entre 4 y 8 dígitos')
    setLocalError(null)
    setBusy(true)
    try {
      await onSubmit({ ...draft, name: draft.name.trim() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del rol">
          {(id) => <Input id={id} placeholder="Ej. Tesorero" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
        </Field>
        <Field label={pinOptional ? 'Nuevo PIN (opcional)' : 'PIN de acceso'} hint={pinOptional ? 'Déjalo vacío para mantener el actual' : '4–8 dígitos, único por rol'}>
          {(id) => <PinInput id={id} value={draft.pin} onChange={(pin) => setDraft({ ...draft, pin })} />}
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Permisos</legend>
        {(Object.keys(PERMISSION_LABELS) as (keyof Permissions)[]).map((key) => (
          <Checkbox
            key={key}
            label={PERMISSION_LABELS[key]}
            checked={lockPermissions || draft[key]}
            disabled={lockPermissions}
            onChange={(v) => setDraft({ ...draft, [key]: v })}
          />
        ))}
        {lockPermissions && <p className="mt-1 text-xs text-slate-500">El rol creador siempre tiene todos los permisos.</p>}
      </fieldset>
      {(localError || error) && <Alert>{localError || error}</Alert>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
