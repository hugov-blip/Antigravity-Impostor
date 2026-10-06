// Browser end-to-end run of the whole product: wizard → impose → public view → per-role PIN access → pay → settings → void.
// Usage: npm run dev (in another terminal), then: node scripts/e2e-demo.mjs
//   BASE_URL=http://localhost:5173  HEADLESS=0  SLOW_MO=150  SCREENSHOT_DIR=./e2e-screenshots
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const SHOTS = process.env.SCREENSHOT_DIR
const headless = process.env.HEADLESS !== '0'
const pace = headless ? 0 : Number(process.env.PAUSE ?? 900)

const logoPath = join(tmpdir(), 'escudo-e2e.svg')
writeFileSync(
  logoPath,
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><path d="M200 20 370 80 340 300 200 380 60 300 30 80Z" fill="#0f766e"/><path d="M200 60 330 105 305 280 200 340 95 280 70 105Z" fill="#facc15"/><circle cx="200" cy="200" r="62" fill="#0f766e"/><text x="200" y="222" font-family="sans-serif" font-size="64" font-weight="700" fill="#facc15" text-anchor="middle">H</text></svg>',
)
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL ?? 'chrome',
  headless,
  slowMo: headless ? 0 : Number(process.env.SLOW_MO ?? 120),
  args: headless ? [] : ['--window-size=410,790', '--window-position=430,0', '--app=about:blank'],
})
const context = await browser.newContext({ viewport: { width: 400, height: 740 }, locale: 'es-ES' })
const page = await context.newPage()
page.on('dialog', (d) => d.accept())

