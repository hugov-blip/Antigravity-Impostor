# Multas · La caja de multas de tu equipo

Micro-SaaS multi-equipo para gestionar las multas de un club deportivo. Cada club se crea con un asistente, tiene su propia URL
pública (`/t/:slug`) y sus propios roles con PIN.

Stack: Vite + React + TypeScript + Tailwind CSS v4 + Supabase (Postgres, RLS, RPCs `SECURITY DEFINER`).

## Funcionalidades

**Asistente de creación (`/crear`)**

1. Identidad: nombre, escudo (subida de imagen o URL) y colores principal/secundario aplicados a toda la UI del equipo.
2. Roles: "¿Qué rol tienes en el equipo?" crea el rol administrador (todos los permisos) con su PIN. Se pueden añadir más roles
   con nombre, PIN y permisos: imponer multas, marcar como pagado, borrar historial, modificar ajustes.
3. Normas del equipo: notas privadas, solo visibles para roles con permiso de ajustes.
4. Plantilla y catálogo de multas (motivo + importe base en €).

**Panel del equipo (`/t/:slug`)**

- Vista pública (sin PIN): escudo y colores, **Total Recaudado**, total pendiente y solo los jugadores que deben > 0 €, con filas
  desplegables (motivo, fecha, importe).
- Vista privada (PIN): el PIN identifica el rol y sus permisos.
  - **Multar**: jugador, motivo del catálogo e importe final editable. Nunca muestra las normas.
  - **Pendientes**: botón *Pagado* (permiso "marcar como pagado") y *Anular* (permiso "borrar historial").
  - **Historial**: todas las multas con su estado; anular requiere "borrar historial".
  - **Ajustes del Equipo** (permiso de ajustes): normas privadas, nombre/escudo/colores, plantilla, catálogo y roles/PINs.
- Pagar una multa la saca de pendientes y suma su importe al Total Recaudado. Nada se borra: las multas cambian de estado
  (`pending` → `paid` con `paid_at`, o `void` con `voided_at`).

## Seguridad

Todo está en [`supabase/migrations`](supabase/migrations).

- Todas las tablas (`teams`, `team_private`, `roles`, `members`, `fine_catalog`, `fines`, `role_sessions`, `pin_attempts`)
  tienen RLS activado sin políticas y privilegios revocados para `anon`/`authenticated`: con la anon key no se puede leer ni
  escribir ninguna tabla directamente.
- El cliente solo llama a funciones RPC `SECURITY DEFINER`:
  - Públicas: `create_team`, `get_public_team`, `open_session(slug, pin)`.
  - Privadas (requieren el token de sesión devuelto por `open_session`): `get_private_team`, `impose_fine`, `mark_fine_paid`,
    `void_fine`, `update_team_settings`, `save_member`, `save_catalog_item`, `save_role`, `delete_role`, `close_session`.
  - Cada RPC privada vuelve a leer los permisos del rol en el servidor y filtra por `team_id` del rol (aislamiento entre equipos).
- PINs: hash bcrypt (`pgcrypto`), únicos dentro de cada equipo, nunca se devuelven. Tokens de sesión: aleatorios de 256 bits,
  guardados como SHA-256, caducan a las 12 h y se guardan en `sessionStorage` del navegador.
- Las normas privadas viven en `team_private` y solo las devuelve `get_private_team` a roles con permiso de ajustes.
- Anti fuerza bruta: tras 10 PIN fallidos en 15 min el acceso por PIN de ese equipo se bloquea temporalmente.
- Los escudos subidos se reducen a 256 px y se guardan como data URL en `teams.logo_url` (sin bucket de Storage público).

## Puesta en marcha

### Opción A: Supabase en la nube

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica el esquema **vacío** (sin datos de ejemplo):
   - **Proyecto ya usado / SQL antiguo:** pega `supabase/reset-and-create.sql` en el SQL Editor y ejecútalo. Borra todas las tablas de la app y las recrea vacías.
   - **Proyecto nuevo:**
     ```bash
     cd multas
     npm install
     npx supabase login
     npx supabase link --project-ref <ref-del-proyecto>
     npx supabase db push
     ```
     (o pega `supabase/migrations/*.sql` en el SQL Editor).
3. `cp .env.example .env.local` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
4. `npm run dev` y abre http://localhost:5173.

### Opción B: Supabase local (Docker)

```bash
cd multas
npm install
npx supabase start          # aplica la migración automáticamente
cp .env.example .env.local  # pega API_URL y ANON_KEY que imprime el comando anterior
npm run dev
```

### Comprobaciones

```bash
npm run build      # typecheck + build de producción
npm run lint
npm run test:db    # 38 comprobaciones de la API y la seguridad contra Supabase con la anon key (crea equipos de prueba)
npm run test:e2e   # recorrido completo en Chrome con Playwright (con `npm run dev` arrancado y la BD vacía)
```

`test:e2e` admite `HEADLESS=0` (ventana visible), `BASE_URL` y `SCREENSHOT_DIR` (guarda capturas de cada paso).

### Despliegue

Es una SPA estática (`npm run build` → `dist/`). En Vercel/Netlify/Cloudflare Pages configura las variables `VITE_SUPABASE_*`
y una regla de rewrite de todas las rutas a `index.html` para que funcione `/t/:slug`.
