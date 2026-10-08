import { Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import Home from './pages/Home'
import Wizard from './pages/Wizard'
import Dashboard from './pages/Dashboard'

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-md p-6 pt-16 text-center">
        <h1 className="text-xl font-semibold">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm text-slate-600">
          Copia <code className="rounded bg-slate-200 px-1">.env.example</code> a{' '}
          <code className="rounded bg-slate-200 px-1">.env.local</code> y rellena{' '}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/crear" element={<Wizard />} />
      <Route path="/t/:slug" element={<Dashboard />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
