import { useRef, useState } from 'react'
import { imageFileToDataUrl } from '../lib/utils'
import { Button, Input, TeamLogo } from './ui'

export default function LogoInput({ name, value, onChange }: { name: string; value: string | null; onChange: (v: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const isDataUrl = value?.startsWith('data:') ?? false

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      onChange(await imageFileToDataUrl(file))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <TeamLogo name={name || 'Equipo'} url={value} size={64} className="border border-slate-200" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            Subir imagen
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Quitar
            </Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <Input
        type="url"
        placeholder="…o pega la URL del escudo (https://…)"
        value={isDataUrl ? '' : (value ?? '')}
        onChange={(e) => onChange(e.target.value || null)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
