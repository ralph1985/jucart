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

- [x] Permitir tocar el check de una tarjeta para marcarla como comprada.
- [x] Permitir tocar el check de una tarjeta comprada para devolverla a pendiente.
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

## Hito 18 — Endurecimiento de sincronización

- [x] Mostrar estado discreto de sincronización.
- [x] Evitar guardado automático inmediatamente después de la carga inicial.
- [x] Diferenciar Supabase remoto, local puro y fallback local.

## Hito 19 — Estructura de aplicación

- [x] Mantener la cabecera visible durante el uso.
- [x] Añadir un logo compacto en la cabecera.
- [x] Añadir menú inferior para acciones principales.
- [x] Mantener navegación interna sin rutas.

## Hito 20 — Gestión de listas

- [x] Añadir una pantalla accesible desde el menú inferior para gestionar listas.
- [x] Permitir dar de alta nuevas listas.
- [x] Permitir renombrar listas existentes.
- [x] Permitir elegir color para cada lista.
- [x] Permitir reordenar listas.
- [x] Permitir borrar listas vacías.
- [x] Impedir borrar listas con productos.
- [x] Persistir las listas en IndexedDB.
- [x] Sincronizar las listas con Supabase remoto.
- [x] Mantener compatibilidad con las listas iniciales.
- [x] Añadir tests razonables de lógica, persistencia e interfaz.

## Hito 21 — Categorías de productos

- [x] Definir categorías de compra ordenadas.
- [x] Añadir un catálogo maestro inicial de productos.
- [x] Inferir categoría al añadir un producto.
- [x] Recalcular categoría al renombrar un producto.
- [x] Agrupar productos por categoría dentro de cada lista.
- [x] Mantener pendientes antes que comprados.
- [x] Persistir categoría en IndexedDB.
- [x] Sincronizar categoría con Supabase remoto.
- [x] Mantener compatibilidad con productos antiguos sin categoría.
- [x] Añadir tests razonables de catálogo, persistencia y agrupación.

## Hito 22 — Historial y cambios remotos

- [x] Registrar eventos de productos añadidos, comprados, devueltos a pendiente, movidos de lista y borrados.
- [x] Crear eventos iniciales para productos existentes cuando no haya historial previo.
- [x] Guardar snapshots completos de los productos en cada evento de historial.
- [x] Persistir el historial en IndexedDB.
- [x] Sincronizar el historial con Supabase remoto.
- [x] Añadir una vista interna de Historial desde el menú inferior.
- [x] Mostrar solo eventos de los últimos 30 días en la vista.
- [x] Generar un identificador local por dispositivo.
- [x] Avisar con un banner cuando lleguen cambios de otro dispositivo.
- [x] Permitir revisar los cambios remotos no vistos y marcarlos como vistos en ese dispositivo.
- [x] Añadir tests razonables de lógica, persistencia, Supabase e interfaz.

## Hito 23 — Backup local de Supabase y vista dev

- [x] Crear una migración para registrar metadatos de backups.
- [x] Añadir un script de backup SQL completo de Supabase remoto.
- [x] Añadir un script para instalar el cron local cada 6 horas.
- [x] Conservar backups locales durante 14 días.
- [x] Registrar en Supabase el último resultado del backup.
- [x] Añadir una vista interna de desarrollador visible solo para Rafa.
- [x] Mostrar estado de backup e información operativa útil.
- [x] Documentar ejecución manual, cron, retención y ubicación local.
- [x] Añadir tests razonables de adaptador e interfaz.

## Hito 24 — Alta por sugerencias rápidas

- [x] Mostrar sugerencias rápidas de productos habituales bajo el alta.
- [x] Usar catálogo maestro, productos existentes e historial para priorizar sugerencias.
- [x] Filtrar sugerencias al escribir en el campo de producto.
- [x] Evitar sugerir productos ya existentes en el tablero.
- [x] Permitir añadir una sugerencia con un toque usando la sección y persona seleccionadas.
- [x] Registrar historial igual que en el alta manual.
- [x] Mantener una sola pantalla y no añadir dependencias nuevas.
- [x] Añadir tests razonables de lógica e interfaz.

## Hito 25 — Cantidades opcionales

- [x] Permitir añadir cantidades inline sin añadir campos al alta rápida.
- [x] Evitar interpretar números ambiguos como cantidades.
- [x] Mostrar la cantidad en la tarjeta solo cuando exista.
- [x] Permitir editar o borrar la cantidad desde el modal de edición.
- [x] Persistir cantidad en IndexedDB y Supabase remoto.
- [x] Mantener compatibilidad con productos e historial sin cantidad.
- [x] Añadir tests razonables de lógica, persistencia, Supabase e interfaz.

## Hito 26 — Congelador

- [x] Añadir una vista nueva de congelador en la navegación principal.
- [x] Gestionar tres cajones fijos: Arriba, Medio y Abajo.
- [x] Añadir productos congelados con cantidad opcional y fecha de congelación.
- [x] Mostrar primero los productos más antiguos para planificar comidas.
- [x] Permitir editar productos y moverlos entre cajones.
- [x] Permitir marcar productos como usados con deshacer inmediato.
- [x] Persistir el congelador en IndexedDB y Supabase remoto.
- [x] Añadir tests razonables de lógica, persistencia, Supabase e interfaz.

## Hito 27 — Catálogo remoto de categorías

- [x] Mover categorías y catálogo maestro a Supabase.
- [x] Mantener fallback local para uso offline o fallo remoto.
- [x] Inferir categorías desde el catálogo remoto al añadir y renombrar.
- [x] Agrupar productos usando el orden remoto de categorías.
- [x] Añadir automatización diaria con Codex para recategorizar productos.
- [x] Añadir script instalador de cron a las 03:00.
- [x] Actualizar backup y documentación del esquema.

