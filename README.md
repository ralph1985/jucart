# Jucart

Jucart es una PWA privada para gestionar la compra personal. Está diseñada para que añadir un producto sea más rápido que escribirlo en una pizarra de nevera: abrir la aplicación, escribir, pulsar Enter y continuar.

La aplicación funciona localmente y puede sincronizar las listas entre dispositivos mediante un proyecto Supabase remoto. Cuando Supabase está configurado, el acceso requiere una sesión con email y contraseña.

## Características

- Alta rápida de productos con cantidades opcionales, autor y sugerencias.
- Listas configurables organizadas por tienda o contexto.
- Modo compra con productos pendientes y comprados.
- Historial de cambios y recategorizaciones.
- Categorías y productos canónicos mantenidos con apoyo de Codex.
- Congelador organizado por cajones, con cantidades y fecha de congelación.
- PWA instalable con soporte offline mediante IndexedDB y Service Worker.
- Sincronización remota con Supabase y actualización mediante Realtime.
- Bandeja privada de tickets y extracción nocturna de líneas y precios.
- Historial de precios y semillas externas diferenciadas por procedencia.

## Captura o demo

Jucart es una aplicación privada. La ejecución completa necesita las credenciales del proyecto Supabase y no se publica una demo abierta con datos reales.

## Stack

- React, TypeScript y Vite.
- SCSS Modules.
- Dexie e IndexedDB para persistencia local y caché.
- Supabase para autenticación, datos remotos, Storage y Realtime.
- `vite-plugin-pwa`, Anime.js y Embla Carousel.
- Vitest, React Testing Library y Playwright.
- ESLint, Prettier y pnpm.

## Requisitos

- Node.js. El workflow de GitHub Actions valida el proyecto con Node.js 24.
- Corepack y pnpm.
- Un proyecto Supabase remoto si se necesita sincronización, autenticación, tickets, precios o las tareas operativas.
- Codex instalado y autenticado únicamente para los scripts locales que procesan categorías, productos o tickets.

## Instalación y desarrollo local

```bash
git clone https://github.com/ralph1985/jucart.git
cd jucart
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Sin variables de Supabase, Jucart funciona en modo local con Dexie. Para usar el proyecto remoto, completa `.env.local` con valores del proyecto autorizado:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-remote-anon-key
VITE_SUPABASE_LIST_ID=00000000-0000-4000-8000-000000000001
```

No guardes claves privadas, contraseñas ni archivos `.env.local` en Git.

Cuando Supabase está configurado, la aplicación muestra la pantalla de acceso antes de cargar los datos. Las cuentas y permisos se gestionan en Supabase Auth y mediante las políticas remotas del proyecto.

## Arquitectura

```text
React/Vite
    ├── Dexie / IndexedDB (persistencia local y fallback)
    └── Supabase remoto (Auth, Postgres, Storage y Realtime)

Procesos locales independientes:
    backups · cron de categorías · normalización · tickets · precios externos
```

La PWA mantiene los datos locales para poder consultar y modificar la aplicación sin conexión. Supabase se utiliza cuando existe configuración remota y la sesión tiene acceso a las listas correspondientes.

El modelo remoto y su correspondencia con IndexedDB están documentados en [`docs/database-schema.md`](docs/database-schema.md). Las decisiones de producto y arquitectura están en [`docs/decisions.md`](docs/decisions.md).

## Comandos

### Desarrollo y validación

```bash
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:coverage
pnpm test:watch
pnpm test:e2e
pnpm test:e2e:headed
```

