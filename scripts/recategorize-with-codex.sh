#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${JUCART_RECAT_LOG_DIR:-$REPO_ROOT/var/log}"
CODEX_BIN="${CODEX_BIN:-codex}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
CONTEXT_PATH="$LOG_DIR/jucart-recategorize-context-$STAMP.json"
PROMPT_PATH="$LOG_DIR/jucart-recategorize-codex-$STAMP.prompt.md"
REPORT_PATH="$LOG_DIR/jucart-recategorize-codex-$STAMP.md"

mkdir -p "$LOG_DIR"

node "$SCRIPT_DIR/recategorize-supabase-catalog.mjs" export "$CONTEXT_PATH"

cat > "$PROMPT_PATH" <<PROMPT
Trabaja en español. Estás automatizando Jucart, una app privada de lista de la compra.

Objetivo: revisar una vez al día la clasificación de productos y actualizar Supabase directamente si hay recategorizaciones claras.

Contexto JSON exportado desde Supabase:
$CONTEXT_PATH

Reglas estrictas:
- No edites archivos del repo.
- No hagas commit, push, merge ni PR.
- No toques .env ni credenciales.
- Solo puedes modificar Supabase mediante:
  node scripts/recategorize-supabase-catalog.mjs apply <changes-json>
- Usa únicamente categorías existentes en shopping_categories.
- Puedes añadir entradas a shopping_product_catalog_entries si un producto real revela un nombre o variante útil para clasificar futuros productos.
- Actualiza shopping_items.category_id solo cuando el cambio sea evidente.
- Si tienes dudas, deja el producto sin modificar y explícalo en el informe.

Formato del changes-json si aplicas cambios:
{
  "catalogEntries": [
    {
      "category_id": "vegetables",
      "name": "cebollas"
    }
  ],
  "itemUpdates": [
    {
      "id": "item-id",
      "category_id": "vegetables"
    }
  ]
}

Antes de aplicar cambios, lee el JSON de contexto. Al final, resume:
- productos revisados;
- entradas de catálogo añadidas;
- productos recategorizados;
- productos dudosos no tocados.
PROMPT

"$CODEX_BIN" exec \
  -C "$REPO_ROOT" \
  -s workspace-write \
  -a never \
  -o "$REPORT_PATH" \
  - < "$PROMPT_PATH"

printf "Jucart Codex recategorization report: %s\n" "$REPORT_PATH"
