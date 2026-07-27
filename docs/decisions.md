# Decisiones técnicas

## Tratamiento del texto de productos

En el Hito 1, Jucart aplica estas reglas antes de añadir un producto:

- Los espacios al principio y al final se eliminan.
- Varios espacios internos seguidos se convierten en un único espacio.
- Un texto vacío después de normalizarse no se añade.
- Los duplicados no se añaden si ya existe un producto con el mismo texto, ignorando mayúsculas y minúsculas.

Esta decisión mantiene rápida la captura de productos y evita entradas accidentales como `leche`, `Leche` y `leche` repetidas. Cantidades y variantes quedan fuera del MVP.

## Listas de compra

Jucart organiza los productos en listas por tienda o contexto.

La aplicación mantiene como listas iniciales Alcampo, Día, Mercadona, Farmacia y General por compatibilidad con el flujo original, pero desde el Hito 20 esas listas se pueden crear, renombrar, colorear, reordenar y borrar desde una pantalla accesible en el menú inferior.

El borrado solo se permite para listas vacías. Una lista con productos debe conservarse para evitar pérdida accidental de información o productos huérfanos.

Los duplicados se bloquean dentro de la misma lista, pero se permite repetir el mismo producto en listas distintas.

La interfaz se organiza como un tablero por columnas: en escritorio se muestran varias columnas a la vez y en móvil cada columna ocupa casi todo el ancho, con desplazamiento lateral.

## Categorías de productos

En el Hito 21, los productos se agrupan por categoría dentro de cada lista para comprar productos relacionados juntos.

Desde el Hito 27, las categorías y el catálogo maestro viven en Supabase como datos globales. La app los lee para inferir la categoría a partir del nombre del producto. El código mantiene un fallback local para uso offline o fallo remoto, pero Supabase es la fuente operativa del catálogo.

La categoría inferida se guarda en el producto y se recalcula al renombrarlo. Los productos antiguos sin categoría se normalizan al cargar usando el catálogo disponible. La automatización diaria con Codex puede añadir entradas al catálogo remoto y actualizar `shopping_items.category_id` cuando la recategorización sea clara.

Las recategorizaciones automáticas se registran en un historial propio de Supabase, separado del historial de acciones manuales de compra. La sección Historial de la app muestra ambos historiales en pestañas para distinguir cambios humanos de mantenimiento automático.

## Historial de cambios

En el Hito 22, Jucart añade un historial auditado para altas, compras, cambios de lista y borrados.

El historial guarda eventos inmutables para productos añadidos, marcados como comprados, devueltos a pendientes, movidos a otra lista y borrados. Cada evento incluye la persona que ejecutó la acción, el dispositivo local que la originó, la fecha y un snapshot completo del producto en ese momento.

Cuando un producto cambia de lista, el evento conserva también el snapshot anterior para poder mostrar de qué lista venía y a cuál se movió.

Si al cargar existen productos pero no hay historial previo, la aplicación crea eventos `initial` para dejar constancia del estado inicial sin inventar compras o borrados anteriores. Esos eventos usan como actor la persona que añadió el producto.

La vista de Historial muestra los eventos de los últimos 30 días. Ese límite es de visualización: los datos no se borran automáticamente.

Para detectar cambios hechos en otro móvil, cada navegador genera un `clientId` local guardado en `localStorage`. Los eventos cuyo `clientId` es distinto se consideran remotos para ese dispositivo. El estado de lectura también es local por dispositivo; no se sincroniza globalmente ni se asocia a un login.

## Edición básica de productos

En el Hito 5, editar un producto permite cambiar su nombre y moverlo a otra sección.

La edición reutiliza las mismas reglas que el alta: se normalizan los espacios, no se aceptan nombres vacíos y se bloquean duplicados dentro de la misma sección. El estado comprado o pendiente se conserva al editar.

No se añade una pantalla nueva, modal ni historial de cambios. La edición se hace en la propia tarjeta para mantener la aplicación rápida y de una sola pantalla.

## Autor del alta

Jucart guarda quién ha añadido cada producto con un selector básico entre Rafa y Begoña.

