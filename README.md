# Jucart

Jucart es una aplicación web privada y sencilla para gestionar la compra de uso personal.

El objetivo principal es que añadir un producto sea más rápido que escribirlo en la pizarra de la nevera: abrir la aplicación, escribir el producto, pulsar Enter y cerrar.

## Principios

- Mobile first.
- Offline first.
- Navegación interna simple, sin rutas.
- Listas configurables para organizar la compra por tienda o contexto.
- Tablero por columnas, con desplazamiento lateral en móvil.
- Código sencillo de entender y modificar.
- Supabase remoto para sincronización personal entre dispositivos.
- Sin login, usuarios, rutas públicas ni permisos complejos mientras siga siendo una app privada.
- Sin Tailwind, Redux, React Router ni librerías de componentes mientras no exista una necesidad real.

## Stack

- React.
- TypeScript.
- Vite.
- SCSS Modules.
- Dexie.
- Supabase.
- `vite-plugin-pwa`.
- Anime.js.
- Embla Carousel.
- Vitest.
- React Testing Library.
- Playwright.
- ESLint.
- Prettier.
- pnpm.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm backup:supabase
pnpm backup:supabase:cron:install
pnpm recategorize:codex
pnpm recategorize:codex:cron:install
pnpm supabase:login
pnpm supabase:link
pnpm supabase:db:push
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:watch
```

Los scripts E2E fuerzan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_SUPABASE_LIST_ID` vacías durante el build para probar el fallback local sin tocar Supabase remoto.

El hook `pre-push` vive en `.githooks/pre-push` y ejecuta `pnpm test:e2e`. En este checkout se activa con:

```bash
git config core.hooksPath .githooks
```

## Desarrollo

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Supabase remoto

Jucart usa un proyecto Supabase remoto para sincronizar la lista entre los teléfonos de uso personal.

1. Crear un proyecto en Supabase.
2. Copiar `Project URL` y `anon public key` a `.env.local`.
3. Elegir un `VITE_SUPABASE_LIST_ID` UUID fijo para la lista compartida.
4. Iniciar sesión con la CLI:

```bash
pnpm supabase:login
```

5. Enlazar el repo al proyecto remoto:

```bash
pnpm supabase:link --project-ref <project-ref>
```

6. Subir las migraciones:

```bash
pnpm supabase:db:push
```

7. Configurar secrets de notificaciones push cuando se use Web Push:

```bash
pnpm exec supabase secrets set \
  JUCART_PUSH_TRIGGER_SECRET="..." \
  PUSH_VAPID_PUBLIC_KEY="..." \
  PUSH_VAPID_PRIVATE_KEY="..." \
  PUSH_VAPID_SUBJECT="mailto:jucart@conquense.dev"
```

8. Guardar el mismo valor de `JUCART_PUSH_TRIGGER_SECRET` en Supabase Vault con el nombre `jucart_push_trigger_secret`. El trigger SQL lo usa para invocar la Edge Function sin exponer la clave VAPID ni el service role.

9. Desplegar Edge Functions:

```bash
pnpm supabase:functions:deploy send-push-notification
```

El esquema remoto y la copia local IndexedDB están documentados en [`docs/database-schema.md`](docs/database-schema.md).

## Backup local de Supabase

El backup se hace desde la máquina local de Rafa contra el proyecto Supabase remoto. No levanta Supabase local ni Docker.

Ejecutar una copia manual:

```bash
pnpm backup:supabase
```

El script guarda un archivo comprimido local en `var/backups/supabase/` con `schema.sql`, `data.sql` y `manifest.txt`. Esa carpeta está ignorada por Git para que las copias no se suban al repositorio. También calcula tamaño y `sha256`, conserva las copias de los últimos 14 días y registra metadatos del resultado en Supabase para la vista interna de desarrollador.

Instalar el cron local cada 6 horas:

```bash
pnpm backup:supabase:cron:install
```

El cron escribe su log en `var/log/supabase-backup.cron.log`. Los backups y logs locales están ignorados por Git.

## Recategorización diaria con Codex

Las categorías y el catálogo maestro viven en Supabase. Ejecutar una revisión manual:

```bash
pnpm recategorize:codex
```