## Hito 28 — Historial de recategorizaciones

- [x] Registrar ejecuciones de recategorización en Supabase.
- [x] Registrar cambios de categoría producto a producto.
- [x] Cachear el historial de recategorizaciones en IndexedDB.
- [x] Mostrar pestañas de cambios y categorías en la vista Historial.
- [x] Incluir el historial de recategorización en backups.
- [x] Añadir tests razonables de Supabase e interfaz.

## Hito 29 — Tests E2E

- [x] Instalar Playwright como dependencia de desarrollo.
- [x] Configurar ejecución E2E con Chromium sobre `vite preview`.
- [x] Añadir smoke local de arranque y navegación principal.
- [x] Añadir flujo E2E de alta, compra y vuelta a pendiente.
- [x] Añadir comprobación de persistencia local tras recarga.
- [x] Añadir flujo E2E de alta de producto congelado desde bottom sheet.
- [x] Añadir flujos E2E de crear y gestionar listas.
- [x] Añadir flujos E2E de borrar con deshacer, editar producto e historial.
- [x] Ejecutar los E2E en `pre-push`.

## Hito 30 — Notificaciones push de cambios remotos

Objetivo: permitir que la PWA avise cuando otro dispositivo haga cambios relevantes en Jucart, incluso si la app no está abierta.

### Fase 1 — Diseño y claves Web Push

- [x] Generar un par de claves VAPID para Web Push.
- [x] Guardar la clave pública en `VITE_PUSH_VAPID_PUBLIC_KEY`.
- [x] Guardar la clave privada como secret de Supabase Edge Functions.
- [x] Definir `PUSH_VAPID_SUBJECT` como contacto técnico.
- [x] Mantener las notificaciones como opt-in explícito.

### Fase 2 — Modelo de suscripciones en Supabase

- [x] Crear una migración para `push_subscriptions`.
- [x] Guardar una suscripción por dispositivo usando `list_id`, `client_id`, `endpoint`, claves `p256dh` y `auth`, `user_agent` y marcas de fecha.
- [x] Crear un índice único por `endpoint`.
- [x] Crear índices para consultar suscripciones activas por `list_id`, `client_id` y `disabled_at`.
- [x] Activar RLS sin permitir lectura pública de todos los endpoints.
- [x] Permitir desde el cliente registrar, refrescar y desactivar su propia suscripción.

### Fase 3 — Cliente PWA

- [x] Añadir un control discreto para activar o desactivar notificaciones.
- [x] Comprobar soporte de `Notification`, Service Worker y `PushManager`.
- [x] Pedir permiso solo tras interacción del usuario.
- [x] Crear la suscripción con el Service Worker registrado y la clave pública VAPID.
- [x] Persistir la suscripción en Supabase asociada al `client_id` local.
- [x] Mostrar estados discretos: no soportado, pendiente, denegado, activado y error temporal.
- [x] Permitir desactivar notificaciones con `unsubscribe()` y marcar `disabled_at` en Supabase.

### Fase 4 — Service Worker

- [x] Ampliar la configuración de `vite-plugin-pwa` para añadir lógica propia al Service Worker sin perder el precache offline actual.
- [x] Gestionar eventos `push` mostrando una notificación breve de cambios en Jucart.
- [x] Usar iconos existentes de la PWA en la notificación.
- [x] Gestionar `notificationclick` enfocando Jucart si ya está abierta o abriendo `/`.
- [x] Mantener el Service Worker sin lógica de negocio pesada.
- [ ] Evaluar si conviene actualizar App Badge al recibir un push cuando el navegador lo soporte.

### Fase 5 — Edge Function de envío

- [ ] Crear una Supabase Edge Function para enviar Web Push.
- [ ] Leer la clave privada VAPID desde secrets, nunca desde el frontend.
- [ ] Recibir un payload mínimo con `list_id`, `origin_client_id`, `title`, `body` y `url`.
- [ ] Buscar suscripciones activas de la lista.
- [ ] Excluir el `client_id` que originó el cambio.
- [ ] Enviar la notificación a cada endpoint activo.
- [ ] Marcar como deshabilitados los endpoints expirados o inválidos.
- [ ] Hacer que el envío tolere reintentos y duplicados sin romper datos.

### Fase 6 — Disparador de cambios remotos

- [ ] Lanzar el envío cuando se registren eventos relevantes en `shopping_history_events`.
- [ ] Notificar solo cambios originados por otro dispositivo.
- [ ] Usar en v1 un texto genérico y fiable: `Cambios en Jucart` y `Hay cambios nuevos en la lista`.
- [ ] No notificar en esta fase recategorizaciones automáticas, backups, estados internos ni recordatorios.
- [ ] Mantener el payload sin datos completos de productos; la app refresca Supabase al abrirse o volver a primer plano.

### Fase 7 — Validación

- [ ] Añadir tests unitarios del módulo de push para soporte, permisos, alta, baja y errores.
- [ ] Añadir tests del adaptador Supabase para registrar, refrescar y desactivar suscripciones.
- [ ] Añadir tests del Service Worker para `push` y `notificationclick`.
- [ ] Añadir tests de interfaz para el control de notificaciones y sus estados.
- [ ] Validar manualmente en HTTPS con la PWA cerrada y cambios desde otro dispositivo.
- [ ] Validar iOS/iPadOS solo con Jucart instalada en pantalla de inicio.
- [ ] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.
