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

Estado: pausado. La arquitectura está implementada y subida, pero la validación end-to-end en iPhone no se ha cerrado. El iPhone aceptó permiso de notificaciones, pero `push_subscriptions` seguía sin filas activas. No hay Mac/Web Inspector disponible; si se retoma, empezar por leer el resultado exacto de `Probar registro` en la vista Dev o añadir un logging remoto temporal no sensible (`push_debug_events`) sin endpoints ni claves.

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

- [x] Crear una Supabase Edge Function para enviar Web Push.
- [x] Leer la clave privada VAPID desde secrets, nunca desde el frontend.
- [x] Recibir un payload mínimo con `list_id`, `origin_client_id`, `title`, `body` y `url`.
- [x] Buscar suscripciones activas de la lista.
- [x] Excluir el `client_id` que originó el cambio.
- [x] Enviar la notificación a cada endpoint activo.
- [x] Marcar como deshabilitados los endpoints expirados o inválidos.
- [x] Hacer que el envío tolere reintentos y duplicados sin romper datos.

### Fase 6 — Disparador de cambios remotos

- [x] Lanzar el envío cuando se registren eventos relevantes en `shopping_history_events`.
- [x] Notificar solo cambios originados por otro dispositivo.
- [x] Usar en v1 un texto genérico y fiable: `Cambios en Jucart` y `Hay cambios nuevos en la lista`.
- [x] No notificar en esta fase recategorizaciones automáticas, backups, estados internos ni recordatorios.
- [x] Mantener el payload sin datos completos de productos; la app refresca Supabase al abrirse o volver a primer plano.

### Fase 7 — Validación

- [x] Añadir tests unitarios del módulo de push para soporte, permisos, alta, baja y errores.
- [x] Añadir tests del adaptador Supabase para registrar, refrescar y desactivar suscripciones.
- [x] Añadir tests del Service Worker para `push` y `notificationclick`.
- [x] Añadir tests de interfaz para el control de notificaciones y sus estados.
- [ ] Validar manualmente en HTTPS con la PWA cerrada y cambios desde otro dispositivo.
- [ ] Validar iOS/iPadOS solo con Jucart instalada en pantalla de inicio.
- [x] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Hito 31 — Productos canónicos para precios

Objetivo: crear una base estable para que el historial de precios no duplique productos por plurales, variantes de ticket o nombres externos.

- [x] Crear un modelo remoto de productos canónicos en Supabase.
- [x] Elegir como nombre canónico el nombre más habitual de compra, no forzar singular si el plural es más natural.
- [x] Preferir productos canónicos generales frente a canónicos por marca o formato, salvo que separar sea imprescindible para comparar precios con sentido.
- [x] Comparar formatos distintos del mismo producto mediante precio unitario en lugar de crear canónicos separados por formato.
- [x] Dejar que Codex elija la unidad natural de comparación por producto, como `€/kg`, `€/L` o `€/unidad`.
- [x] Permitir que Codex cambie la unidad natural de comparación si nuevos datos hacen más adecuada otra unidad.
- [x] Aplicar los cambios de unidad natural solo a observaciones nuevas, sin recalcular precios históricos.
- [x] Crear aliases por producto canónico para variantes como `plátano`, `plátanos` o nombres más largos de supermercado.
- [x] Preparar el modelo para que Codex pueda generar y mantener productos canónicos por la noche, sin revisión manual en el flujo normal.
- [x] Aplicar al alta una normalización inmediata usando los aliases canónicos ya conocidos en Supabase/Dexie.
- [x] Hacer la normalización inmediata sin avisos ni confirmaciones para mantener el alta rápida.
- [x] No registrar en Historial las normalizaciones inmediatas del alta; solo registrar las ejecuciones nocturnas de Codex.
- [x] Permitir que Codex fusione productos canónicos duplicados cuando detecte que representan el mismo producto.
- [x] Permitir que Codex renombre automáticamente el nombre visible de productos pendientes al nombre canónico elegido.
- [x] Al fusionar productos, conservar la cantidad del producto que siga pendiente de compra para no perder la lista semanal.
- [x] Al fusionar productos presentes en listas distintas, conservar cada pendiente en su lista para poder comparar precios por supermercado.
- [x] Al fusionar productos pendientes en la misma lista, sumar sus cantidades cuando ambas existan, dejando que Codex resuelva también cantidades ambiguas.
- [x] Al fusionar en la misma lista un producto pendiente con otro no pendiente, conservar el pendiente y eliminar el otro de esa lista.
- [x] Crear en Historial la pestaña de normalizaciones de productos canónicos.
- [x] Preparar esa pestaña para mostrar detalle técnico de entradas tocadas, cantidades sumadas, aliases creados y criterio resumido de Codex.
- [x] No duplicar las fusiones automáticas como eventos del historial manual de compra.
- [x] Separar los avisos de cambios nuevos por cambios manuales, recategorizaciones y normalizaciones, cada uno abriendo su pestaña de Historial.
- [x] Permitir que los tres avisos se muestren a la vez y mantener cada uno visible hasta que se vea su pestaña correspondiente.
- [x] Excluir por defecto los productos borrados de la propuesta inicial de precios.
- [x] Añadir siempre un aviso antes de borrar productos indicando que se perderá su uso en el análisis de precios si no queda asociado a un producto canónico.
- [x] Mantener la lista de la compra rápida: el producto canónico no debe añadir fricción al alta normal.
- [x] Añadir tests razonables de normalización, aliases, borrado y compatibilidad con el flujo actual.
- [x] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Hito 32 — Bandeja privada de tickets

