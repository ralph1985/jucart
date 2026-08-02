#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${JUCART_TICKETS_LOG_DIR:-$REPO_ROOT/var/log}"
CODEX_BIN="${CODEX_BIN:-codex}"
CODEX_REASONING_EFFORT="${CODEX_REASONING_EFFORT:-low}"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
RUN_STARTED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
FILES_DIR="${JUCART_TICKETS_FILES_DIR:-/tmp/jucart-tickets-files-$STAMP}"
CONTEXT_PATH="$LOG_DIR/jucart-tickets-context-$STAMP.json"
PROMPT_PATH="$LOG_DIR/jucart-tickets-codex-$STAMP.prompt.md"
REPORT_PATH="$LOG_DIR/jucart-tickets-codex-$STAMP.md"
EXTRACTION_PATH="$LOG_DIR/jucart-tickets-extraction-$STAMP.json"

mkdir -p "$LOG_DIR"

printf "[%s] Ticket processing execution started (scheduled target: 04:00 Europe/Madrid).\n" "$RUN_STARTED_AT"

node "$SCRIPT_DIR/process-supabase-tickets.mjs" export "$CONTEXT_PATH" "$FILES_DIR"

if ! grep -q '"tickets": \[' "$CONTEXT_PATH" || grep -q '"tickets": \[\]' "$CONTEXT_PATH"; then
  printf "[%s] Ticket processing result: no hay tickets pendientes.\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  exit 0
fi

cat > "$PROMPT_PATH" <<PROMPT
Trabaja en español. Estás automatizando Jucart, una app privada de lista de la compra.

Objetivo: procesar tickets de supermercado pendientes y guardar líneas extraídas auditables en Supabase.

Contexto JSON exportado desde Supabase:
$CONTEXT_PATH

Los archivos privados del ticket ya están descargados en rutas locales dentro del JSON. Debes inspeccionar esas imágenes o PDFs y extraer todas las líneas de compra visibles.

Reglas estrictas:
- No edites archivos del repo.
- No hagas commit, push, merge ni PR.
- No toques .env ni credenciales.
- Solo puedes modificar Supabase mediante:
  node scripts/process-supabase-tickets.mjs apply <extraction-json>
- Procesa todos los tickets pendientes que aparezcan en el contexto.
- Trata varios archivos del mismo ticket como un único ticket; el orden puede no importar, pero usa position como ayuda.
- Si una línea no es fiable, inclúyela igualmente y marca needs_review=true con review_reason.
- Si alguna línea queda needs_review, el ticket debe quedar needs_review por el helper.
- Las líneas válidas deben guardar precio aunque el ticket quede needs_review.
- Usa producto canónico existente siempre que encaje. Si no existe, crea uno general en canonicalProducts.
- Los productos canónicos deben ser generales, no por marca/formato salvo que sea necesario.
- Usa comparison_unit entre kg, l o unit.
- Compara por precio unitario cuando el ticket muestre peso/litros/unidades.
- Usa total_price como precio final pagado.
- Usa original_total_price y discount_total solo si hay descuento claro en el ticket. Si no, déjalos null.
- Usa purchased_at con la fecha/hora del ticket en ISO si se puede leer; si no, omítelo.
- No inventes líneas que no se ven.

Formato exacto del extraction-json:
{
  "tickets": [
    {
      "id": "ticket-uuid",
      "purchased_at": "2026-07-25T20:10:00+02:00",
      "canonicalProducts": [
        {
          "client_id": "new-queso-tierno",
          "name": "Queso tierno",
          "normalized_name": "queso tierno",
          "comparison_unit": "kg"
        }
      ],
      "lines": [
        {
          "line_index": 0,
          "raw_text": "1 BANANA 0,860 kg 1,55 €/kg 1,33",
          "product_name": "Banana",
          "canonical_product_id": "existing-canonical-uuid-or-client-id",
          "quantity": "0,860 kg",
          "unit_price": 1.55,
          "total_price": 1.33,
          "original_total_price": null,
          "discount_total": null,
          "needs_review": false,
          "review_reason": null
        }
      ]
    }
  ]
}

Notas:
- canonical_product_id puede ser un UUID existente del contexto o un client_id creado en canonicalProducts.
- Para productos sin canónico fiable, deja canonical_product_id vacío y marca needs_review=true.
- Antes de aplicar, valida mentalmente que la suma de total_price coincide con el total del ticket si aparece.
- Guarda el JSON en:
  $EXTRACTION_PATH
- Después ejecuta:
  node scripts/process-supabase-tickets.mjs apply "$EXTRACTION_PATH"
- Al final, resume tickets procesados, líneas extraídas, total detectado, canónicos creados y líneas en revisión.
PROMPT

if ! "$CODEX_BIN" exec \
  -C "$REPO_ROOT" \
  -s workspace-write \
  -c "model_reasoning_effort=$CODEX_REASONING_EFFORT" \
  -o "$REPORT_PATH" \
  - < "$PROMPT_PATH"; then
  node "$SCRIPT_DIR/process-supabase-tickets.mjs" fail "$CONTEXT_PATH" "Codex no pudo procesar el ticket."
  exit 1
fi

printf "[%s] Ticket processing execution finished; report: %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$REPORT_PATH"
