# Instrucciones Para Agentes

Jucart es una aplicación web privada para gestionar una lista de la compra personal. El objetivo principal es que añadir un producto sea más rápido que escribirlo en una pizarra de nevera.

## Prioridad E Idioma

- Trabajar en español con el usuario.
- Usar ramas y commits en inglés.
- Prioridad documental: `AGENTS.md`, `PLAN.md`, `README.md` y `docs/decisions.md`.
- Antes de ampliar alcance, comprobar el hito activo en `PLAN.md`.

## Modo Rápido Por Defecto

- Leer primero archivos probables y búsquedas concretas; no revisar todo el repo si no hace falta.
- Usar `rg` y rangos concretos antes de abrir archivos completos; no pegar salidas largas si basta un resumen.
- No leer `README.md`, memoria, lockfile, `dist`, configuración o docs amplias salvo relación directa con la tarea.
- No activar revisiones transversales por defecto.
- Mantener la app en una sola pantalla mientras `PLAN.md` no indique lo contrario.
- No crear carpetas vacías ni capas como `services`, `hooks`, `utils`, `features`, `models` o `db` sin una responsabilidad actual.
- No actualizar documentación salvo que cambien uso, scripts, arquitectura, decisiones estables o estado de hitos.

## Estado Técnico Actual

- Stack: React, TypeScript, Vite, SCSS Modules, Dexie, Supabase, `vite-plugin-pwa`, Anime.js, Embla Carousel, Vitest, React Testing Library, ESLint, Prettier y pnpm.
- Entrada de la app: `src/main.tsx`.
- Pantalla principal: `src/App.tsx`.
- Lógica local de productos: `src/shoppingItems.ts`.
- Persistencia local y caché IndexedDB/Dexie: `src/shoppingItemsDb.ts`.
- Persistencia remota Supabase y Realtime: `src/shoppingItemsSupabase.ts`.
- Migraciones Supabase: `supabase/migrations/*.sql`.
- Estilos globales: `src/styles/global.scss`.
- Estilos de la pantalla: `src/App.module.scss`.
- Tests: `src/*.test.ts` y `src/*.test.tsx`.

## Restricciones Técnicas

- No añadir nuevos backends, login, usuarios, rutas, Redux, Tailwind, librerías de componentes, analítica ni dependencias nuevas sin necesidad actual y permiso explícito.
- No introducir React Router mientras exista una sola pantalla.
- No implementar funciones de hitos futuros por anticipado.
- No tocar `.env` ni credenciales.
- Supabase remoto ya forma parte de la sincronización actual; no ampliar autenticación, permisos ni exposición pública sin petición explícita.
- Dexie, Supabase, `vite-plugin-pwa` y Anime.js ya forman parte del proyecto; no añadir alternativas paralelas sin necesidad actual.
- Antes de cerrar un hito, ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build`.

## Flujo Operativo Del Repo

- Supabase remoto es el flujo por defecto. No insistir en Docker ni Supabase local salvo petición explícita; los avisos de Docker tras un `supabase db push` remoto correcto son caché local de la CLI, no una tarea pendiente.
- Para inspecciones remotas, preferir `pnpm exec supabase db query --linked --output json "<sql>"` o `--output table`; no usar flags no soportados como `--query`.
- Si el usuario dice que revisará visualmente la app, no arrancar dev server solo para preview. Usar validación por comandos y revisión de código salvo petición explícita.
- Para operaciones con GitHub CLI (`gh`), usar ejecución fuera del sandbox cuando sea necesario; dentro del sandbox puede dar falsos fallos de autenticación o red.
- Los flujos de añadir y editar productos del congelador deben seguir el patrón de bottom sheet de la lista de compra, no formularios inline ni modales centrados.
- Los datos transitorios de scripts o diagnósticos deben ir a `/tmp`; los logs o informes duraderos del repo pueden ir a `var/log/` si están ignorados o previstos por el flujo.

## Selección De Agentes

- Coordinación normal: `coordinator`.
- Revisión final completa o bloqueante: `qa_final_reviewer`.
- Configuración de agentes o instrucciones: revisar `AGENTS.md`, `.codex/config.toml` y `.codex/agents/*.toml`.
- Invocar `qa_final_reviewer` solo en cierre de hito, revisión bloqueante, cambios grandes, persistencia/Supabase/PWA, exposición pública o petición explícita.
- En cambios pequeños, aplicar las reglas de validación de este documento sin lanzar agentes extra por defecto.

No crear agentes especializados de SEO, contenido, seguridad CSP, enlaces o rendimiento hasta que exista una necesidad real. Jucart es una app privada sin SEO ni contenido público.

## Git

- Revisar `git status --short --branch` antes de modificar y antes de commitear.
- Respetar cambios locales ajenos.
- Usar rutas explícitas en `git add`; evitar `git add .`, `git add -A` y `git add --all`.
- Commits pequeños con Conventional Commits.
- No hacer push, merge ni abrir PR salvo petición explícita.
- Las operaciones que escriben en `.git` pueden necesitar permisos escalados por restricciones del sandbox.

## Validación

- Cambios de producto: ejecutar la validación completa.
- Cambios solo documentales o de agentes: validar formato/TOML cuando aplique y usar `git diff --check`; no ejecutar build si no aporta valor.
- No ocultar fallos ni desactivar reglas para que pasen comprobaciones sin una razón técnica clara.

## Resumen Final

Al cerrar una tarea sustancial, incluir:

```txt
Rama:
Commits:
Archivos tocados:
Checks:
Notas:
Siguiente tarea:
```
