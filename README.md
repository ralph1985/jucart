# Jucart

Jucart es una aplicación web privada y sencilla para gestionar una lista de la compra de uso personal.

El objetivo del MVP es que añadir un producto sea más rápido que escribirlo en la pizarra de la nevera: abrir la aplicación, escribir el producto, pulsar Enter y cerrar.

## Principios

- Mobile first.
- Offline first.
- Una única pantalla.
- Código sencillo de entender y modificar.
- Sin backend, login, usuarios ni sincronización entre dispositivos en el MVP.
- Sin Tailwind, Redux, React Router ni librerías de componentes mientras no exista una necesidad real.

## Stack inicial

- React.
- TypeScript.
- Vite.
- SCSS Modules.
- Vitest.
- React Testing Library.
- ESLint.
- Prettier.
- pnpm.

Dexie y `vite-plugin-pwa` forman parte del stack previsto, pero se integrarán en los hitos donde aportan valor real: persistencia local y PWA/offline.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:watch
```

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Estado

El proyecto está en el Hito 0: inicialización del proyecto.
