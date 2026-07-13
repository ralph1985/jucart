# Jucart

Jucart es una aplicación web privada y sencilla para gestionar una lista de la compra de uso personal.

El objetivo del MVP es que añadir un producto sea más rápido que escribirlo en la pizarra de la nevera: abrir la aplicación, escribir el producto, pulsar Enter y cerrar.

## Principios

- Mobile first.
- Offline first.
- Una única pantalla.
- Secciones fijas por tienda: Alcampo, Día, Mercadona, Farmacia y General.
- Tablero por columnas, con desplazamiento lateral en móvil.
- Código sencillo de entender y modificar.
- Sin backend, login, usuarios ni sincronización entre dispositivos en el MVP.
- Sin Tailwind, Redux, React Router ni librerías de componentes mientras no exista una necesidad real.

## Stack inicial

- React.
- TypeScript.
- Vite.
- SCSS Modules.
- Dexie.
- `vite-plugin-pwa`.
- Vitest.
- React Testing Library.
- ESLint.
- Prettier.
- pnpm.

## Scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm supabase:start
pnpm supabase:status
pnpm supabase:db:reset
pnpm supabase:db:push
pnpm supabase:stop
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:watch
```

## Desarrollo

Supabase local necesita Docker o un runtime compatible disponible en la máquina.

```bash
pnpm install
cp .env.example .env.local
pnpm supabase:start
pnpm dev
```

Supabase Studio local queda disponible en `http://127.0.0.1:54323`.
El comando `pnpm supabase:status` muestra la URL local y la `anon key` que debe copiarse a `.env.local`.

Para aplicar el esquema local desde cero:

```bash
pnpm supabase:db:reset
```

Para subir las migraciones a un proyecto remoto, primero enlaza el proyecto con `pnpm supabase link --project-ref <project-ref>` y después ejecuta:

```bash
pnpm supabase:db:push
```

## Estado

El MVP tiene completados los hitos 0, 1, 2, 3 y 4: inicialización, lista local, persistencia local, PWA/offline y revisión final.

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

El Hito 16 hace más rápido el modo compra: tocar una tarjeta alterna entre pendiente y comprado.

El Hito 17 inicia la transición a Supabase: añade configuración local, migración de `shopping_items`, variables de entorno y scripts para trabajar primero en local y publicar después.
