# Decisiones técnicas

## Tratamiento del texto de productos

En el Hito 1, Jucart aplica estas reglas antes de añadir un producto:

- Los espacios al principio y al final se eliminan.
- Varios espacios internos seguidos se convierten en un único espacio.
- Un texto vacío después de normalizarse no se añade.
- Los duplicados no se añaden si ya existe un producto con el mismo texto, ignorando mayúsculas y minúsculas.

Esta decisión mantiene rápida la captura de productos y evita entradas accidentales como `leche`, `Leche` y `leche` repetidas. Cantidades y variantes quedan fuera del MVP.
