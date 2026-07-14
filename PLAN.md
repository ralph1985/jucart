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

- [x] Instalar y configurar `vite-plugin-pwa`.
- [x] Crear el manifest.
- [x] Añadir iconos provisionales mínimos.
- [x] Configurar el Service Worker.
- [x] Cachear el shell de la aplicación.
- [x] Verificar que abre sin conexión después de una primera carga con conexión.
- [x] Verificar que los datos locales pueden modificarse sin conexión.
- [x] Comprobar que puede instalarse.

## Hito 4 — Revisión del MVP

- [x] Revisar accesibilidad.
- [x] Revisar usabilidad móvil.
- [x] Revisar estados vacíos y errores.
- [x] Revisar el tamaño de los controles táctiles.
- [x] Ejecutar todas las comprobaciones.
- [x] Actualizar README y PLAN.

## Hito 5 — Edición básica

- [x] Permitir editar el nombre de un producto.
- [x] Permitir mover un producto a otra sección.
- [x] Mantener las mismas reglas de textos vacíos, espacios y duplicados.
- [x] Conservar el estado comprado o pendiente al editar.
- [x] Persistir automáticamente los cambios editados.
- [x] Añadir tests de la lógica de edición.
- [x] Añadir test de edición desde la interfaz.
- [x] Verificar typecheck, lint, formato, tests y build.

## Hito 6 — Autor del alta

- [x] Definir las personas disponibles: Rafa y Begoña.
- [x] Añadir un selector básico de persona al formulario de alta.
- [x] Guardar quién ha añadido cada producto.
- [x] Mostrar quién añadió cada producto en la tarjeta.
- [x] Mantener compatibilidad con productos guardados antes de este campo.
- [x] Añadir tests razonables del nuevo campo.

## Hito 7 — Alta más rápida

- [x] Recordar la última sección seleccionada.
- [x] Recordar la última persona seleccionada.
- [x] Mantener el foco en el campo de producto después de añadir.
- [x] Mantener la app en una sola pantalla.
- [x] Añadir tests razonables del flujo de alta rápida.

## Hito 8 — Limpieza rápida de lista

- [x] Añadir una acción para borrar productos comprados.
- [x] Pedir confirmación antes de borrar varios productos.
- [x] Mantener los productos pendientes intactos.
- [x] Persistir automáticamente la limpieza.
- [x] Añadir tests razonables de la limpieza.

## Hito 9 — Compra en tienda

- [x] Mostrar los productos pendientes antes que los comprados en cada sección.
- [x] Mantener el orden relativo dentro de pendientes y comprados.
- [x] Diferenciar visualmente los productos comprados.
- [x] Añadir un separador cuando una sección mezcle pendientes y comprados.
- [x] Añadir tests razonables del orden de compra.

## Hito 10 — Navegación de secciones

- [x] Marcar visualmente la sección seleccionada en el tablero.
- [x] Sincronizar el selector superior al seleccionar una columna.
- [x] Desplazar el tablero móvil al cambiar la sección en el selector.
- [x] Actualizar el selector al cambiar la sección desde el tablero.
- [x] Añadir tests razonables de sincronización.

## Hito 11 — Interfaz compacta

- [x] Cambiar las acciones de tarjeta a botones con iconos.
- [x] Cambiar la acción de borrar comprados a botón con icono.
- [x] Mantener nombres accesibles para lectores de pantalla y tests.
- [x] Mantener tamaños táctiles mínimos.

## Hito 12 — Alta compacta

- [x] Compactar la zona de alta.
- [x] Mostrar sección y persona antes del producto.
- [x] Dejar el nombre del producto como último campo.
- [x] Mantener el alta por Enter desde el campo de producto.
- [x] Añadir test del orden del formulario.

## Hito 13 — Deshacer borrado

- [x] Permitir deshacer el último producto borrado.
- [x] Permitir deshacer la última limpieza de comprados.
- [x] Restaurar los productos sin duplicarlos si ya existen.
- [x] Mantener una sola oportunidad de deshacer.
- [x] Añadir tests razonables de deshacer.

## Hito 14 — Animaciones de navegación

- [x] Instalar Anime.js.
- [x] Animar la entrada inicial del tablero.
- [x] Animar el cambio de sección seleccionada.
- [x] Animar el desplazamiento horizontal del tablero móvil.
- [x] Animar altas, deshacer y pulsaciones de botones.
- [x] Respetar `prefers-reduced-motion`.

## Hito 15 — Pulido UX 2026

- [x] Añadir resumen visible de pendientes y comprados.
- [x] Agrupar el alta y la limpieza en un panel superior.
- [x] Modernizar paleta, superficies, sombras y estados.
- [x] Mejorar la legibilidad de columnas y tarjetas.
- [x] Mantener la interfaz en una sola pantalla.

## Hito 16 — Modo compra rápido

- [x] Permitir tocar una tarjeta para marcarla como comprada.
- [x] Permitir tocar una tarjeta comprada para devolverla a pendiente.
- [x] Mantener editar y borrar como acciones separadas.
- [x] Evitar que editar o borrar cambien el estado comprado.
- [x] Añadir tests razonables de la interacción.

## Hito 17 — Supabase remoto

- [x] Instalar Supabase CLI como dependencia de desarrollo.
- [x] Inicializar configuración de Supabase.
- [x] Crear la primera migración para `shopping_items`.
- [x] Preparar variables de entorno de ejemplo para proyecto remoto.
- [x] Añadir scripts para login, link y publicar migraciones.
- [x] Documentar el flujo remoto.
- [x] Crear el proyecto remoto en Supabase.
- [x] Enlazar el repo con el proyecto remoto.
- [x] Publicar la migración en Supabase remoto.
- [x] Conectar la interfaz a Supabase.
- [x] Mantener Dexie como fallback local durante la transición.
- [x] Añadir tests razonables del adaptador Supabase.
- [x] Suscribirse a Realtime para refrescar cambios remotos.
