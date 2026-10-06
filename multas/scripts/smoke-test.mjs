// End-to-end checks of the RPC API and its security guarantees, using only the anon key.
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/smoke-test.mjs
// (falls back to VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function env(name) {
  if (process.env[name]) return process.env[name]
  try {
    const line = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`VITE_${name}=`))
    return line?.split('=').slice(1).join('=').trim()
  } catch {
    return undefined
  }
}

const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { auth: { persistSession: false } })
let failures = 0
const check = (cond, label) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`)
  if (!cond) failures++
}
const rpc = (fn, args) => sb.rpc(fn, args)
const suffix = Math.random().toString(36).slice(2, 6)

const payload = (name, pin) => ({
  name,
  primary_color: '#0f766e',
  secondary_color: '#facc15',
  rules: 'SECRETO: los entrenadores pagan el doble',
  creator_role: { name: 'Entrenador', pin },
  roles: [
    { name: 'Capitán', pin: '2222', can_impose: true, can_mark_paid: false, can_delete_history: false, can_manage_settings: false },
    { name: 'Tesorero', pin: '3333', can_impose: false, can_mark_paid: true, can_delete_history: false, can_manage_settings: false },
  ],
  members: ['Ana', 'Luis', 'Marta'],
  catalog: [{ reason: 'Llegar tarde', base_amount: 5 }, { reason: 'Tarjeta roja', base_amount: 10 }],
})

// --- create
const { data: created, error: createErr } = await rpc('create_team', { p_payload: payload(`Prueba ${suffix}`, '1111') })
check(!createErr && created?.slug && created?.token, `create_team → /t/${created?.slug}`)
const slug = created.slug
const coach = created.token

const dup = await rpc('create_team', { p_payload: { ...payload(`Dup ${suffix}`, '1111'), roles: [{ name: 'X', pin: '1111' }] } })
check(dup.error?.message?.includes('PIN'), 'create_team rejects duplicate PINs inside a team')

// --- direct table access with the anon key must fail
for (const table of ['teams', 'team_private', 'roles', 'members', 'fine_catalog', 'fines', 'role_sessions', 'pin_attempts']) {
  const { data, error } = await sb.from(table).select('*').limit(1)
  check(error && !data, `anon cannot SELECT ${table} (${error?.code})`)
}
const ins = await sb.from('fines').insert({ team_id: '00000000-0000-0000-0000-000000000000' })
check(!!ins.error, 'anon cannot INSERT into fines')
for (const fn of ['_hash_pin', '_session_role', '_team_public_json']) {
  const { error } = await rpc(fn, fn === '_team_public_json' ? { p_team_id: '00000000-0000-0000-0000-000000000000' } : { p_pin: '1234', p_token: 'x' })
  check(!!error, `anon cannot call internal ${fn}`)
}

// --- public view leaks nothing private
const pub = await rpc('get_public_team', { p_slug: slug })
const pubText = JSON.stringify(pub.data)
check(pub.data?.name && !pubText.includes('SECRETO') && !pubText.includes('pin') && !pubText.includes('Entrenador'), 'public view has no rules, PINs or roles')
check(pub.data.debtors.length === 0 && Number(pub.data.total_collected) === 0, 'new team: no debtors, 0 € collected')

// --- PIN login
const bad = await rpc('open_session', { p_slug: slug, p_pin: '9999' })
check(bad.data?.ok === false, 'wrong PIN is rejected')
const cap = (await rpc('open_session', { p_slug: slug, p_pin: '2222' })).data
const tes = (await rpc('open_session', { p_slug: slug, p_pin: '3333' })).data
check(cap?.ok && cap.role.name === 'Capitán' && cap.role.can_impose && !cap.role.can_mark_paid, 'PIN 2222 resolves to Capitán with its permissions')
check(tes?.ok && tes.role.name === 'Tesorero', 'PIN 3333 resolves to Tesorero')

// --- private data per role
const capView = (await rpc('get_private_team', { p_token: cap.token })).data
check(capView.rules === null && capView.roles === null, 'Capitán (no settings perm) does not receive rules or roles')
const coachView = (await rpc('get_private_team', { p_token: coach })).data
check(coachView.rules?.includes('SECRETO') && coachView.roles.length === 3, 'Entrenador (settings perm) receives rules and roles')
check(!JSON.stringify(coachView).includes('pin_hash'), 'role list never includes PIN hashes')

const ana = capView.members.find((m) => m.name === 'Ana').id
const luis = capView.members.find((m) => m.name === 'Luis').id
const late = capView.catalog.find((c) => c.reason === 'Llegar tarde').id

// --- impose
const f1 = await rpc('impose_fine', { p_token: cap.token, p_member_id: ana, p_catalog_id: late, p_amount: 7.5 })
const f2 = await rpc('impose_fine', { p_token: cap.token, p_member_id: ana, p_catalog_id: late, p_amount: 5 })
const f3 = await rpc('impose_fine', { p_token: coach, p_member_id: luis, p_catalog_id: late, p_amount: 10 })
check(!f1.error && !f2.error && !f3.error, 'Capitán and Entrenador can impose fines (custom amount)')
const tesImpose = await rpc('impose_fine', { p_token: tes.token, p_member_id: ana, p_catalog_id: late, p_amount: 5 })
check(tesImpose.error?.code === '42501', 'Tesorero cannot impose fines (42501)')
const forged = await rpc('impose_fine', { p_token: 'forged', p_member_id: ana, p_catalog_id: late, p_amount: 5 })
check(forged.error?.code === '28000', 'forged session token is rejected')

let pv = (await rpc('get_public_team', { p_slug: slug })).data
check(pv.debtors.length === 2 && Number(pv.debtors[0].pending_total) === 12.5 && pv.debtors[0].fines.length === 2, 'public view lists debtors with fine detail')

// --- pay
const capPay = await rpc('mark_fine_paid', { p_token: cap.token, p_fine_id: f1.data })
check(capPay.error?.code === '42501', 'Capitán cannot mark as paid')
const pay = await rpc('mark_fine_paid', { p_token: tes.token, p_fine_id: f3.data })
check(!pay.error, 'Tesorero marks Luis’s fine as paid')
pv = (await rpc('get_public_team', { p_slug: slug })).data
check(pv.debtors.length === 1 && pv.debtors[0].name === 'Ana' && Number(pv.total_collected) === 10, 'Luis disappears from pending; Total Recaudado = 10 €')
const hist = (await rpc('get_private_team', { p_token: coach })).data.history
check(hist.find((h) => h.id === f3.data)?.status === 'paid', 'paid fine is kept in history with status=paid')

// --- void (borrar historial)
const tesVoid = await rpc('void_fine', { p_token: tes.token, p_fine_id: f2.data })
check(tesVoid.error?.code === '42501', 'Tesorero cannot borrar historial')
const v = await rpc('void_fine', { p_token: coach, p_fine_id: f2.data })
pv = (await rpc('get_public_team', { p_slug: slug })).data
check(!v.error && Number(pv.debtors[0].pending_total) === 7.5, 'Entrenador voids a fine; pending total drops')

// --- settings
const capSettings = await rpc('update_team_settings', { p_token: cap.token, p_patch: { rules: 'hack' } })
check(capSettings.error?.code === '42501', 'Capitán cannot edit settings')
await rpc('update_team_settings', { p_token: coach, p_patch: { primary_color: '#123456', rules: 'Nuevas normas' } })
pv = (await rpc('get_public_team', { p_slug: slug })).data
check(pv.primary_color === '#123456', 'Entrenador updates team colors')

// --- cross-tenant isolation
const other = (await rpc('create_team', { p_payload: payload(`Otro ${suffix}`, '1111') })).data
const otherView = (await rpc('get_private_team', { p_token: other.token })).data
const otherMember = otherView.members[0].id
const otherFine = await rpc('impose_fine', { p_token: other.token, p_member_id: otherMember, p_catalog_id: otherView.catalog[0].id, p_amount: 3 })
const xPay = await rpc('mark_fine_paid', { p_token: tes.token, p_fine_id: otherFine.data })
check(!!xPay.error, 'a role cannot pay a fine of another team')
const xImpose = await rpc('impose_fine', { p_token: cap.token, p_member_id: otherMember, p_catalog_id: late, p_amount: 3 })
check(!!xImpose.error, 'a role cannot fine a member of another team')
const samePinOtherTeam = (await rpc('open_session', { p_slug: other.slug, p_pin: '2222' })).data
check(samePinOtherTeam.ok && samePinOtherTeam.role.name === 'Capitán', 'same PIN in another team opens only that team')

// --- PIN brute-force throttle
for (let i = 0; i < 10; i++) await rpc('open_session', { p_slug: other.slug, p_pin: String(1000 + i) })
const locked = await rpc('open_session', { p_slug: other.slug, p_pin: '1111' })
check(locked.error?.code === '54000', 'after 10 failed PINs the team is temporarily locked')

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
