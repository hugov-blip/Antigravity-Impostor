import { useState } from 'react'
import type { CatalogItem, Member } from '../../lib/types'
import { formatEUR } from '../../lib/utils'
import { Alert, Button, Card, Field, Input, Select } from '../ui'

type Props = {
  members: Member[]
  catalog: CatalogItem[]
  onImpose: (memberId: string, catalogId: string, amount: number) => Promise<void>
}

export default function ImposeFine({ members, catalog, onImpose }: Props) {
  const activeMembers = members.filter((m) => m.active)
  const activeCatalog = catalog.filter((c) => c.active)
  const [memberId, setMemberId] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  function pickReason(id: string) {
    setCatalogId(id)
    const item = activeCatalog.find((c) => c.id === id)
    setAmount(item ? String(Number(item.base_amount)) : '')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = Number(amount.replace(',', '.'))
    if (!memberId || !catalogId) return setMessage({ tone: 'error', text: 'Elige jugador y motivo' })
    if (!(value > 0)) return setMessage({ tone: 'error', text: 'El importe debe ser mayor que 0 €' })
    setBusy(true)
    setMessage(null)
    try {
      await onImpose(memberId, catalogId, Math.round(value * 100) / 100)
      const who = activeMembers.find((m) => m.id === memberId)?.name
      setMessage({ tone: 'success', text: `Multa de ${formatEUR(value)} impuesta a ${who}` })
      setMemberId('')
      setCatalogId('')
      setAmount('')
    } catch (e) {
      setMessage({ tone: 'error', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-semibold">Imponer multa</h2>
        <Field label="Jugador">
          {(id) => (
            <Select id={id} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Selecciona un jugador</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Motivo">
          {(id) => (
            <Select id={id} value={catalogId} onChange={(e) => pickReason(e.target.value)}>
              <option value="">Selecciona un motivo</option>
              {activeCatalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reason} · {formatEUR(c.base_amount)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Importe final (€)" hint="Se rellena con el importe base; puedes ajustarlo.">
          {(id) => (
            <div className="relative">
              <Input id={id} inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pr-9 text-lg font-semibold tabular-nums" />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-slate-400">€</span>
            </div>
          )}
        </Field>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Imponer multa
        </Button>
      </form>
    </Card>
  )
}
