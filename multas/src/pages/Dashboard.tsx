import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import DebtorList from '../components/dashboard/DebtorList'
import History from '../components/dashboard/History'
import ImposeFine from '../components/dashboard/ImposeFine'
import PinDialog from '../components/dashboard/PinDialog'
import Settings from '../components/dashboard/Settings'
import { Alert, Button, Spinner, TeamLogo } from '../components/ui'
import { api, ApiError, SESSION_EXPIRED } from '../lib/api'
import { rememberTeam } from '../lib/recent'
import type { PrivateTeam, PublicTeam } from '../lib/types'
import { cn, formatEUR, sessionStore, themeVars } from '../lib/utils'

type Tab = 'pending' | 'impose' | 'history' | 'settings'

export default function Dashboard() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const [publicTeam, setPublicTeam] = useState<PublicTeam | null | undefined>(undefined)
  const [priv, setPriv] = useState<PrivateTeam | null>(null)
  const [token, setToken] = useState<string | null>(() => sessionStore.get(slug))
  const [showPin, setShowPin] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')
  const [error, setError] = useState<string | null>(null)
  const [previewColors, setPreviewColors] = useState<{ primary: string; secondary: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const isNew = params.get('nuevo') === '1'

  const logout = useCallback(
    async (callServer = true) => {
      const t = sessionStore.get(slug)
      sessionStore.clear(slug)
      setToken(null)
      setPriv(null)
      setTab('pending')
      setPreviewColors(null)
      if (callServer && t) await api.closeSession(t).catch(() => {})
    },
    [slug],
  )

  const load = useCallback(async () => {
    try {
      if (token) {
        const data = await api.getPrivateTeam(token)
        setPriv(data)
        setPublicTeam(data.team)
      } else {
        setPublicTeam(await api.getPublicTeam(slug))
      }
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.code === SESSION_EXPIRED) {
        await logout(false)
        return
      }
      setError((e as Error).message)
      setPublicTeam((prev) => prev ?? null)
    }
  }, [slug, token, logout])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (publicTeam) {
      rememberTeam({ slug: publicTeam.slug, name: publicTeam.name })
      document.title = `${publicTeam.name} · Multas`
    }
  }, [publicTeam])

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn()
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (publicTeam === undefined) {
    return (
      <div className="grid min-h-svh place-items-center text-slate-400">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (publicTeam === null) {
    return (
      <div className="mx-auto max-w-md px-5 pt-24 text-center">
        <h1 className="text-xl font-semibold">Equipo no encontrado</h1>
        <p className="mt-2 text-slate-500">Revisa el enlace /t/{slug}</p>
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-slate-700 underline">
          Volver al inicio
        </Link>
      </div>
    )
  }

  const team = publicTeam
  const role = priv?.role
  const colors = previewColors ?? { primary: team.primary_color, secondary: team.secondary_color }
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'pending', label: 'Pendientes', show: true },
    { id: 'impose', label: 'Multar', show: Boolean(role?.can_impose) },
    { id: 'history', label: 'Historial', show: Boolean(role) },
    { id: 'settings', label: 'Ajustes del Equipo', show: Boolean(role?.can_manage_settings) },
  ]
  const shareUrl = `${window.location.origin}/t/${team.slug}`

  return (
    <div style={themeVars(colors.primary, colors.secondary)} className="min-h-svh pb-12">
      <header className="bg-brand text-brand-fg">
        <div className="mx-auto max-w-2xl px-5 pb-16 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo name={team.name} url={team.logo_url} size={48} className="ring-2 ring-white/40" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight">{team.name}</h1>
                <p className="text-xs opacity-80">{role ? `Conectado como ${role.name}` : 'Caja de multas'}</p>
              </div>
            </div>
            {role ? (
              <button type="button" onClick={() => logout()} className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">
                Salir
              </button>
            ) : (
              <button type="button" onClick={() => setShowPin(true)} className="shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">
                🔑 Acceso PIN
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-12 max-w-2xl space-y-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200/70 sm:col-span-1">
            <p className="text-sm font-medium text-slate-500">Total Recaudado</p>
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums" data-testid="total-collected">
              {formatEUR(team.total_collected)}
            </p>
            <div className="mt-3 h-1.5 w-12 rounded-full bg-brand-2" />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:col-span-1 sm:block">
            <p className="text-sm font-medium text-slate-500">Pendiente de cobro</p>
            <p className="text-2xl font-semibold tabular-nums text-slate-800 sm:mt-1">{formatEUR(team.total_pending)}</p>
          </div>
        </div>

        {isNew && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">¡Equipo creado! 🎉</p>
            <p className="mt-1">Comparte este enlace con la plantilla. Sin PIN solo se ve lo que debe cada uno.</p>
            <div className="mt-3 flex gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-emerald-900">{shareUrl}</code>
              <Button
                size="sm"
                variant="outline"
                className="h-auto"
                onClick={async () => {
                  await navigator.clipboard?.writeText(shareUrl).catch(() => {})
                  setCopied(true)
                }}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <button type="button" aria-label="Cerrar" className="px-1 text-emerald-700" onClick={() => setParams({})}>
                ×
              </button>
            </div>
          </div>
        )}

        {error && <Alert>{error}</Alert>}

        {role && (
          <nav className="-mx-5 flex gap-1 overflow-x-auto px-5" aria-label="Secciones">
            {tabs
              .filter((t) => t.show)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
                    tab === t.id ? 'bg-brand text-brand-fg shadow-sm' : 'text-slate-600 hover:bg-white',
                  )}
                >
                  {t.label}
                </button>
              ))}
          </nav>
        )}

        {tab === 'pending' && (
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Deben pagar</h2>
            <DebtorList
              debtors={team.debtors}
              onPay={role?.can_mark_paid && token ? (id) => act(() => api.markPaid(token, id)) : undefined}
              onVoid={
                role?.can_delete_history && token
                  ? (id) =>
                      confirm('¿Anular esta multa? Se conservará en el historial como anulada.')
                        ? act(() => api.voidFine(token, id))
                        : Promise.resolve()
                  : undefined
              }
            />
          </section>
        )}

        {tab === 'impose' && priv && token && (
          <ImposeFine members={priv.members} catalog={priv.catalog} onImpose={async (m, c, a) => { await api.imposeFine(token, m, c, a); await load() }} />
        )}

        {tab === 'history' && priv && token && (
          <History fines={priv.history} onVoid={role?.can_delete_history ? (id) => act(() => api.voidFine(token, id)) : undefined} />
        )}

        {tab === 'settings' && priv && token && role?.can_manage_settings && (
          <Settings token={token} data={priv} onChanged={load} onPreviewColors={setPreviewColors} />
        )}

        <p className="pt-4 text-center text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-600">
            Multas · crea la caja de tu equipo
          </Link>
        </p>
      </main>

      {showPin && (
        <PinDialog
          slug={team.slug}
          onClose={() => setShowPin(false)}
          onSuccess={(t) => {
            sessionStore.set(team.slug, t)
            setToken(t)
            setShowPin(false)
          }}
        />
      )}
    </div>
  )
}
