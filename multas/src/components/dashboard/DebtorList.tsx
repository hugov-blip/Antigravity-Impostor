import { useState } from 'react'
import type { Debtor } from '../../lib/types'
import { cn, formatDate, formatEUR } from '../../lib/utils'
import { Button, Card } from '../ui'

type Props = {
  debtors: Debtor[]
  onPay?: (fineId: string) => Promise<void>
  onVoid?: (fineId: string) => Promise<void>
}

export default function DebtorList({ debtors, onPay, onVoid }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function run(fineId: string, action: (id: string) => Promise<void>) {
    setBusy(fineId)
    try {
      await action(fineId)
    } finally {
      setBusy(null)
    }
  }

  if (debtors.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <p className="mt-2 font-semibold">Nadie debe nada</p>
        <p className="text-sm text-slate-500">Todas las multas están pagadas.</p>
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-slate-100 overflow-hidden">
      {debtors.map((d) => {
        const expanded = open === d.member_id
        return (
          <div key={d.member_id}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : d.member_id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-semibold text-slate-700">
                {d.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.name}</span>
                <span className="block text-xs text-slate-500">
                  {d.fines.length} {d.fines.length === 1 ? 'multa pendiente' : 'multas pendientes'}
                </span>
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{formatEUR(d.pending_total)}</span>
              <svg viewBox="0 0 20 20" className={cn('size-5 shrink-0 text-slate-400 transition', expanded && 'rotate-180')} fill="currentColor" aria-hidden>
                <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
              </svg>
            </button>
            {expanded && (
              <ul className="space-y-2 bg-slate-50/70 px-4 pb-4 pt-1">
                {d.fines.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{f.reason}</span>
                      <span className="block text-xs text-slate-500">{formatDate(f.created_at)}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatEUR(f.amount)}</span>
                    {(onPay || onVoid) && (
                      <span className="flex w-full justify-end gap-2 sm:w-auto">
                        {onVoid && (
                          <Button size="sm" variant="danger" disabled={busy !== null} onClick={() => run(f.id, onVoid)}>
                            Anular
                          </Button>
                        )}
                        {onPay && (
                          <Button size="sm" loading={busy === f.id} disabled={busy !== null} onClick={() => run(f.id, onPay)}>
                            Pagado
                          </Button>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </Card>
  )
}
