# Plan De Agentes

## Objetivo

Mantener una configuración pequeña y útil para Jucart, inspirada en `../borchgomez` y `../barbaranunez-osteopata`, sin copiar agentes que no aplican a una app privada de una sola pantalla.

## Agentes Activos

### coordinator

Estado: activo en `.codex/agents/coordinator.toml`.

Responsabilidades:

- Identificar el hito activo en `PLAN.md`.
- Leer solo los archivos probables y evitar recorridos amplios del repo.
- Mantener el alcance actual de app privada de una sola pantalla.
- Evitar carpetas, dependencias y abstracciones sin necesidad actual.
- Ejecutar validaciones proporcionales al cambio.

### qa_final_reviewer

Estado: activo en `.codex/agents/qa-final-reviewer.toml`.

Responsabilidades:

- Revisar cambios completos o bloqueantes antes de cerrar hitos.
- Comprobar que no se avanza a hitos futuros sin petición.
- Detectar dependencias, carpetas o abstracciones prematuras.
- Exigir las comprobaciones completas para cambios de producto.

## Skills Locales

No se crean skills bajo `.agents` en este hito porque la carpeta existe como ruta especial de solo lectura en el entorno actual. La configuración operativa queda en `AGENTS.md` y `.codex/agents`.

## Agentes No Incorporados

No se incorporan agentes de SEO, contenido, enlaces, seguridad CSP o rendimiento. Esos agentes sí tienen sentido en `../borchgomez`, pero Jucart es una app privada sin superficie pública ni contenido editorial.
