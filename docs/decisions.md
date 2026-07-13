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

## Persistencia local

En el Hito 2, Jucart guarda la lista en IndexedDB usando Dexie.

La aplicación lee todos los productos al arrancar y, después de esa carga inicial, reemplaza la lista guardada cada vez que cambia el estado local. Para una lista privada y pequeña evita una capa de sincronización más compleja y mantiene el código fácil de seguir.

Los errores básicos de lectura o escritura se muestran en la pantalla sin bloquear el uso de la lista en memoria.
