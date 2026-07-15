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

La app usa un catálogo maestro inicial mantenido en código para inferir la categoría a partir del nombre del producto. No se añade todavía una pantalla de edición del catálogo porque la prioridad es validar el flujo de compra; los productos no reconocidos caen en `Otros`.

La categoría inferida se guarda en el producto y se recalcula al renombrarlo. Los productos antiguos sin categoría se normalizan al cargar usando el mismo catálogo.

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

En el Hito 16, tocar una tarjeta alterna entre pendiente y comprado.

La tarjeta completa es la acción principal durante la compra. Editar y borrar siguen como botones separados y detienen la propagación para evitar cambios accidentales de estado. En modo edición, la tarjeta deja de comportarse como botón.

## Persistencia local

En el Hito 2, Jucart guarda la lista en IndexedDB usando Dexie.

La aplicación lee todos los productos al arrancar y, después de esa carga inicial, reemplaza la lista guardada cada vez que cambia el estado local. Para una lista privada y pequeña evita una capa de sincronización más compleja y mantiene el código fácil de seguir.

Los errores básicos de lectura o escritura se muestran en la pantalla sin bloquear el uso de la lista en memoria.

## Supabase remoto

En el Hito 17, Jucart empieza la transición a Supabase para poder sincronizar la lista entre varios teléfonos.

El primer paso añade Supabase CLI, configuración, una migración versionada para `shopping_items` y conexión desde la capa de persistencia. Para este proyecto se prioriza un Supabase remoto de uso personal en lugar de Docker local, porque la aplicación la usarán solo Rafa y Begoña y el objetivo inmediato es sincronizar varios teléfonos.

La interfaz mantiene la misma API interna de persistencia. Cuando `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_SUPABASE_LIST_ID` están configurados, lee y guarda en Supabase. Dexie queda como caché local y fallback si falta configuración o falla la red.

Realtime usa Postgres Changes sobre `shopping_items` y `shopping_sections` filtrado por `list_id`. Al recibir un evento remoto, la app recarga los datos completos desde Supabase en lugar de aplicar parches item a item. Para una lista pequeña es más simple y evita inconsistencias entre eventos locales, borrados múltiples, cambios de orden y deshacer.

En el Hito 18, la UI muestra un estado discreto de sincronización. La app también evita guardar automáticamente justo después de la carga inicial, para no reenviar una lista recién cargada ni arriesgar que una caché local antigua pise datos remotos al arrancar. La capa de persistencia informa si el último acceso fue remoto, local o fallback local.

La tabla usa `list_id` para identificar una lista compartida y la aplicación filtra por `VITE_SUPABASE_LIST_ID`. Esta decisión es pragmática para una app privada de uso personal; no se planifica una capa de autenticación o permisos más compleja mientras ese siga siendo el alcance.

El esquema de Supabase y la copia local IndexedDB están documentados en [`docs/database-schema.md`](database-schema.md).

## PWA y offline

En el Hito 3, Jucart usa `vite-plugin-pwa` con Service Worker generado por Workbox.

El Service Worker se registra con actualización automática y precachea el shell de la aplicación: HTML, JS, CSS, manifest e iconos. La navegación usa fallback a `index.html`, suficiente para una aplicación de una sola pantalla.

Los iconos son provisionales y locales: SVG, PNG 192x192 y PNG 512x512. No se añade una dependencia solo para generar iconos.

La persistencia offline sigue dependiendo de IndexedDB mediante Dexie. Cuando no hay red o Supabase falla, la modificación de datos locales no requiere conexión.