El script exporta productos, categorías y catálogo remoto, lanza `codex exec` con instrucciones acotadas y permite aplicar cambios directos solo mediante el helper de recategorización. Cada ejecución y cada cambio de categoría quedan registrados en Supabase para verse en la pestaña `Categorías` de Historial. Los informes y logs se guardan en `var/log/`.

Instalar el cron diario a las 03:00:

```bash
pnpm recategorize:codex:cron:install
```

## Estado

Jucart mantiene una sola aplicación sin rutas, con tablero de compra, gestión de listas, historial de cambios, sincronización remota y fallback local.

Los hitos 0 a 4 cubren inicialización, lista local, persistencia local, PWA/offline y revisión del MVP.

El Hito 5 añade edición básica de productos: cambiar nombre y mover productos entre secciones sin salir de la pantalla principal.

El Hito 6 añade un selector básico para guardar si cada producto lo ha añadido Rafa o Begoña.

El Hito 7 mejora la rapidez del alta: recuerda la última sección y persona seleccionadas, y mantiene el foco en el campo de producto después de añadir.

El Hito 8 añade una limpieza rápida para borrar los productos comprados con confirmación, manteniendo intactos los pendientes.

El Hito 9 mejora el uso durante la compra: muestra primero los pendientes dentro de cada sección y separa visualmente los comprados.

El Hito 10 sincroniza el selector de sección con el tablero: marca la columna seleccionada y desplaza el tablero móvil al cambiar de sección.

El Hito 11 compacta la interfaz usando iconos en las acciones de productos y limpieza, sin perder nombres accesibles.

El Hito 12 compacta la zona de alta y deja el nombre del producto como último campo del formulario.

El Hito 13 añade deshacer para el último borrado de producto o limpieza de comprados.

El Hito 14 añade Anime.js para animar navegación, altas, deshacer y feedback de botones respetando reducción de movimiento.

El Hito 15 pule la experiencia visual con resumen de lista, panel superior compacto y un tablero más moderno y legible.

El Hito 16 hace más rápido el modo compra: tocar el check de una tarjeta alterna entre pendiente y comprado.

El Hito 17 inicia la transición a Supabase remoto: añade configuración, migración de `shopping_items`, variables de entorno y scripts para publicar el esquema en el proyecto remoto.
La interfaz usa Supabase cuando `.env.local` tiene URL, key y `list_id`; si no están configurados o Supabase falla, Dexie mantiene la lista local como fallback. Realtime refresca la lista cuando otro dispositivo cambia productos.

El Hito 18 endurece la sincronización con un estado visible y evita guardar de vuelta justo después de cargar datos.

El Hito 19 hace que Jucart se sienta más como una aplicación instalada: cabecera fija, logo compacto y menú inferior para acciones principales.

El Hito 20 añade gestión de listas desde el menú inferior: crear, renombrar, elegir color, reordenar y borrar listas vacías. Las listas con productos no se pueden borrar. Las listas se guardan en IndexedDB y se sincronizan con Supabase junto con los productos.

El Hito 21 agrupa los productos por categoría dentro de cada lista. La categoría se infiere automáticamente desde un catálogo maestro inicial de productos y se guarda junto con cada producto.

El Hito 22 añade un historial auditado de altas, compras, cambios de lista y borrados. El historial guarda snapshots de cada producto, se sincroniza con Supabase y avisa cuando otro dispositivo ha realizado cambios pendientes de revisar.

El Hito 23 añade backup local de Supabase y una vista interna de desarrollador. La vista solo aparece cuando el selector de persona está en Rafa y muestra metadatos del último backup junto con información operativa de la app.

El Hito 24 añade sugerencias rápidas bajo el campo de producto cuando se empieza a escribir. Las sugerencias combinan catálogo, productos existentes e historial reciente, se filtran mientras se escribe y evitan sugerir productos ya presentes en el tablero.

El Hito 27 mueve categorías y catálogo maestro a Supabase, mantiene fallback local y añade la recategorización diaria con Codex desde cron.

El Hito 28 añade auditoría de recategorizaciones y una pestaña `Categorías` dentro de Historial para ver qué productos se han movido de categoría.

El Hito 29 añade tests E2E con Playwright sobre Chromium para validar la app construida con Vite en navegador real. La primera capa cubre arranque local, alta y compra de productos, persistencia local tras recarga y alta de productos congelados.
