import { useState } from 'react'
import type { FineStatus, HistoryFine } from '../../lib/types'
import { cn, formatDate, formatEUR } from '../../lib/utils'
import { Button, Card } from '../ui'

const STATUS: Record<FineStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Pagada', className: 'bg-emerald-50 text-emerald-700' },
  void: { label: 'Anulada', className: 'bg-slate-100 text-slate-500 line-through' },
}

export default function History({ fines, onVoid }: { fines: HistoryFine[]; onVoid?: (id: string) => Promise<void> }) {
  const [filter, setFilter] = useState<FineStatus | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const list = filter === 'all' ? fines : fines.filter((f) => f.status === filter)

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'paid', 'void'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm transition',
              filter === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {s === 'all' ? 'Todas' : STATUS[s].label + 's'}
          </button>
        ))}
      </div>
      <Card className="divide-y divide-slate-100">
        {list.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay multas</p>}
        {list.map((f) => (
          <div key={f.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {f.member_name} <span className="font-normal text-slate-500">· {f.reason}</span>
              </p>
              <p className="text-xs text-slate-500">
                {formatDate(f.created_at)}
                {f.paid_at && ` · pagada ${formatDate(f.paid_at)}`}
              </p>
            </div>
            <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', STATUS[f.status].className)}>{STATUS[f.status].label}</span>
            <span className="w-16 text-right text-sm font-semibold tabular-nums">{formatEUR(f.amount)}</span>
            {onVoid && f.status !== 'void' && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Borrar del historial"
                title="Borrar del historial"
                loading={busy === f.id}
                disabled={busy !== null}
                onClick={async () => {
                  if (!confirm(`¿Anular la multa de ${f.member_name} (${f.reason})? Dejará de contar en los totales.`)) return
                  setBusy(f.id)
                  try {
                    await onVoid(f.id)
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                🗑
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