No se implementan usuarios, login ni permisos. El dato se guarda como parte del producto para dar contexto en la lista compartida. Los productos antiguos sin este campo se normalizan como añadidos por Rafa.

## Alta rápida

En el Hito 7, Jucart recuerda la última sección y la última persona seleccionadas usando `localStorage`.

Esta preferencia no forma parte de los productos ni requiere IndexedDB. Solo acelera el alta siguiente en el mismo navegador. Después de añadir un producto, el foco vuelve al campo de texto para poder seguir escribiendo sin tocar de nuevo la pantalla.

En el Hito 24, el alta añade sugerencias rápidas bajo el campo de producto cuando se empieza a escribir.

Las sugerencias se calculan desde el catálogo maestro, productos existentes e historial reciente. Si el campo tiene texto, se filtran por lo escrito. No se muestran productos que ya existan en el tablero para evitar ruido visual, y tocar una sugerencia usa el mismo flujo de alta que el botón `Añadir`, incluyendo historial y persistencia.

## Limpieza de comprados

En el Hito 8, Jucart permite borrar todos los productos comprados con una acción global.

La limpieza pide confirmación antes de borrar y conserva los productos pendientes. Desde el Hito 13 se puede deshacer la última limpieza, pero no se añade historial múltiple ni papelera permanente.

## Compra en tienda

En el Hito 9, cada sección muestra primero los productos pendientes y después los comprados.

El orden relativo se conserva dentro de cada grupo para que la lista no salte de forma inesperada. Cuando una sección tiene pendientes y comprados, se muestra un separador sencillo antes de los comprados y sus tarjetas quedan visualmente más apagadas.

## Navegación de secciones

En el Hito 10, el selector de sección y el tablero se sincronizan.

La sección seleccionada se marca con un borde verde. En móvil, cambiar el selector desplaza el tablero horizontal hasta la columna correspondiente. Al seleccionar una columna desde el tablero, el selector superior se actualiza con esa sección.

## Interfaz compacta

En el Hito 11, las acciones repetidas de productos pasan a botones con iconos para reducir espacio en cada tarjeta.

Los botones conservan `aria-label` y `title` con la acción completa. No se añade una librería de iconos porque la app mantiene una superficie pequeña y no hay otra necesidad actual de una dependencia nueva.

## Alta compacta

En el Hito 12, el formulario de alta muestra primero la sección y la persona, y deja el nombre del producto como último campo.

Este orden prioriza preparar el contexto una vez y terminar escribiendo el producto, de forma que Enter complete el alta. La zona se compacta reduciendo márgenes y agrupando los selectores sin cambiar la pantalla única.

## Deshacer borrado

En el Hito 13, Jucart permite deshacer el último borrado.

La aplicación guarda en memoria los últimos productos borrados y muestra una acción `Deshacer` en la sección donde estaban. La restauración usa el flujo normal de estado y persistencia. No se implementa historial múltiple ni papelera permanente para mantener la interfaz sencilla.

## Animaciones de navegación

En el Hito 14, Jucart usa Anime.js para dar feedback visual a la navegación y a las acciones principales.

Las animaciones se aplican a la entrada del tablero, la sección seleccionada, el desplazamiento horizontal móvil, las tarjetas nuevas, el deshacer y la pulsación de botones. Si el navegador indica `prefers-reduced-motion: reduce`, las animaciones se omiten.

## Pulido visual

En el Hito 15, Jucart adopta una interfaz más densa y actual sin cambiar el modelo de una sola pantalla.

El encabezado muestra pendientes y comprados, el alta y la limpieza se agrupan en un panel superior, y el tablero usa superficies, sombras y estados más claros para mejorar la lectura en móvil y escritorio.

## Estructura de aplicación

En el Hito 19, Jucart adopta una estructura más cercana a una app instalada sin añadir rutas.

La cabecera queda fija para mantener visible marca, resumen y estado de sincronización. El menú inferior da acceso táctil a añadir, lista y limpieza de comprados. La navegación inferior no introduce vistas nuevas: solo salta a zonas de la misma pantalla y mantiene la acción de limpieza existente.

En el Hito 20, el menú inferior añade una vista interna de gestión de listas. Se mantiene sin React Router porque la aplicación sigue siendo pequeña y no necesita URLs por pantalla.

