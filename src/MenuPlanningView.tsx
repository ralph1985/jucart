import { FormEvent, useEffect, useMemo, useState } from "react";

import type { ShoppingList } from "./shoppingLists";
import {
  getLatestMenuProposal,
  getOrCreateMenuPlan,
  requestMenuPlanReview,
  saveMenuPlanDay,
} from "./menuPlanning";

type Props = { lists: ShoppingList[] };

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
function formatDay(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function MenuPlanningView({ lists }: Props) {
  const [scopeListId, setScopeListId] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Cargando menú…");
  const [proposalMessage, setProposalMessage] = useState("");
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + index);
        return date;
      }),
    [],
  );

  const selectedScopeListId = scopeListId || lists[0]?.id || "";
  useEffect(() => {
    if (!selectedScopeListId) return;
    let cancelled = false;
    void getOrCreateMenuPlan(selectedScopeListId, dayKey(days[0]))
      .then(({ plan, days: storedDays }) => {
        if (cancelled) return;
        setPlanId(plan.id);
        setValues(
          Object.fromEntries(
            storedDays.map((day: { plannedOn: string; content: string }) => [
              day.plannedOn,
              day.content,
            ]),
          ),
        );
        setMessage("");
        return getLatestMenuProposal(plan.id);
      })
      .then((proposal) => {
        if (proposal)
          setProposalMessage(
            proposal.status === "ready"
              ? `${proposal.items.length} productos listos para revisar.`
              : `Propuesta: ${proposal.status}.`,
          );
      })
      .catch(() => {
        if (!cancelled)
          setMessage("No se pudo cargar el menú. Comprueba la conexión.");
      });
    return () => {
      cancelled = true;
    };
  }, [days, selectedScopeListId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planId) return;
    setMessage("Guardando…");
    try {
      await Promise.all(
        days.map((day) =>
          saveMenuPlanDay(planId, dayKey(day), values[dayKey(day)] ?? ""),
        ),
      );
      setMessage("Menú guardado.");
    } catch {
      setMessage("No se pudo guardar el menú.");
    }
  }

  async function requestReview() {
    if (!planId) return;
    setProposalMessage("Solicitando revisión a Codex…");
    try {
      await Promise.all(
        days.map((day) =>
          saveMenuPlanDay(planId, dayKey(day), values[dayKey(day)] ?? ""),
        ),
      );
      await requestMenuPlanReview(planId);
      setProposalMessage("Codex está preparando la propuesta.");
    } catch {
      setProposalMessage("No se pudo solicitar la revisión de Codex.");
    }
  }

  return (
    <section aria-labelledby="menu-title" className="menuPlanningScreen">
      <header className="menuPlanningHeader">
        <h2 id="menu-title">Menú</h2>
        <p>Planifica desde hoy hasta los próximos seis días.</p>
      </header>
      <form onSubmit={save} className="menuPlanningForm">
        <label>
          Ámbito compartido
          <select
            value={selectedScopeListId}
            onChange={(event) => setScopeListId(event.target.value)}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
        {days.map((day) => (
          <label key={dayKey(day)}>
            <strong>{formatDay(day)}</strong>
            <textarea
              value={values[dayKey(day)] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [dayKey(day)]: event.target.value,
                }))
              }
              placeholder="¿Qué queréis comer?"
              rows={3}
            />
          </label>
        ))}
        <button type="submit" disabled={!planId}>
          Guardar menú
        </button>
        <button type="button" disabled={!planId} onClick={requestReview}>
          Revisar con Codex
        </button>
        {message ? <p role="status">{message}</p> : null}
        <p className="menuPlanningHint">
          Codex prepara una propuesta que podrás revisar antes de añadir
          productos.
        </p>
        {proposalMessage ? <p role="status">{proposalMessage}</p> : null}
      </form>
    </section>
  );
}
