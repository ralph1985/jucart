#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${JUCART_NORMALIZE_LOG_DIR:-$REPO_ROOT/var/log}"
CODEX_BIN="${CODEX_BIN:-codex}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
CONTEXT_PATH="$LOG_DIR/jucart-normalize-products-context-$STAMP.json"
PROMPT_PATH="$LOG_DIR/jucart-normalize-products-codex-$STAMP.prompt.md"
REPORT_PATH="$LOG_DIR/jucart-normalize-products-codex-$STAMP.md"

mkdir -p "$LOG_DIR"

node "$SCRIPT_DIR/normalize-supabase-products.mjs" export "$CONTEXT_PATH"

cat > "$PROMPT_PATH" <<PROMPT
Trabaja en español. Estás automatizando Jucart, una app privada de lista de la compra.

Objetivo: revisar productos comprados y pendientes para mantener productos canónicos y aliases que permitan comparar precios sin duplicados falsos.

Contexto JSON exportado desde Supabase:
$CONTEXT_PATH

Reglas estrictas:
- No edites archivos del repo.
- No hagas commit, push, merge ni PR.
- No toques .env ni credenciales.
- No ejecutes el script de recategorización.
- Solo puedes modificar Supabase mediante:
  node scripts/normalize-supabase-products.mjs apply <changes-json>
- Los productos canónicos deben ser generales y usar el nombre habitual de compra.
- No fuerces singular si el plural es el nombre natural de compra.
- Elige comparison_unit entre kg, l o unit.
- Compara formatos por precio unitario; no crees canónicos por tamaño salvo que sea imprescindible.
- Puedes crear aliases para variantes como plátano/plátanos o nombres largos.
- La app normaliza al alta con aliases ya conocidos, pero esta ejecución nocturna sí debe registrar cambios.
- Las notas son propias de cada entrada de la lista: nunca las borres ni las sustituyas al cambiar el nombre.
- Si una aclaración está dentro del nombre y renombras el producto, pásala a notes.

Reglas de fusión:
- No fusiones productos pendientes de listas distintas; se conservan para comparar supermercados.
- Solo usa itemMerges dentro de la misma lista/sección.
- Si ambos están pendientes y tienen cantidad, suma o conserva la cantidad final más útil según tu criterio.
- Si uno está pendiente y el otro no, conserva el pendiente y elimina el no pendiente.
- Si una decisión es ambigua, decide tú con criterio práctico y explica reason.
- Los productos borrados no aparecen en el contexto y quedan fuera de la ecuación.

Formato del changes-json si aplicas cambios:
{
  "summary": "Resumen corto de la normalización",
  "canonicalProducts": [
    {
      "client_id": "new-platanos",
      "name": "Plátanos",
      "normalized_name": "platanos",
      "comparison_unit": "kg"
    }
  ],
  "canonicalProductUpdates": [
    {
      "id": "canonical-product-uuid",
      "name": "Plátanos",
      "normalized_name": "platanos",
      "comparison_unit": "kg",
      "reason": "La comparación por kg es más útil que por unidad"
    }
  ],
  "aliases": [
    {
      "canonical_product_id": "new-platanos",
      "alias": "plátano",
      "normalized_alias": "platano"
    }
  ],
  "itemUpdates": [
    {
      "id": "item-id",
      "canonical_product_id": "new-platanos",
      "name": "Plátanos",
      "quantity": "2",
      "reason": "Nombre singular unido al canónico habitual"
    }
  ],
  "itemMerges": [
    {
      "keep_item_id": "item-pendiente",
      "remove_item_id": "item-comprado",
      "canonical_product_id": "new-platanos",
      "name": "Plátanos",
      "notes": "Preferiblemente maduros",
      "quantity": "3",
      "purchased": false,
      "reason": "Misma lista y mismo producto; se conserva el pendiente"
    }
  ]
}

Notas del formato:
- canonical_product_id puede ser un UUID existente del contexto o un client_id creado en canonicalProducts.
- Si no hay cambios útiles, no ejecutes apply y explica por qué en el informe.
- Antes de aplicar cambios, lee el JSON de contexto.
- Al final, resume productos revisados, canónicos creados, aliases creados, actualizaciones, fusiones y casos dudosos.

El helper registrará la ejecución en shopping_product_normalization_runs y los cambios en shopping_product_normalization_changes para que aparezcan en la pestaña Normalización del Historial.
PROMPT

"$CODEX_BIN" exec \
  -C "$REPO_ROOT" \
  -s workspace-write \
  -o "$REPORT_PATH" \
  - < "$PROMPT_PATH"

printf "Jucart Codex product normalization report: %s\n" "$REPORT_PATH"