Los E2E construyen la aplicación con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_SUPABASE_LIST_ID` vacías. Así prueban el fallback local sin escribir en Supabase remoto.

El hook `pre-push` ejecuta la validación E2E. Para activarlo en este checkout:

```bash
git config core.hooksPath .githooks
```

El workflow de GitHub Actions ejecuta instalación reproducible, auditoría de dependencias, typecheck, lint, comprobación de formato, tests y build.

### Supabase remoto

```bash
pnpm supabase:login
pnpm supabase:link --project-ref <project-ref>
pnpm supabase:db:push
```

El flujo por defecto usa Supabase remoto. No es necesario levantar Docker ni una instancia local para el desarrollo habitual.

### Acciones remotas del servidor

La vista Dev puede solicitar un backup de Supabase sin exponer el servidor local. La orden se guarda en Supabase y un agente Linux la recoge mediante la Edge Function `remote-actions`.

En el servidor que ejecutará las tareas, configura `JUCART_SUPABASE_URL`, `JUCART_REMOTE_ACTION_AGENT_SECRET` con el mismo secreto guardado en Supabase y, opcionalmente, `JUCART_REMOTE_ACTION_AGENT_ID`. Después inicia el agente con:

```bash
pnpm remote-actions:agent
```

El agente solo permite acciones incluidas explícitamente en su allowlist. Para mantenerlo activo tras reinicios debe ejecutarse bajo el supervisor habitual del servidor, como systemd.

Las Edge Functions se despliegan con:

```bash
pnpm supabase:functions:deploy send-push-notification
```

Las claves VAPID y los secretos de funciones deben configurarse en Supabase Secrets/Vault, nunca en el frontend ni en el repositorio. La validación end-to-end de notificaciones push en iPhone sigue pendiente.

### Backups

```bash
pnpm backup:supabase
pnpm backup:supabase:cron:install
```

El backup se ejecuta desde la máquina local contra Supabase remoto. Genera archivos ignorados por Git en `var/backups/supabase/` y logs en `var/log/`.

El backup usa `SUPABASE_SERVICE_ROLE_KEY` únicamente desde el fichero privado indicado por `JUCART_SUPABASE_BACKUP_ENV_FILE` (por defecto, `~/.config/jucart/supabase-backup.env`). No debe usarse la clave `anon` para este proceso: las tablas privadas requieren una credencial de servidor.

### Categorías y productos con Codex

```bash
pnpm recategorize:codex
pnpm recategorize:codex:cron:install
pnpm normalize:codex
pnpm normalize:codex:cron:install
```

Estos procesos trabajan con datos exportados del proyecto remoto, aplican cambios mediante sus helpers y guardan informes y logs en `var/log/`.

### Tickets y precios

```bash
pnpm tickets:process
pnpm tickets:process:cron:install
pnpm prices:external
```

El procesamiento de tickets descarga los tickets pendientes desde el Storage privado de Supabase y utiliza Codex localmente. El script de precios externos es manual y conserva la procedencia de cada observación; no es una dependencia crítica para usar la lista.

## Estado del proyecto

La aplicación principal está implementada como una sola pantalla con navegación interna, listas, historial, congelador, tickets, precios y sincronización remota. La versión visible actual es `0.12.0`.

- Los hitos 0–29 cubren el MVP, la PWA, la sincronización, las listas, categorías, historial, congelador y pruebas E2E.
- Los hitos 31–35 cubren productos canónicos, tickets, procesamiento con Codex, historial de precios y proveedores externos.
- El Hito 30 de notificaciones push está pausado: la arquitectura existe, pero falta cerrar la validación manual en iPhone.
- Los hitos 36–37 incorporan autenticación y la migración de listas compartidas.
- Los hitos 38–42 continúan el endurecimiento de roles, aislamiento, offline autenticado, ciclo de vida de listas y actualización controlada de la PWA.

El detalle de tareas, estado y próximos pasos está en [`PLAN.md`](PLAN.md).

## Contribuir y mantener el proyecto

Antes de proponer cambios:

1. Revisa [`AGENTS.md`](AGENTS.md), [`PLAN.md`](PLAN.md) y [`docs/decisions.md`](docs/decisions.md).
2. Mantén el alcance del hito activo y evita implementar fases futuras por anticipado.
3. No incluyas secretos ni datos personales.
4. Ejecuta las comprobaciones apropiadas, especialmente:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm test
   pnpm build
   ```

5. Usa commits Conventional Commits en inglés y revisa `git diff --check`.

Las operaciones sobre Supabase remoto, backups y cron deben hacerse con especial cuidado porque afectan a los datos personales de la aplicación.

## Licencia y contacto

Jucart es una aplicación privada de uso personal. Para dudas sobre el proyecto o cambios de mantenimiento, utiliza el sistema de issues o el canal acordado por las personas mantenedoras del repositorio.
