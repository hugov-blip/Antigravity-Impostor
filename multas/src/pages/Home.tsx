import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '../components/ui'
import { getRecentTeams } from '../lib/recent'

export default function Home() {
  const navigate = useNavigate()
  const [slug, setSlug] = useState('')
  const recent = getRecentTeams()

  function go(e: React.FormEvent) {
    e.preventDefault()
    const clean = slug.trim().replace(/^.*\/t\//, '').replace(/\/.*$/, '').toLowerCase()
    if (clean) navigate(`/t/${clean}`)
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col px-5 py-10">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <span className="grid size-8 place-items-center rounded-xl bg-slate-900 text-white">€</span>
        Multas
      </div>

      <h1 className="mt-10 text-4xl font-bold tracking-tight text-slate-900">La caja de multas de tu equipo.</h1>
      <p className="mt-3 text-slate-600">
        Crea tu club en un minuto, define quién puede multar y cobrar con su propio PIN y comparte un enlace público con lo que
        debe cada uno.
      </p>

      <Link to="/crear" className="mt-8">
        <Button size="lg" variant="dark" className="w-full">
          Crear mi equipo
        </Button>
      </Link>

      <Card className="mt-8 p-5">
        <form onSubmit={go} className="space-y-3">
          <label htmlFor="slug" className="block text-sm font-medium text-slate-700">
            ¿Ya tienes equipo?
          </label>
          <div className="flex gap-2">
            <Input id="slug" placeholder="enlace o código del equipo" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Button type="submit" variant="outline">
              Ir
            </Button>
          </div>
        </form>
        {recent.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Visitados recientemente</p>
            <ul className="mt-2 space-y-1">
              {recent.map((t) => (
                <li key={t.slug}>
                  <Link to={`/t/${t.slug}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                    <span className="font-medium text-slate-800">{t.name}</span>
                    <span className="text-slate-400">/t/{t.slug}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  )
}