## Modo compra rápido

En el Hito 16, tocar el check de una tarjeta alterna entre pendiente y comprado.

El check es la acción principal durante la compra. Editar y borrar siguen como botones separados para evitar cambios accidentales de estado.

## Persistencia local

En el Hito 2, Jucart guarda la lista en IndexedDB usando Dexie.

La aplicación lee todos los productos al arrancar y, después de esa carga inicial, reemplaza la lista guardada cada vez que cambia el estado local. Para una lista privada y pequeña evita una capa de sincronización más compleja y mantiene el código fácil de seguir.

Los errores básicos de lectura o escritura se muestran en la pantalla sin bloquear el uso de la lista en memoria.

## Supabase remoto

En el Hito 17, Jucart empieza la transición a Supabase para poder sincronizar la lista entre varios teléfonos.

El primer paso añade Supabase CLI, configuración, una migración versionada para `shopping_items` y conexión desde la capa de persistencia. Para este proyecto se prioriza un Supabase remoto de uso personal en lugar de Docker local, porque la aplicación la usarán solo Rafa y Begoña y el objetivo inmediato es sincronizar varios teléfonos.

La interfaz mantiene la misma API interna de persistencia. Cuando `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_SUPABASE_LIST_ID` están configurados, lee y guarda en Supabase. Dexie queda como caché local y fallback si falta configuración o falla la red.

Realtime usa Postgres Changes sobre `shopping_items` y `shopping_sections` filtrado por `list_id`. Al recibir un evento remoto, la app recarga los datos completos desde Supabase en lugar de aplicar parches item a item. Para una lista pequeña es más simple y evita inconsistencias entre eventos locales, borrados múltiples, cambios de orden y deshacer.

La app también recarga los datos al volver a primer plano, para recuperar cambios remotos que no hayan llegado mientras la PWA estaba suspendida o en background.

En el Hito 18, la UI muestra un estado discreto de sincronización. La app también evita guardar automáticamente justo después de la carga inicial, para no reenviar una lista recién cargada ni arriesgar que una caché local antigua pise datos remotos al arrancar. La capa de persistencia informa si el último acceso fue remoto, local o fallback local.

La tabla usa `list_id` para identificar una lista compartida y la aplicación filtra por `VITE_SUPABASE_LIST_ID`. Esta decisión es pragmática para una app privada de uso personal; no se planifica una capa de autenticación o permisos más compleja mientras ese siga siendo el alcance.

El esquema de Supabase y la copia local IndexedDB están documentados en [`docs/database-schema.md`](database-schema.md).

## Backup local de Supabase

En el Hito 23, Jucart añade un backup local de la base remota de Supabase. La copia se ejecuta desde la máquina de Rafa contra el proyecto remoto, sin levantar Supabase local ni depender de Docker.

El backup completo se guarda como un archivo comprimido local con `schema.sql`, `data.sql` y un manifiesto. Las copias viven en `var/backups/supabase/`, una ruta ignorada por Git. La app web no puede leer esos archivos locales desde producción, así que el script registra en Supabase solo metadatos no sensibles: estado, fecha, duración, tamaño, hash, copias retenidas y error si lo hay.

La vista de desarrollador muestra esos metadatos y datos operativos de la app. Se oculta cuando el selector de persona está en Begoña. Esto no es seguridad real ni sustituye a autenticación; es una regla de interfaz suficiente para una app privada sin login.

## PWA y offline

En el Hito 3, Jucart usa `vite-plugin-pwa` con Service Worker generado por Workbox.

El Service Worker se registra con actualización automática y precachea el shell de la aplicación: HTML, JS, CSS, manifest e iconos. La navegación usa fallback a `index.html`, suficiente para una aplicación de una sola pantalla.

Los iconos son provisionales y locales: SVG, PNG 192x192 y PNG 512x512. No se añade una dependencia solo para generar iconos.

La persistencia offline sigue dependiendo de IndexedDB mediante Dexie. Cuando no hay red o Supabase falla, la modificación de datos locales no requiere conexión.

## Usuarios, listas y permisos

