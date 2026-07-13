# PLAN

## Hito 0 — Inicialización

- [x] Crear el proyecto con Vite, React y TypeScript.
- [x] Configurar pnpm.
- [x] Configurar SCSS Modules.
- [x] Configurar ESLint.
- [x] Configurar Prettier.
- [x] Configurar Vitest.
- [x] Configurar React Testing Library.
- [x] Añadir un script explícito de comprobación de tipos.
- [x] Crear una pantalla mínima con el nombre Jucart.
- [x] Añadir un test básico de renderizado.
- [x] Verificar typecheck, lint, tests y build.

## Hito 1 — Lista local

- [x] Definir el modelo mínimo de producto.
- [x] Decidir y documentar el tratamiento de textos vacíos, espacios y duplicados.
- [x] Añadir productos.
- [x] Mostrar productos pendientes y comprados.
- [x] Cambiar su estado.
- [x] Eliminar productos.
- [x] Añadir tests de la lógica principal.
- [x] Organizar los productos en columnas fijas por tienda.
- [x] Adaptar la vista a tablero tipo Trello con desplazamiento lateral en móvil.

## Hito 2 — Persistencia local

- [x] Instalar e integrar Dexie.
- [x] Crear la base de datos IndexedDB.
- [x] Guardar los cambios automáticamente.
- [x] Recuperar los datos al iniciar.
- [x] Gestionar errores básicos de almacenamiento.
- [x] Añadir tests razonables de persistencia.

## Hito 3 — PWA y funcionamiento offline

- [ ] Instalar y configurar `vite-plugin-pwa`.
- [ ] Crear el manifest.
- [ ] Añadir iconos provisionales mínimos.
- [ ] Configurar el Service Worker.
- [ ] Cachear el shell de la aplicación.
- [ ] Verificar que abre sin conexión después de una primera carga con conexión.
- [ ] Verificar que los datos locales pueden modificarse sin conexión.
- [ ] Comprobar que puede instalarse.

## Hito 4 — Revisión del MVP

- [ ] Revisar accesibilidad.
- [ ] Revisar usabilidad móvil.
- [ ] Revisar estados vacíos y errores.
- [ ] Revisar el tamaño de los controles táctiles.
- [ ] Ejecutar todas las comprobaciones.
- [ ] Actualizar README y PLAN.
