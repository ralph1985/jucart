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

## Persistencia local

En el Hito 2, Jucart guarda la lista en IndexedDB usando Dexie.

La aplicación lee todos los productos al arrancar y, después de esa carga inicial, reemplaza la lista guardada cada vez que cambia el estado local. Para una lista privada y pequeña evita una capa de sincronización más compleja y mantiene el código fácil de seguir.

Los errores básicos de lectura o escritura se muestran en la pantalla sin bloquear el uso de la lista en memoria.

## PWA y offline

En el Hito 3, Jucart usa `vite-plugin-pwa` con Service Worker generado por Workbox.

El Service Worker se registra con actualización automática y precachea el shell de la aplicación: HTML, JS, CSS, manifest e iconos. La navegación usa fallback a `index.html`, suficiente para una aplicación de una sola pantalla.

Los iconos son provisionales y locales: SVG, PNG 192x192 y PNG 512x512. No se añade una dependencia solo para generar iconos.

La persistencia de datos sigue dependiendo de IndexedDB mediante Dexie. Al no haber backend, la modificación de datos locales no requiere red.