La aplicación evolucionará desde una lista compartida identificada por `list_id` y un selector manual de persona hacia cuentas individuales gestionadas con Supabase Auth. El cambio será progresivo: durante la migración, el acceso actual seguirá funcionando mientras se validan las cuentas, la pertenencia y la recuperación de datos. Solo al completar la migración se hará obligatorio iniciar sesión antes de mostrar datos remotos. El acceso anónimo y el selector manual no se retirarán antes de ese corte validado. El acceso autenticado se realizará mediante enlace mágico por email; no se añadirá un proveedor OAuth ni un sistema de contraseñas en esta fase.

Cada usuario podrá crear listas y pertenecer a varias listas independientes. No existirá el concepto de casa. La pertenencia se asociará a una cuenta y tendrá uno de dos roles: `owner` o `member`. Ambos roles podrán leer y modificar el contenido de la lista; solo el propietario podrá gestionar miembros, regenerar el código de unión, transferir la propiedad o eliminar la lista. Cualquier miembro podrá abandonar la lista.

Cada lista tendrá un código único reutilizable. Introducir un código válido incorporará automáticamente al usuario a la lista. El propietario podrá regenerarlo para impedir nuevas entradas con el código anterior, sin expulsar a miembros actuales.

Los permisos cubrirán todo el contenido asociado a la lista: productos, congelador, categorías, historial, tickets, precios y notificaciones. La protección se implementará mediante RLS, Storage y RPC, no solo ocultando controles en la interfaz. Las políticas se prepararán y probarán durante la transición, pero el bloqueo estricto no se activará hasta que los clientes y datos actuales sean compatibles.

La PWA mantendrá el uso offline para listas previamente autorizadas. Dexie conservará los datos locales y los cambios pendientes hasta recuperar conexión. El cierre de sesión invalidará el acceso local a datos privados y una sesión no autenticada no podrá abrir datos remotos.

La lista actual se migrará conservando sus datos y con Rafa como propietario. Begoña se incorporará como miembro cuando cree su cuenta. La eliminación de una lista será lógica, ocultará sus datos inmediatamente y permitirá recuperación técnica durante 30 días antes del borrado definitivo.

## Notificaciones push

El Hito 30 planifica notificaciones push para avisar de cambios remotos relevantes en Jucart cuando la PWA no esté abierta.

Las notificaciones son opt-in: la app solo pide permiso tras una interacción explícita del usuario. Si el navegador no soporta `Notification`, Service Worker o `PushManager`, la acción no se ofrece como flujo principal.

La PWA genera una suscripción Web Push por dispositivo usando la clave pública VAPID. La suscripción se guarda en Supabase asociada a `list_id` y al `clientId` local que ya usa la app para distinguir cambios remotos. El endpoint y las claves de la suscripción se tratan como datos sensibles: la tabla de suscripciones no debe permitir lectura pública de todos los endpoints. El cliente registra y desactiva suscripciones mediante RPC `security definer`, no con `upsert` directo sobre la tabla, para evitar conceder `SELECT` a `anon`.

Supabase Edge Functions actúa como servidor de envío. La clave privada VAPID vive solo como secret de la función, nunca en el frontend. La función también recibe la clave pública VAPID como configuración propia porque no lee variables de Vercel. La función recibe un aviso de cambio, busca suscripciones activas de la lista, excluye el `clientId` que originó el evento y envía Web Push al resto de dispositivos.

El disparo v1 sale de un trigger `after insert` sobre `shopping_history_events`. El trigger usa `pg_net` para invocar la Edge Function de forma asíncrona tras el commit, con `verify_jwt = false` y una cabecera `x-jucart-push-secret`. Ese secreto compartido vive como secret de la Edge Function y como secreto cifrado en Supabase Vault bajo `jucart_push_trigger_secret`; no se invoca desde el frontend.

La primera versión se limita a eventos relevantes del historial manual de compra. No incluye recordatorios programados, recategorizaciones automáticas, backups ni preferencias finas por tipo de evento. El payload de push debe ser mínimo y genérico; al abrirse, la app refresca los datos desde Supabase como ya hace con Realtime y al volver a primer plano.

En iOS/iPadOS, el soporte se considera solo para Jucart instalada en pantalla de inicio. No se diseña esta fase para pestañas normales de Safari.