Objetivo: permitir que la PWA desplegada en Vercel deje tickets pendientes en Supabase sin exponer un servidor local.

- [x] Crear un bucket privado de Supabase Storage para tickets de compra.
- [x] Permitir que cualquier dispositivo de Jucart vea y abra los tickets de la lista compartida.
- [x] Crear una tabla de tickets con estado `pending`, `processing`, `processed`, `needs_review` o `failed`.
- [x] Crear un modelo de archivos de ticket para permitir uno o varios PDFs/fotos por ticket.
- [x] Guardar metadatos mínimos: lista/supermercado obligatorio, autor de subida, fecha de subida, rutas de archivos, hashes y error no sensible.
- [x] Permitir que Rafa y Begoña suban uno o varios PDFs o fotos del ticket desde la app a la bandeja privada y crear las filas asociadas.
- [x] Si falla algún archivo durante la subida, no crear el ticket y mostrar error para reintentar todo.
- [x] No exigir orden manual de fotos; el procesamiento debe tratar los archivos asociados como un conjunto del mismo ticket.
- [x] Pedir elegir lista/supermercado al subir el ticket para reducir trabajo y ambigüedad de Codex.
- [x] Colocar la acción rápida de subir ticket junto al botón `+` de añadir producto.
- [x] Añadir Tickets como nuevo destino de la navegación inferior principal para revisar tickets subidos y sus estados.
- [x] Mostrar confirmación tras subir un ticket.
- [x] Mostrar en la vista de Tickets una lista única con filtros `Todos`, `Pendientes`, `Procesados`, `Fallidos` y `Necesitan revisión`.
- [x] Mostrar en cada ticket supermercado, fecha de subida, autor, estado y número de archivos.
- [x] Permitir abrir un detalle de ticket procesado con líneas extraídas, cantidad, precio total, precio unitario y producto canónico asociado.
- [x] Marcar como `Necesita revisión` las líneas sin producto canónico fiable.
- [x] Dejar la resolución de líneas en revisión para hitos posteriores; en este hito solo se muestran marcadas.
- [x] Evitar guardar el contenido extraído del ticket hasta que lo procese el flujo nocturno.
- [x] Definir retención: conservar el PDF privado tras procesarlo para poder revisar extracciones incorrectas.
- [x] Permitir abrir el PDF conservado desde la app mediante acceso privado.
- [x] No permitir borrar tickets subidos desde la interfaz.
- [x] Añadir tests razonables del adaptador Supabase, estados de UI y errores de subida.
- [x] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Hito 33 — Procesamiento nocturno de tickets con Codex

Objetivo: analizar tickets pendientes por la noche desde la máquina local y convertirlos en líneas de compra auditables.