let step = 0
const pause = (ms = pace) => page.waitForTimeout(ms)
const shot = async (name, fullPage = true) => {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${String(++step).padStart(2, '0')}-${name}.png`), fullPage })
}
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`)
  console.log(`✓ ${msg}`)
}
const text = () => page.locator('body').innerText()
const enterPin = async (pin) => {
  await page.getByRole('button', { name: /Acceso PIN/ }).click()
  await pause(400)
  await page.keyboard.type(pin, { delay: 120 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByText('Conectado como').waitFor()
}
const logout = async () => {
  await page.getByRole('button', { name: 'Salir' }).click()
  await page.getByRole('button', { name: /Acceso PIN/ }).waitFor()
}
const debtor = (name) => page.getByRole('button').filter({ hasText: name }).filter({ hasText: 'pendiente' })
const tab = (name) => page.getByRole('navigation').getByRole('button', { name })
const pickOption = async (label, optionText) => {
  const select = page.getByLabel(label)
  const value = await select.locator('option', { hasText: optionText }).getAttribute('value')
  await select.selectOption(value)
}

try {
  // ---------- Wizard
  await page.goto(BASE_URL)
  await pause()
  await page.getByRole('button', { name: 'Crear mi equipo' }).click()

  await page.getByLabel('Nombre del equipo').pressSequentially('CD Los Halcones', { delay: 40 })
  await page.locator('input[type=file]').setInputFiles(logoPath)
  await page.getByLabel('Color principal (hex)').fill('#0f766e')
  await page.getByLabel('Color secundario (hex)').fill('#facc15')
  await pause()
  await shot('wizard-identidad', false)
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByRole('button', { name: 'Entrenador', exact: true }).click()
  await page.getByLabel('Tu PIN').fill('1111')
  await page.getByLabel('Repite el PIN').fill('1111')
  for (const [name, pin, perm] of [
    ['Capitán', '2222', 'Puede imponer multas'],
    ['Tesorero', '3333', 'Puede marcar como pagado'],
  ]) {
    await page.getByRole('button', { name: '+ Añadir rol' }).click()
    await page.getByLabel('Nombre del rol').fill(name)
    await page.getByLabel('PIN de acceso').fill(pin)
    await page.getByLabel(perm).check()
    await page.getByRole('button', { name: 'Añadir rol', exact: true }).click()
  }
  await pause()
  await shot('wizard-roles', false)
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.locator('textarea').pressSequentially('Los entrenadores pagan el doble.', { delay: 25 })
  await pause()
  await shot('wizard-normas-privadas', false)
  await page.getByRole('button', { name: 'Continuar' }).click()

  const memberInput = page.getByPlaceholder('Nombre (o varios separados por comas)')
  await memberInput.fill('Ana, Luis, Marta, Pablo')
  await page.locator('form', { has: memberInput }).getByRole('button', { name: 'Añadir' }).click()
  for (const s of ['Llegar tarde', 'Faltar al entrenamiento', 'Tarjeta roja']) {
    await page.getByRole('button', { name: new RegExp(`^\\+ ${s}`) }).click()
  }
  await page.getByLabel('Motivo').fill('Móvil en el vestuario')
  await page.getByLabel('Importe en euros').fill('2')
  await page.locator('form', { has: page.getByLabel('Motivo') }).getByRole('button', { name: 'Añadir' }).click()
  await page.getByText('Móvil en el vestuario').waitFor()
  await pause()
  await shot('wizard-plantilla-catalogo', false)
  await page.getByRole('button', { name: 'Crear equipo' }).click()

  await page.getByText('¡Equipo creado!').waitFor()
  const slug = new URL(page.url()).pathname.split('/').pop()
  assert(slug === 'cd-los-halcones' || slug.startsWith('cd-los-halcones-'), `team created at /t/${slug}`)
  assert((await text()).includes('Conectado como Entrenador'), 'creator is signed in as Entrenador')
  await pause()
  await shot('dashboard-equipo-creado')

  // ---------- Impose fines (Entrenador)
  await tab('Multar').click()
  for (const [who, reason, amount] of [
    ['Ana', 'Llegar tarde', '7,50'],
    ['Luis', 'Tarjeta roja', null],
    ['Ana', 'Móvil en el vestuario', null],
  ]) {
    await pickOption('Jugador', who)
    await pickOption('Motivo', reason)
    if (amount) await page.getByLabel('Importe final (€)').fill(amount)
    await pause(400)
    await page.getByRole('button', { name: 'Imponer multa' }).click()
    await page.getByText('Multa de').waitFor()
  }
  assert(!(await text()).includes('pagan el doble'), 'impose-fine view never shows the team rules')
  await shot('multar')

  // ---------- Public view
  await logout()
  await debtor('Ana').click()
  await pause()
  let body = await text()
  assert(body.includes('Ana') && body.includes('Luis') && !body.includes('Marta') && !body.includes('Pablo'), 'public view lists only players who owe money')
  assert(body.includes('9,50') && body.includes('Llegar tarde'), 'expanded row shows fine details (Ana owes 9,50 €)')
  assert(!body.includes('pagan el doble') && !body.includes('Ajustes'), 'public view hides rules and private tabs')
  await shot('vista-publica')

  // ---------- Capitán: impose only
  await enterPin('2222')
  body = await text()
  assert(body.includes('Conectado como Capitán') && body.includes('Multar') && !body.includes('Ajustes del Equipo'), 'Capitán sees Multar but not Ajustes')
  await debtor('Ana').click()
  assert((await page.getByRole('button', { name: 'Pagado' }).count()) === 0, 'Capitán has no Pagado buttons')
  await pause()
  await shot('capitan-sin-ajustes')
  await logout()

  // ---------- Tesorero: mark as paid
  await enterPin('3333')
  await debtor('Luis').click()
  await pause(500)
  await page.getByRole('button', { name: 'Pagado' }).click()
  await debtor('Luis').waitFor({ state: 'detached' })
  assert((await page.getByTestId('total-collected').innerText()).includes('10,00'), 'paid fine disappears and Total Recaudado = 10,00 €')
  await pause()
  await shot('tesorero-marca-pagado')
  await logout()

  // ---------- Entrenador: settings + history
  await enterPin('1111')
  await tab('Ajustes del Equipo').click()
  const rules = page.locator('textarea').first()
  assert((await rules.inputValue()).includes('pagan el doble'), 'Ajustes shows the private rules to the settings role')
  await rules.press('End')
  await rules.pressSequentially('\nLas multas se pagan antes de fin de mes.', { delay: 20 })
  await page.getByRole('button', { name: 'Guardar normas' }).click()
  await page.getByText('Guardado').first().waitFor()
  await pause()
  await shot('ajustes-normas')

  await tab('Historial').click()
  await page.getByText('Pagada', { exact: true }).first().waitFor()
  await page.getByRole('button', { name: 'Borrar del historial' }).first().click()
  await page.getByText('Anulada', { exact: true }).first().waitFor()
  assert(true, 'Entrenador voids a fine from the history (kept as Anulada)')
  await pause()
  await shot('historial')

  await logout()
  await pause()
  await shot('vista-publica-final')
  console.log('\nE2E OK')
} catch (e) {
  console.error(e)
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 'failure.png'), fullPage: true })
  process.exitCode = 1
} finally {
  await pause(1500)
  await browser.close()
}
