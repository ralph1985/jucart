# Decisiones técnicas

## Tratamiento del texto de productos

En el Hito 1, Jucart aplica estas reglas antes de añadir un producto:

- Los espacios al principio y al final se eliminan.
- Varios espacios internos seguidos se convierten en un único espacio.
- Un texto vacío después de normalizarse no se añade.
- Los duplicados no se añaden si ya existe un producto con el mismo texto, ignorando mayúsculas y minúsculas.

Esta decisión mantiene rápida la captura de productos y evita entradas accidentales como `leche`, `Leche` y `leche` repetidas. Cantidades y variantes quedan fuera del MVP.

## Secciones por tienda

Jucart usa secciones fijas por tienda: Alcampo, Día, Mercadona, Farmacia y General.

Aunque las categorías estaban fuera del alcance inicial, estas secciones pasan a formar parte del flujo real porque el usuario organiza la compra por lugar. No se implementa gestión dinámica de secciones, drag and drop ni varias listas.

Los duplicados se bloquean dentro de la misma sección, pero se permite repetir el mismo producto en secciones distintas.

La interfaz se organiza como un tablero por columnas: en escritorio se muestran varias columnas a la vez y en móvil cada columna ocupa casi todo el ancho, con desplazamiento lateral.

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

La limpieza pide confirmación antes de borrar y conserva los productos pendientes. No se añade papelera, historial ni deshacer porque la aplicación sigue siendo una lista local sencilla; si un producto se borra por error, se vuelve a añadir manualmente.

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

La aplicación guarda en memoria los últimos productos borrados y muestra una acción `Deshacer` en la sección donde estaban. La restauración usa el flujo normal de estado y persistencia local. No se implementa historial múltiple ni papelera permanente para mantener la interfaz sencilla.

## Animaciones de navegación

En el Hito 14, Jucart usa Anime.js para dar feedback visual a la navegación y a las acciones principales.

Las animaciones se aplican a la entrada del tablero, la sección seleccionada, el desplazamiento horizontal móvil, las tarjetas nuevas, el deshacer y la pulsación de botones. Si el navegador indica `prefers-reduced-motion: reduce`, las animaciones se omiten.

## Pulido visual

En el Hito 15, Jucart adopta una interfaz más densa y actual sin cambiar el modelo de una sola pantalla.

El encabezado muestra pendientes y comprados, el alta y la limpieza se agrupan en un panel superior, y el tablero usa superficies, sombras y estados más claros para mejorar la lectura en móvil y escritorio.

## Modo compra rápido

En el Hito 16, tocar una tarjeta alterna entre pendiente y comprado.

La tarjeta completa es la acción principal durante la compra. Editar y borrar siguen como botones separados y detienen la propagación para evitar cambios accidentales de estado. En modo edición, la tarjeta deja de comportarse como botón.

## Persistencia local

En el Hito 2, Jucart guarda la lista en IndexedDB usando Dexie.

La aplicación lee todos los productos al arrancar y, después de esa carga inicial, reemplaza la lista guardada cada vez que cambia el estado local. Para una lista privada y pequeña evita una capa de sincronización más compleja y mantiene el código fácil de seguir.

Los errores básicos de lectura o escritura se muestran en la pantalla sin bloquear el uso de la lista en memoria.

## Supabase remoto

En el Hito 17, Jucart empieza la transición a Supabase para poder sincronizar la lista entre varios teléfonos.

El primer paso no sustituye Dexie ni conecta la interfaz todavía. Añade Supabase CLI, configuración y una migración versionada para `shopping_items`. Para este proyecto se prioriza un Supabase remoto de uso personal en lugar de Docker local, porque la aplicación la usarán solo Rafa y Begoña y el objetivo inmediato es sincronizar varios teléfonos.

La tabla usa `list_id` para identificar una lista compartida. Mientras no haya login, las políticas RLS permiten acceso `anon` y la aplicación deberá filtrar por `VITE_SUPABASE_LIST_ID`. Esta decisión es pragmática para una app privada y no equivale a permisos robustos para una aplicación pública. Si la app se expone fuera del uso personal, el siguiente paso debe ser Auth o una capa de acceso más estricta.

## PWA y offline

En el Hito 3, Jucart usa `vite-plugin-pwa` con Service Worker generado por Workbox.

El Service Worker se registra con actualización automática y precachea el shell de la aplicación: HTML, JS, CSS, manifest e iconos. La navegación usa fallback a `index.html`, suficiente para una aplicación de una sola pantalla.

Los iconos son provisionales y locales: SVG, PNG 192x192 y PNG 512x512. No se añade una dependencia solo para generar iconos.

La persistencia de datos sigue dependiendo de IndexedDB mediante Dexie. Al no haber backend, la modificación de datos locales no requiere red.