- [x] Crear un script local que descargue tickets `pending` desde Supabase.
- [x] Procesar todos los tickets pendientes en cada ejecución nocturna; revisar límites si la aplicación crece en usuarios o volumen.
- [x] Procesar cada archivo con Codex para extraer supermercado, fecha, líneas, cantidades, precios unitarios, totales, precio original y descuentos cuando aparezcan.
- [x] Ejecutar la generación y mantenimiento nocturno de productos canónicos y aliases.
- [x] Asociar cada línea a un producto canónico existente o dejarla como `needs_review` si la confianza es baja.
- [x] Marcar el ticket como `needs_review` si alguna línea queda en revisión, manteniendo marcadas las líneas afectadas.
- [x] Generar observaciones de precio para las líneas válidas aunque el ticket completo quede `needs_review`.
- [x] Usar el precio original sin descuento como base de medias y comparativas cuando esté disponible.
- [x] Usar el precio final como observación normal cuando el ticket no muestre un precio original claro.
- [x] Fechar observaciones con la fecha detectada en el ticket y usar la fecha de subida si no se puede leer.
- [x] Guardar líneas de ticket y observaciones de precio en Supabase de forma idempotente por ticket y línea.
- [x] Registrar ejecuciones con estado, resumen, errores y número de líneas aceptadas o pendientes de revisión.
- [x] Dejar los tickets con error en estado `failed` sin reintento automático nocturno.
- [x] No añadir botón de reintento en la interfaz; reintentar tickets fallidos queda como tarea técnica.
- [x] Añadir un comando manual local para ejecutar el mismo procesamiento sin esperar al cron.
- [x] Crear un instalador de cron nocturno a las 03:30 siguiendo el patrón de backups y recategorización.
- [x] Guardar logs duraderos en `var/log/` y datos transitorios en `/tmp`.
- [x] Añadir tests razonables del parser de salida, normalización, idempotencia y errores parciales.
- [x] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Hito 34 — Revisión y vista de historial de precios

Objetivo: hacer visible el histórico de precios sin convertir Jucart en una aplicación pesada.

- [x] Mostrar en cada tarjeta de la lista de compra el último precio global y precio medio global en formato pequeño cuando exista histórico suficiente.
- [x] Añadir en la tarjeta un botón para abrir el detalle ampliado de precios del producto en bottom sheet.
- [x] Mostrar por producto canónico el último precio, supermercado, fecha y diferencia exacta en euros frente al precio anterior.
- [x] Mostrar en el bottom sheet desglose por supermercado/lista, como Mercadona frente a Alcampo.
- [x] Mostrar todas las observaciones históricas disponibles por producto.
- [x] Añadir en la vista Tickets la cola de revisión para líneas dudosas y aliases nuevos propuestos por Codex.
- [x] Permitir desde Tickets aceptar una asociación, crear un alias o dejar la línea fuera del análisis.
- [x] Crear automáticamente un alias cuando se acepte manualmente una asociación de línea con producto canónico.
- [x] Conservar visibles como `Excluida` las líneas que se dejen fuera del análisis.
- [x] Permitir corregir asociaciones manuales ya resueltas, actualizando la observación de precio y pudiendo retirar aliases creados por error.
- [x] Paginar observaciones de precio y tickets antiguos sin borrar datos históricos; el límite de visualización no debe implicar retención limitada.
- [x] Conservar visible el acceso a PDFs y fotos originales desde Tickets, incluso tras procesarlos, priorizando metadatos y líneas extraídas como superficie principal.
- [x] Añadir tests razonables de interfaz, estados vacíos, revisión y cálculo de tendencias.
- [x] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Hito 35 — Semillas externas de precios

Objetivo: precargar precios iniciales desde fuentes externas solo cuando aporten datos claros sin convertirse en dependencia crítica.

