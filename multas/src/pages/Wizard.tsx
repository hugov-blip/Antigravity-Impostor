import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LogoInput from '../components/LogoInput'
import PermissionChips from '../components/PermissionChips'
import RoleEditor, { type RoleDraft } from '../components/RoleEditor'
import { Alert, Button, Card, ColorInput, Field, Input, PinInput, TeamLogo, Textarea } from '../components/ui'
import { api } from '../lib/api'
import { rememberTeam } from '../lib/recent'
import { cn, formatEUR, isValidPin, sessionStore, themeVars } from '../lib/utils'

const STEPS = ['Identidad', 'Roles', 'Normas', 'Plantilla'] as const
const ROLE_SUGGESTIONS = ['Entrenador', 'Capitán', 'Directivo', 'Delegado', 'Tesorero']
const CATALOG_SUGGESTIONS = [
  { reason: 'Llegar tarde', base_amount: 5 },
  { reason: 'Faltar al entrenamiento', base_amount: 10 },
  { reason: 'Tarjeta amarilla', base_amount: 3 },
  { reason: 'Tarjeta roja', base_amount: 10 },
  { reason: 'Olvidar la equipación', base_amount: 5 },
]

type CatalogDraft = { reason: string; base_amount: number }

export default function Wizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [primary, setPrimary] = useState('#1d4ed8')
  const [secondary, setSecondary] = useState('#f59e0b')

  const [creatorRole, setCreatorRole] = useState('')
  const [creatorPin, setCreatorPin] = useState('')
  const [creatorPin2, setCreatorPin2] = useState('')
  const [roles, setRoles] = useState<RoleDraft[]>([])
  const [addingRole, setAddingRole] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)

  const [rules, setRules] = useState('')

  const [members, setMembers] = useState<string[]>([])
  const [memberName, setMemberName] = useState('')
  const [catalog, setCatalog] = useState<CatalogDraft[]>([])
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')

  function validate(s: number): string | null {
    if (s === 0 && !name.trim()) return 'Escribe el nombre del equipo'
    if (s === 1) {
      if (!creatorRole.trim()) return 'Indica qué rol tienes en el equipo'
      if (!isValidPin(creatorPin)) return 'Tu PIN debe tener entre 4 y 8 dígitos'
      if (creatorPin !== creatorPin2) return 'Los PIN no coinciden'
    }
    if (s === 3) {
      if (members.length === 0) return 'Añade al menos un jugador'
      if (catalog.length === 0) return 'Añade al menos un motivo de multa'
    }
    return null
  }

  function next() {
    const err = validate(step)
    setError(err)
    if (!err) setStep(step + 1)
  }

  function addRole(role: RoleDraft) {
    const pins = [creatorPin, ...roles.map((r) => r.pin)]
    if (pins.includes(role.pin)) {
      setRoleError('Ese PIN ya lo usa otro rol')
      return
    }
    setRoles([...roles, role])
    setRoleError(null)
    setAddingRole(false)
  }

  function addMember(e?: React.FormEvent) {
    e?.preventDefault()
    const names = memberName
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter((n) => n && !members.includes(n))
    if (names.length) setMembers([...members, ...names])
    setMemberName('')
  }

  function addCatalog(e?: React.FormEvent) {
    e?.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!reason.trim() || !(value >= 0)) return
    setCatalog([...catalog, { reason: reason.trim(), base_amount: Math.round(value * 100) / 100 }])
    setReason('')
    setAmount('')
  }

  async function create() {
    const err = validate(0) ?? validate(1) ?? validate(3)
    if (err) return setError(err)
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.createTeam({
        name: name.trim(),
        logo_url: logo,
        primary_color: primary,
        secondary_color: secondary,
        rules,
        creator_role: { name: creatorRole.trim(), pin: creatorPin },
        roles: roles.map((r) => ({ ...r })),
        members,
        catalog,
      })
      sessionStore.set(res.slug, res.token)
      rememberTeam({ slug: res.slug, name: name.trim() })
      navigate(`/t/${res.slug}?nuevo=1`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <div style={themeVars(primary, secondary)} className="min-h-svh pb-28">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-3">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Salir
          </Link>
          <span className="text-sm font-medium text-slate-700">Nuevo equipo</span>
          <span className="w-12 text-right text-sm text-slate-400">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="mx-auto flex max-w-xl gap-1.5 px-5 pb-3">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => i < step && setStep(i)}
              className="flex-1 text-left"
              aria-current={i === step ? 'step' : undefined}
            >
              <span className={cn('block h-1.5 rounded-full transition', i <= step ? 'bg-brand' : 'bg-slate-200')} />
              <span className={cn('mt-1.5 block text-xs', i === step ? 'font-semibold text-slate-900' : 'text-slate-400')}>{label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-5 pt-6">
        {step === 0 && (
          <>
            <StepTitle title="Identidad del equipo" subtitle="Así se verá tu equipo en su página pública." />
            <Card className="space-y-5 p-5">
              <Field label="Nombre del equipo">
                {(id) => <Input id={id} autoFocus placeholder="Ej. CD Los Halcones" value={name} onChange={(e) => setName(e.target.value)} />}
              </Field>
              <Field label="Escudo o logo">{() => <LogoInput name={name} value={logo} onChange={setLogo} />}</Field>
              <div className="grid grid-cols-2 gap-3">
                <ColorInput label="Color principal" value={primary} onChange={setPrimary} />
                <ColorInput label="Color secundario" value={secondary} onChange={setSecondary} />
              </div>
            </Card>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Vista previa</p>
              <Card className="overflow-hidden">
                <div className="flex items-center gap-3 bg-brand p-4 text-brand-fg">
                  <TeamLogo name={name || 'Equipo'} url={logo} size={44} className="ring-2 ring-white/40" />
                  <div>
                    <p className="font-semibold">{name || 'Tu equipo'}</p>
                    <p className="text-xs opacity-80">Caja de multas</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-slate-500">Total recaudado</span>
                  <span className="rounded-full bg-brand-2 px-3 py-1 text-sm font-semibold text-brand-2-fg">{formatEUR(120)}</span>
                </div>
              </Card>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <StepTitle title="¿Qué rol tienes en el equipo?" subtitle="Serás el administrador. Cada rol entra con su propio PIN." />
            <Card className="space-y-4 p-5">
              <Field label="Tu rol">
                {(id) => <Input id={id} autoFocus placeholder="Ej. Entrenador" value={creatorRole} onChange={(e) => setCreatorRole(e.target.value)} />}
              </Field>
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCreatorRole(s)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition',
                      creatorRole === s ? 'border-brand bg-brand text-brand-fg' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tu PIN">{(id) => <PinInput id={id} value={creatorPin} onChange={setCreatorPin} />}</Field>
                <Field label="Repite el PIN">{(id) => <PinInput id={id} value={creatorPin2} onChange={setCreatorPin2} />}</Field>
              </div>
              <p className="text-xs text-slate-500">Tu rol tendrá todos los permisos. Guarda bien el PIN: no se puede recuperar.</p>
            </Card>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Otros roles</h3>
                  <p className="text-sm text-slate-500">Capitán, tesorero… cada uno con sus permisos.</p>
                </div>
                {!addingRole && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddingRole(true)}>
                    + Añadir rol
                  </Button>
                )}
              </div>
              {roles.map((r, i) => (
                <Card key={i} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <PermissionChips perms={r} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRoles(roles.filter((_, j) => j !== i))}>
                    Quitar
                  </Button>
                </Card>
              ))}
              {addingRole && (
                <RoleEditor submitLabel="Añadir rol" onSubmit={addRole} onCancel={() => { setAddingRole(false); setRoleError(null) }} error={roleError} />
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepTitle title="Normas del equipo" subtitle="Notas internas para quien gestiona la caja." />
            <Card className="space-y-3 p-5">
              <div className="flex items-start gap-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                <span aria-hidden>🔒</span>
                <p>
                  <strong className="font-semibold text-slate-800">Estrictamente privado.</strong> Solo lo verán los roles con permiso para
                  modificar ajustes. Nunca aparece en la vista pública ni al imponer multas.
                </p>
              </div>
              <Textarea
                autoFocus
                rows={8}
                placeholder={'Ej.\n- Los entrenadores pagan el doble.\n- Las multas se pagan antes de fin de mes.'}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
              />
            </Card>
          </>
        )}

        {step === 3 && (
          <>
            <StepTitle title="Plantilla y catálogo" subtitle="Quién juega y por qué se paga." />
            <Card className="space-y-4 p-5">
              <h3 className="font-semibold">Jugadores ({members.length})</h3>
              <form onSubmit={addMember} className="flex gap-2">
                <Input placeholder="Nombre (o varios separados por comas)" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
                <Button type="submit" variant="outline">
                  Añadir
                </Button>
              </form>
              {members.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <li key={m} className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm">
                      {m}
                      <button
                        type="button"
                        aria-label={`Quitar ${m}`}
                        onClick={() => setMembers(members.filter((x) => x !== m))}
                        className="grid size-6 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="font-semibold">Catálogo de multas</h3>
              <form onSubmit={addCatalog} className="flex gap-2">
                <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Input className="w-24 shrink-0" inputMode="decimal" placeholder="€" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <Button type="submit" variant="outline">
                  Añadir
                </Button>
              </form>
              {catalog.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {catalog.map((c, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <span>{c.reason}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{formatEUR(c.base_amount)}</span>
                        <button type="button" aria-label={`Quitar ${c.reason}`} onClick={() => setCatalog(catalog.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-700">
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <p className="mb-2 text-xs text-slate-500">Sugerencias</p>
                <div className="flex flex-wrap gap-2">
                  {CATALOG_SUGGESTIONS.filter((s) => !catalog.some((c) => c.reason === s.reason)).map((s) => (
                    <button
                      key={s.reason}
                      type="button"
                      onClick={() => setCatalog([...catalog, s])}
                      className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-brand hover:text-slate-900"
                    >
                      + {s.reason} · {formatEUR(s.base_amount)}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </>
        )}

        {error && <Alert>{error}</Alert>}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200/70 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-xl gap-3 px-5 py-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => { setError(null); setStep(step - 1) }}>
              Atrás
            </Button>
          )}
          {isLast ? (
            <Button className="flex-1" onClick={create} loading={submitting}>
              Crear equipo
            </Button>
          ) : (
            <Button className="flex-1" onClick={next}>
              Continuar
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-slate-500">{subtitle}</p>
    </div>
  )
}
