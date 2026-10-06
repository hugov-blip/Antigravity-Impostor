import { useState, type ReactNode } from 'react'
import { api } from '../../lib/api'
import type { PrivateTeam, Role } from '../../lib/types'
import { formatEUR } from '../../lib/utils'
import PermissionChips from '../PermissionChips'
import LogoInput from '../LogoInput'
import RoleEditor, { type RoleDraft } from '../RoleEditor'
import { Alert, Button, Card, ColorInput, Field, Input, Textarea } from '../ui'

type Props = {
  token: string
  data: PrivateTeam
  onChanged: () => Promise<void>
  onPreviewColors: (colors: { primary: string; secondary: string } | null) => void
}

export default function Settings({ token, data, onChanged, onPreviewColors }: Props) {
  return (
    <div className="space-y-5">
      <RulesSection token={token} initial={data.rules ?? ''} onChanged={onChanged} />
      <IdentitySection token={token} data={data} onChanged={onChanged} onPreviewColors={onPreviewColors} />
      <MembersSection token={token} data={data} onChanged={onChanged} />
      <CatalogSection token={token} data={data} onChanged={onChanged} />
      <RolesSection token={token} roles={data.roles ?? []} currentRoleId={data.role.id} onChanged={onChanged} />
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </Card>
  )
}

function useAction(onChanged: () => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await fn()
      await onChanged()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, saved, run }
}

function RulesSection({ token, initial, onChanged }: { token: string; initial: string; onChanged: () => Promise<void> }) {
  const [rules, setRules] = useState(initial)
  const { busy, error, saved, run } = useAction(onChanged)
  return (
    <Section title="🔒 Normas del equipo" description="Privado: solo visible para roles con permiso de ajustes.">
      <Textarea rows={6} value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Ej. Los entrenadores pagan el doble." />
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-600">Guardado</span>}
        <Button loading={busy} disabled={rules === initial} onClick={() => run(() => api.updateTeamSettings(token, { rules }))}>
          Guardar normas
        </Button>
      </div>
    </Section>
  )
}