- [x] Crear una arquitectura común de proveedores externos de precios, preparada para varias fuentes.
- [x] Añadir un script manual de actualización externa, sin cron ni botón en la app.
- [x] Consultar solo productos canónicos presentes en productos pendientes o comprados de las listas consultadas.
- [x] Probar todas las fuentes externas disponibles para cada producto canónico activo, no solo la lista donde esté.
- [x] Insertar observaciones con `source = external` en `shopping_price_observations`, separadas de `source = ticket`.
- [x] Guardar nuevas observaciones externas solo cuando cambie el precio respecto a la última observación de esa fuente, producto y unidad.
- [x] Mostrar en las tarjetas tanto el precio real de tickets como el mejor precio externo cuando existan ambos.
- [x] Comparar y calcular medias separando precios reales de tickets y precios externos.
- [x] Implementar Mercadona con adaptador propio no oficial, documentando la falta de API pública estable.
- [x] Investigar Alcampo con adaptador propio primero y dejar un proveedor externo con clave como fallback configurable si no hay endpoint limpio.
- [x] Omitir coincidencias externas dudosas o sin unidad canónica clara, dejándolas en reporte técnico sin crear observación.
- [x] Mantener la vista global de Precios como v2, fuera de esta primera integración en tarjetas.
- [x] Añadir tests razonables de importación, procedencia y conflictos con productos canónicos.
- [x] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Estrategia de evolución para usuarios y permisos

Las fases 36 a 41 se harán de forma incremental y compatible con la aplicación actual. Cada fase debe poder desplegarse sin perder productos, listas ni sesiones válidas. La migración mantiene el `list_id` activo y la caché local, pero desde el Hito 36 el cliente configurado exige una sesión de contraseña antes de mostrar datos y Supabase deja de conceder acceso anónimo. No se pide a las personas borrar datos del navegador: las actualizaciones conservan IndexedDB y el Service Worker ofrece la recarga controlada.

## Hito 36 — Cuentas y autenticación

Objetivo: convertir el acceso en obligatorio y dejar preparadas las dos cuentas iniciales sin depender del email transaccional de Supabase.

- [x] Añadir Supabase Auth mediante email y contraseña.
- [x] Mostrar una pantalla de login antes de cargar la aplicación configurada.
- [x] Crear o actualizar las cuentas iniciales de Rafa y Begoña con contraseña almacenada mediante hash de Supabase Auth.
- [x] Persistir la sesión y permitir cerrar sesión.
- [x] Crear el perfil de aplicación asociado a cada cuenta mediante trigger de Supabase.
- [x] Preparar la migración de la lista actual conservando sus datos, con Rafa como propietario.
- [x] Mantener la caché local y el `list_id` durante el cambio para no romper clientes existentes.
- [x] Mantener la compatibilidad de los autores históricos de productos, tickets e historial.
- [x] Mantener el selector histórico de autor para no reescribir los productos antiguos durante la transición.
- [x] Añadir tests de inicio de sesión por contraseña, sesión expirada y logout.

## Hito 37 — Listas y códigos de unión

Objetivo: transformar las listas antiguas por supermercado en listas compartidas de Rafa, visibles también para Begoña, sin crear listas adicionales.

- [x] Consultar las listas del usuario mediante tablas y funciones seguras.
- [x] Asociar cada lista a su propietario y a sus miembros.
- [x] Mostrar durante la transición el email del propietario junto a cada lista.
- [x] Mantener el `list_id` interno de cada lista migrada sin perder sus filas actuales.
- [x] Asociar las siete listas antiguas con productos a Rafa como propietario y Begoña como miembro.
- [x] Generar un código único reutilizable para cada lista.
- [x] Permitir al propietario regenerar el código; el anterior dejará de aceptar nuevas entradas.
- [x] Mantener las operaciones RPC existentes para la transición, sin ofrecer crear o unirse a nuevas listas en la interfaz.
- [x] Mostrar simultáneamente todas las listas a las que pertenece el usuario, como propietario o miembro, sin concepto de lista activa.
- [x] Añadir tests de creación, unión, regeneración, abandono y carga conjunta de listas.

## Hito 38 — Roles y permisos de lista

Objetivo: aplicar permisos reales a la administración de cada lista.

- [x] Crear los roles `owner` y `member`.
- [x] Permitir a propietario y miembros leer y modificar el contenido de la lista.
- [x] Permitir al propietario expulsar miembros.
- [x] Permitir al propietario transferir la propiedad.
- [x] Permitir eliminar una lista únicamente a su propietario.
- [x] Añadir pantallas de administración de miembros y acciones de propietario.
- [x] Activar políticas y comprobaciones de pertenencia para clientes autenticados.
- [x] Añadir tests de autorización para propietario, miembro y usuario ajeno.