## Historial de precios y tickets

A partir del Hito 31, Jucart planifica un historial de precios basado en productos canónicos. El objetivo es que variantes como `plátano`, `plátanos` o nombres más largos de un ticket apunten al mismo producto para no falsear subidas, bajadas o comparativas. El nombre canónico debe ser el nombre más habitual de compra, no necesariamente el singular gramatical. Los canónicos deben ser preferentemente generales, no uno por marca o formato, salvo que separar sea imprescindible para comparar precios con sentido. Los formatos distintos de un mismo producto se comparan mediante precio unitario en lugar de crear canónicos separados por tamaño. Codex elige la unidad natural de comparación de cada producto, como `€/kg`, `€/L` o `€/unidad`, y puede cambiarla si nuevos datos hacen más adecuada otra unidad. Los cambios de unidad natural aplican solo a observaciones nuevas; no recalculan precios históricos.

Los productos canónicos y sus aliases están pensados para que Codex los mantenga automáticamente por la noche. El usuario no debe revisar cada asociación en el flujo normal. La app también aplica al alta una normalización inmediata usando los aliases canónicos ya conocidos en Supabase o Dexie; no necesita llamar a Codex en tiempo real para escribir un producto. Esa normalización inmediata no muestra avisos ni confirmaciones para mantener el alta rápida y no se registra en Historial. Codex puede renombrar automáticamente el nombre visible de productos pendientes al nombre canónico elegido. También puede fusionar productos canónicos duplicados cuando detecte que representan el mismo producto, pero la fusión debe preservar la cantidad del producto que siga pendiente de compra para no perder la lista semanal. Si el mismo producto está pendiente en listas distintas, cada entrada pendiente se conserva en su lista para poder comparar precios por supermercado. Si la fusión ocurre dentro de la misma lista y ambos productos están pendientes, sus cantidades se suman cuando existan, dejando que Codex resuelva también cantidades ambiguas. Si solo uno está pendiente, se conserva el pendiente y el otro se elimina de la lista activa.

La normalización nocturna de productos canónicos se ejecuta con un script y cron propios, independientes del proceso de recategorización. Ambos pueden convivir, pero no comparten wrapper ni comando para que las responsabilidades y los logs queden separados.

Las normalizaciones y fusiones nocturnas de productos canónicos deben mostrarse en una pestaña propia dentro de Historial, siguiendo el patrón ya usado para distinguir cambios manuales y recategorizaciones. La pestaña debe mostrar detalle técnico suficiente para auditar qué entradas tocó Codex, qué cantidades sumó, qué aliases creó y cuál fue el criterio resumido. Esas fusiones automáticas no se duplican como eventos del historial manual de compra.

Los avisos de cambios nuevos deben separarse por historial: cambios manuales de compra, recategorizaciones y normalizaciones de productos canónicos. Cada aviso abre directamente la pestaña de Historial correspondiente. Los tres avisos pueden mostrarse a la vez y cada uno se mantiene visible hasta que se vea su pestaña correspondiente.

El universo inicial de productos canónicos sale de los productos pendientes, comprados, historial útil y catálogo remoto. Los productos borrados quedan fuera por defecto del análisis de precios. Antes de borrar cualquier producto, la app debe avisar de que se perderá su uso en el análisis si no queda asociado a un producto canónico.

La PWA desplegada en Vercel no debe intentar subir archivos de ticket directamente a un servidor local. La arquitectura elegida usa Supabase Storage como bandeja privada compartida por la lista Jucart: cualquier dispositivo puede ver y abrir los tickets de la lista compartida, pero no deben quedar expuestos públicamente. Rafa y Begoña pueden subir uno o varios PDFs o fotos del ticket desde la app desde una acción rápida junto al botón `+` de añadir producto, y la app añade Tickets como destino de la navegación inferior principal para revisar tickets subidos y sus estados. Al subirlo se elige lista o supermercado de forma obligatoria para reducir la ambigüedad del procesamiento nocturno, se registra el autor de subida y se crea un registro de ticket pendiente con sus archivos asociados. Si falla algún archivo, no se crea el ticket y se muestra error para reintentar todo. El cron local descarga los tickets pendientes por la noche para procesarlos con Codex. No se exige ordenar manualmente las fotos; los archivos asociados se tratan como un conjunto del mismo ticket.