function IdentitySection({ token, data, onChanged, onPreviewColors }: Omit<Props, 'data'> & { data: PrivateTeam }) {
  const team = data.team
  const [name, setName] = useState(team.name)
  const [logo, setLogo] = useState<string | null>(team.logo_url)
  const [primary, setPrimary] = useState(team.primary_color)
  const [secondary, setSecondary] = useState(team.secondary_color)
  const { busy, error, saved, run } = useAction(onChanged)
  const dirty = name !== team.name || logo !== team.logo_url || primary !== team.primary_color || secondary !== team.secondary_color

  function setColor(which: 'primary' | 'secondary', value: string) {
    const next = { primary, secondary, [which]: value }
    if (which === 'primary') setPrimary(value)
    else setSecondary(value)
    onPreviewColors(next)
  }

  return (
    <Section title="Identidad y colores">
      <Field label="Nombre del equipo">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <Field label="Escudo">{() => <LogoInput name={name} value={logo} onChange={setLogo} />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <ColorInput label="Principal" value={primary} onChange={(v) => setColor('primary', v)} />
        <ColorInput label="Secundario" value={secondary} onChange={(v) => setColor('secondary', v)} />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-600">Guardado</span>}
        <Button
          loading={busy}
          disabled={!dirty || !name.trim()}
          onClick={async () => {
            const ok = await run(() =>
              api.updateTeamSettings(token, { name: name.trim(), logo_url: logo, primary_color: primary, secondary_color: secondary }),
            )
            if (ok) onPreviewColors(null)
          }}
        >
          Guardar cambios
        </Button>
      </div>
    </Section>
  )
}

function MembersSection({ token, data, onChanged }: { token: string; data: PrivateTeam; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('')
  const { busy, error, run } = useAction(onChanged)
  const active = data.members.filter((m) => m.active)
  const inactive = data.members.filter((m) => !m.active)

  return (
    <Section title={`Plantilla (${active.length})`} description="Dar de baja oculta al jugador sin borrar sus multas.">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          if (await run(() => api.saveMember(token, null, name.trim()))) setName('')
        }}
      >
        <Input placeholder="Nuevo jugador" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="outline" loading={busy}>
          Añadir
        </Button>
      </form>
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {active.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
            {m.name}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.saveMember(token, m.id, m.name, false))}>
              Dar de baja
            </Button>
          </li>
        ))}
        {inactive.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm text-slate-400">
            {m.name} (baja)
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.saveMember(token, m.id, m.name, true))}>
              Reactivar
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function CatalogSection({ token, data, onChanged }: { token: string; data: PrivateTeam; onChanged: () => Promise<void> }) {
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const { busy, error, run } = useAction(onChanged)

  return (
    <Section title="Catálogo de multas">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          const value = Number(amount.replace(',', '.'))
          if (!reason.trim() || !(value >= 0)) return
          if (await run(() => api.saveCatalogItem(token, null, reason.trim(), value))) {
            setReason('')
            setAmount('')
          }
        }}
      >
        <Input aria-label="Motivo" className="min-w-0 flex-1" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="w-24 shrink-0">
          <Input aria-label="Importe en euros" inputMode="decimal" placeholder="€" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" loading={busy}>
          Añadir
        </Button>
      </form>
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {data.catalog.map((c) => (
          <li key={c.id} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${c.active ? '' : 'text-slate-400'}`}>
            <span className="min-w-0 flex-1 truncate">{c.reason}</span>
            <span className="font-semibold tabular-nums">{formatEUR(c.base_amount)}</span>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.saveCatalogItem(token, c.id, c.reason, c.base_amount, !c.active))}>
              {c.active ? 'Desactivar' : 'Activar'}
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function RolesSection({ token, roles, currentRoleId, onChanged }: { token: string; roles: Role[]; currentRoleId: string; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(id: string | null, draft: RoleDraft) {
    setError(null)
    try {
      const { pin, ...role } = draft
      await api.saveRole(token, id, role, pin || null)
      await onChanged()
      setEditing(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Section title="Roles y PINs" description="Cada rol entra con su PIN. Los PIN no se pueden ver, solo cambiar.">
      <div className="space-y-3">
        {roles.map((r) =>
          editing === r.id ? (
            <RoleEditor
              key={r.id}
              initial={r}
              pinOptional
              lockPermissions={r.is_creator}
              submitLabel="Guardar rol"
              error={error}
              onSubmit={(d) => save(r.id, d)}
              onCancel={() => { setEditing(null); setError(null) }}
            />
          ) : (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 p-3">
              <div>
                <p className="font-medium">
                  {r.name}
                  {r.is_creator && <span className="ml-2 rounded-md bg-brand-2 px-1.5 py-0.5 text-xs text-brand-2-fg">Creador</span>}
                  {r.id === currentRoleId && <span className="ml-2 text-xs text-slate-400">(tú)</span>}
                </p>
                <PermissionChips perms={r} />
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(r.id); setError(null) }}>
                  Editar
                </Button>
                {!r.is_creator && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={async () => {
                      if (!confirm(`¿Eliminar el rol ${r.name}?`)) return
                      try {
                        await api.deleteRole(token, r.id)
                        await onChanged()
                      } catch (e) {
                        setError((e as Error).message)
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ),
        )}
        {editing === 'new' ? (
          <RoleEditor submitLabel="Crear rol" error={error} onSubmit={(d) => save(null, d)} onCancel={() => { setEditing(null); setError(null) }} />
        ) : (
          <Button variant="outline" className="w-full" onClick={() => { setEditing('new'); setError(null) }}>
            + Añadir rol
          </Button>
        )}
        {error && editing === null && <Alert>{error}</Alert>}
      </div>
    </Section>
  )
}
