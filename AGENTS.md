# Instrucciones Para Agentes

Jucart es una aplicación web privada para gestionar una lista de la compra personal. El objetivo principal es que añadir un producto sea más rápido que escribirlo en una pizarra de nevera.

## Prioridad E Idioma

- Trabajar en español con el usuario.
- Usar ramas y commits en inglés.
- Prioridad documental: `AGENTS.md`, `PLAN.md`, `README.md` y `docs/decisions.md`.
- Antes de ampliar alcance, comprobar el hito activo en `PLAN.md`.

## Modo Rápido Por Defecto

- Leer primero archivos probables y búsquedas concretas; no revisar todo el repo si no hace falta.
- No activar revisiones transversales por defecto.
- Mantener la app en una sola pantalla mientras `PLAN.md` no indique lo contrario.
- No crear carpetas vacías ni capas como `services`, `hooks`, `utils`, `features`, `models` o `db` sin una responsabilidad actual.
- No actualizar documentación salvo que cambien uso, scripts, arquitectura, decisiones estables o estado de hitos.

## Estado Técnico Actual

- Stack: React, TypeScript, Vite, SCSS Modules, Dexie, Supabase, `vite-plugin-pwa`, Anime.js, Vitest, React Testing Library, ESLint, Prettier y pnpm.
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

## Selección De Agentes

- Coordinación normal: `coordinator`.
- Revisión final completa o bloqueante: `qa_final_reviewer`.
- Configuración de agentes o instrucciones: revisar `AGENTS.md`, `.codex/config.toml` y `.codex/agents/*.toml`.
- QA de hito antes de commit o cierre: aplicar las reglas de validación de este documento.

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
