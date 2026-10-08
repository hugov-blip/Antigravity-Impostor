import { PERMISSION_LABELS, type Permissions } from '../lib/types'

export default function PermissionChips({ perms }: { perms: Permissions }) {
  const active = (Object.keys(PERMISSION_LABELS) as (keyof Permissions)[]).filter((k) => perms[k])
  if (!active.length) return <p className="mt-1 text-xs text-slate-400">Sin permisos</p>
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {active.map((k) => (
        <span key={k} className="rounded-md bg-brand/10 px-2 py-0.5 text-xs text-slate-700">
          {PERMISSION_LABELS[k].replace('Puede ', '')}
        </span>
      ))}
    </div>
  )
}
