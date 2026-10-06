import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg shadow-sm hover:brightness-95 active:brightness-90',
  secondary: 'bg-brand-2 text-brand-2-fg shadow-sm hover:brightness-95 active:brightness-90',
  outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-12 px-5 text-base',
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
      aria-hidden
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-sm', className)}>{children}</div>
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 sm:text-sm'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, 'h-11', className)} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, 'min-h-28 py-3', className)} />
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputBase, 'h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath d='M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  )
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn('flex items-center gap-3 rounded-lg py-1.5 text-sm text-slate-700', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <input
        type="checkbox"
        className="size-5 shrink-0 rounded accent-[var(--brand)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

const COLOR_PRESETS = ['#1d4ed8', '#0f766e', '#15803d', '#b91c1c', '#7c3aed', '#0f172a', '#f59e0b', '#facc15', '#ea580c', '#db2777', '#0ea5e9', '#ffffff']

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setText(value)
  }

  function onText(raw: string) {
    const v = raw.startsWith('#') ? raw : `#${raw}`
    setText(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase())
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="flex items-center gap-2.5">
        <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-black/10" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label} (selector)`} />
        </label>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-700">{label}</span>
          <input
            aria-label={`${label} (hex)`}
            value={text}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => onText(e.target.value.trim())}
            className="w-full rounded bg-transparent font-mono text-xs uppercase text-slate-500 outline-none focus:text-slate-900"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label}: ${c}`}
            onClick={() => onChange(c)}
            className={cn('size-5 rounded-full border border-black/10 transition hover:scale-110', value.toLowerCase() === c && 'ring-2 ring-slate-900 ring-offset-1')}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  )
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl px-3.5 py-2.5 text-sm',
        tone === 'error' && 'bg-red-50 text-red-700',
        tone === 'info' && 'bg-slate-100 text-slate-700',
        tone === 'success' && 'bg-emerald-50 text-emerald-700',
      )}
    >
      {children}
    </div>
  )
}

export function TeamLogo({ name, url, size = 48, className }: { name: string; url: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return url ? (
    <img src={url} alt={`Escudo de ${name}`} width={size} height={size} className={cn('shrink-0 rounded-2xl bg-white object-contain', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn('grid shrink-0 place-items-center rounded-2xl bg-brand font-bold text-brand-fg', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || '?'}
    </span>
  )
}

export function PinInput({ value, onChange, autoFocus, id, placeholder = '••••' }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; id?: string; placeholder?: string }) {
  return (
    <Input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]*"
      maxLength={8}
      autoFocus={autoFocus}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
      className="text-center font-mono text-lg tracking-[0.5em]"
    />
  )
}