El Hito 38 añade el rol actual a la carga de listas, una vista de miembros y RPCs protegidas para consultar miembros, expulsar miembros y transferir propiedad. Las operaciones sensibles exigen propietario y sesión autenticada; `anon` no puede ejecutar esas RPCs. La migración remota quedó aplicada el 29/07/2026 y la validación local cubre propietario y miembro, además de las comprobaciones remotas de concesiones y pertenencia.

## Hito 39 — Aislamiento de todos los datos

Objetivo: garantizar que todo el contenido de una lista queda aislado de las demás y que nunca vuelve a estar disponible para `anon`.

- [ ] Asociar a la lista los productos, congelador, categorías, historial, tickets, precios y notificaciones.
- [ ] Revisar consultas, Realtime, Storage y RPC para exigir pertenencia a la lista.
- [x] Activar el bloqueo estricto después de migrar las siete listas y las dos cuentas.
- [x] Evitar lecturas o escrituras de datos de otras listas cuando la sesión autenticada ya esté activa.
- [ ] Mantener las operaciones técnicas de servidor separadas de los permisos del navegador.
- [ ] Añadir tests de aislamiento por tabla y por Storage.
- [ ] Ejecutar la validación completa del repositorio antes de cerrar el hito.

## Hito 40 — Offline autenticado y sincronización

Objetivo: conservar la utilidad offline de la PWA sin conceder acceso a datos no autorizados.

- [ ] Permitir trabajar offline con las listas autorizadas y previamente cacheadas.
- [ ] Guardar cambios offline en Dexie y sincronizarlos al recuperar conexión.
- [ ] Rechazar o poner en cola cambios cuya pertenencia ya no sea válida.
- [ ] Invalidar el acceso local a datos privados al cerrar sesión.
- [ ] Gestionar sesiones caducadas y recuperación de acceso al volver a tener red.
- [ ] Añadir tests de lectura, escritura, cola y reconciliación offline.

## Hito 41 — Ciclo de vida y eliminación de listas

Objetivo: cerrar los casos de mantenimiento y borrado sin pérdida accidental inmediata.

- [ ] Implementar borrado lógico de listas por parte del propietario.
- [ ] Ocultar inmediatamente la lista eliminada a todos sus miembros.
- [ ] Mantener una ventana técnica de recuperación de 30 días.
- [ ] Ejecutar después el borrado definitivo de la lista, miembros y datos asociados.
- [ ] Añadir confirmación explícita y estados de lista eliminada.
- [x] Verificar que la migración y las sesiones iniciales ya no necesitan el acceso anónimo.
- [ ] Retirar el selector manual de autor cuando todos los productos nuevos puedan atribuirse a `auth.uid()` sin perder el histórico.
- [ ] Añadir tests de transferencia, expulsión, abandono, recuperación y borrado definitivo.
- [ ] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

## Hito 42 — Actualización controlada de la PWA

Objetivo: permitir que las personas reciban versiones nuevas sin borrar manualmente los datos del navegador ni reinstalar la aplicación.

- [ ] Detectar desde la aplicación que existe una nueva versión del Service Worker.
- [ ] Mostrar un aviso discreto cuando haya una actualización disponible.
- [ ] Añadir una acción `Actualizar` que active la nueva versión y recargue la aplicación.
- [ ] Mantener la caché local y los datos de Dexie intactos durante la actualización.
- [ ] Comprobar actualizaciones al iniciar y al volver a primer plano.
- [ ] Gestionar correctamente una pestaña abierta con un bundle antiguo.
- [ ] Añadir una migración única del Service Worker que recargue clientes antiguos ya controlados.
- [ ] Guardar una marca de migración para no repetir esa recarga en futuras actualizaciones.
- [ ] Añadir tests del aviso, activación, recarga y estados sin conexión.
- [ ] Verificar el comportamiento en escritorio, móvil y PWA instalada.
- [ ] Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` y `pnpm build` antes de cerrar el hito.

La versión visible actual es `0.9.0`. El coordinador revisará periódicamente si los cambios acumulados justifican una nueva versión y preguntará antes de modificarla.
