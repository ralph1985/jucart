import { FormEvent, useEffect, useMemo, useState } from "react";

import type { ShoppingList } from "./shoppingLists";
import {
  confirmMenuProposal,
  getLatestMenuProposal,
  getOrCreateMenuPlan,
  requestMenuPlanReview,
  saveMenuPlanDay,
  updateMenuProposalItem,
} from "./menuPlanning";
import type { MenuProposal } from "./menuPlanning";

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
  const [proposal, setProposal] = useState<MenuProposal | null>(null);
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
        if (proposal) {
          setProposal(proposal);
          setProposalMessage(
            proposal.status === "ready"
              ? `${proposal.items.length} productos listos para revisar.`
              : `Propuesta: ${proposal.status}.`,
          );
        }
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

  async function toggleProposalItem(item: MenuProposal["items"][number]) {
    const selected = !item.selected;
    setProposal((current) =>
      current
        ? {
            ...current,
            items: current.items.map((currentItem) =>
              currentItem.id === item.id
                ? { ...currentItem, selected }
                : currentItem,
            ),
          }
        : current,
    );
    try {
      await updateMenuProposalItem(item.id, { ...item, selected });
    } catch {
      setProposalMessage("No se pudo guardar ese cambio.");
    }
  }

  async function changeProposalItem(
    item: MenuProposal["items"][number],
    values: Partial<MenuProposal["items"][number]>,
  ) {
    const next = { ...item, ...values };
    setProposal((current) =>
      current
        ? {
            ...current,
            items: current.items.map((currentItem) =>
              currentItem.id === item.id ? next : currentItem,
            ),
          }
        : current,
    );
    try {
      await updateMenuProposalItem(item.id, next);
    } catch {
      setProposalMessage("No se pudo guardar ese cambio.");
    }
  }

  async function confirmProposal() {
    if (!proposal || !planId) return;
    setProposalMessage("Añadiendo productos a las listas…");
    try {
      await confirmMenuProposal(proposal.id);
      setProposal(await getLatestMenuProposal(planId));
      setProposalMessage("Productos añadidos a las listas seleccionadas.");
    } catch {
      setProposalMessage("No se pudieron añadir los productos.");
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
        {proposal?.status === "ready" ? (
          <section className="menuProposal" aria-label="Propuesta de compra">
            <h3>Propuesta de compra</h3>
            {proposal.items.map((item) => (
              <fieldset key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => void toggleProposalItem(item)}
                  />{" "}
                  Añadir
                </label>
                <label>
                  Producto
                  <input
                    value={item.name}
                    onChange={(event) =>
                      void changeProposalItem(item, {
                        name: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Cantidad
                  <input
                    value={item.quantity ?? ""}
                    onChange={(event) =>
                      void changeProposalItem(item, {
                        quantity: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  Lista
                  <select
                    value={item.destinationListId}
                    onChange={(event) =>
                      void changeProposalItem(item, {
                        destinationListId: event.target.value,
                      })
                    }
                  >
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
            ))}
            <button type="button" onClick={confirmProposal}>
              Añadir seleccionados
            </button>
          </section>
        ) : null}
      </form>
    </section>
  );
}