Tras subir un ticket, la app debe mostrar una confirmación. La vista de Tickets muestra una lista única de tickets subidos con filtros `Todos`, `Pendientes`, `Procesados`, `Fallidos` y `Necesitan revisión`. Cada ticket muestra supermercado, fecha de subida, autor, estado y número de archivos. Cuando un ticket esté procesado, la vista permite abrir un detalle con las líneas extraídas, cantidad, precio total, precio unitario y producto canónico asociado. Las líneas sin producto canónico fiable quedan marcadas como `Necesita revisión`; en este hito solo se muestran, y su resolución queda para hitos posteriores.

El cron local procesa todos los tickets pendientes a las 03:30 en cada ejecución nocturna porque el volumen esperado es bajo. Si la aplicación crece en usuarios o tickets, habrá que revisar límites por ejecución o una cola más explícita. El mismo procesamiento debe poder lanzarse con un comando manual local, sin botón en la PWA. El cron escribe en Supabase las líneas extraídas, observaciones de precio, asociaciones con productos canónicos y estados de revisión. Cuando el ticket muestre promociones, se intenta guardar también el precio original y el descuento, no solo el precio final pagado. Si alguna línea queda en revisión, el ticket queda en estado `needs_review` y las líneas afectadas se mantienen marcadas. Las líneas válidas generan observaciones de precio aunque el ticket completo necesite revisión. Si un ticket falla al procesarse, queda en estado `failed` sin reintento automático nocturno y sin botón de reintento en la interfaz; reintentarlo queda como tarea técnica. Los archivos originales se conservan de forma privada tras procesarlos para poder revisar extracciones incorrectas y la app debe permitir abrirlos mediante acceso privado. Una vez subido, un ticket no se borra desde la interfaz. La app trabaja principalmente con metadatos y datos extraídos, no con el archivo original como superficie principal.

Las medias y comparativas usan por defecto el precio original sin descuento cuando esté disponible. El precio final pagado y el descuento se conservan como datos adicionales. Si el ticket no muestra un precio original claro, el precio final se usa como observación normal. Las observaciones se fechan con la fecha detectada en el ticket y usan la fecha de subida como fallback si no se puede leer. Las fuentes externas de precios, incluida Mercadona mientras no haya una API pública estable, se tratan como semillas auxiliares. Los precios procedentes de tickets reales y los precios externos deben conservar su origen para que la interfaz no mezcle datos con distinta fiabilidad.

La actualización externa de precios del Hito 35 se ejecuta solo como script manual. No se añade cron ni botón en la app porque Mercadona y Alcampo no se tratan como contratos públicos estables. El adaptador de Mercadona usa el catálogo interno no oficial de la tienda online y debe omitir coincidencias sin unidad comparable clara. Alcampo queda preparado mediante URL de búsqueda configurable y un fallback genérico con clave opcional para no acoplar la app a un proveedor externo concreto antes de validar una fuente limpia. Cada observación externa conserva proveedor, identificador y URL cuando la fuente los devuelve, y solo se inserta una nueva observación si el precio cambia respecto a la última de ese proveedor, producto canónico y unidad.

En v1, cuando exista histórico suficiente, cada tarjeta de producto en la lista de compra debe mostrar en pequeño el último precio global y el precio medio global. La tarjeta también debe ofrecer un botón para abrir el detalle ampliado de precios del producto en un bottom sheet. Ese detalle muestra desglose por supermercado o lista, diferencia exacta en euros frente al precio anterior y todas las observaciones históricas disponibles del producto, sin convertir la bandeja de tickets en la superficie principal de análisis. Una vista global de Precios queda para una fase v2 junto con posibles actualizaciones desde APIs externas.

La revisión de líneas dudosas y aliases propuestos por Codex vive en la vista Tickets, no en el bottom sheet de producto. Desde Tickets se puede aceptar una asociación o dejar una línea fuera del análisis. Al aceptar manualmente una asociación de línea con producto canónico, se crea automáticamente un alias para futuras normalizaciones. Las líneas excluidas se conservan visibles como `Excluida` en el ticket.
