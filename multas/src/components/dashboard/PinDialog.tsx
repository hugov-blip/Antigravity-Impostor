import { useState } from 'react'
import { api } from '../../lib/api'
import { Alert, Button, PinInput } from '../ui'

export default function PinDialog({ slug, onClose, onSuccess }: { slug: string; onClose: () => void; onSuccess: (token: string) => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) return setError('Introduce tu PIN')
    setBusy(true)
    setError(null)
    try {
      const res = await api.openSession(slug, pin)
      if (res.ok) onSuccess(res.token)
      else {
        setError('PIN incorrecto')
        setPin('')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand/10 text-xl" aria-hidden>
            🔑
          </div>
          <h2 className="mt-3 text-lg font-semibold">Acceso privado</h2>
          <p className="text-sm text-slate-500">Introduce el PIN de tu rol</p>
        </div>
        <PinInput autoFocus value={pin} onChange={setPin} />
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy}>
            Entrar
          </Button>
        </div>
      </form>
    </div>
  )
}
