import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  createMenuDish,
  createMenuDishType,
  deleteMenuDish,
  getMenuDishLibrary,
  getMenuDishTypes,
  getMenuDishes,
  updateMenuDish,
} from "./menuPlanning";
import type { MenuDish, MenuDishType } from "./menuPlanning";

type DishTab = "pending" | "cooked";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatCookedAt(value: string) {
  return dateFormatter.format(new Date(value));
}

export function MenuPlanningView() {
  const [libraryId, setLibraryId] = useState("");
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [dishTypes, setDishTypes] = useState<MenuDishType[]>([]);
  const [dishName, setDishName] = useState("");
  const [dishTypeId, setDishTypeId] = useState("");
  const [activeTab, setActiveTab] = useState<DishTab>("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [message, setMessage] = useState("Cargando platos…");
  const [isSaving, setIsSaving] = useState(false);

  const loadCollection = useCallback(async (nextLibraryId: string) => {
    setMessage("Cargando platos…");
    try {
      const [nextDishes, nextTypes] = await Promise.all([
        getMenuDishes(nextLibraryId),
        getMenuDishTypes(nextLibraryId),
      ]);
      setDishes(nextDishes);
      setDishTypes(nextTypes);
      setMessage("");
    } catch {
      setMessage("No se pudo cargar la biblioteca de platos.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(getMenuDishLibrary)
      .then((nextLibraryId) => {
        setLibraryId(nextLibraryId);
        return loadCollection(nextLibraryId);
      })
      .catch(() => setMessage("No se pudo cargar la biblioteca de platos."));
  }, [loadCollection]);

  const collectionDishes = libraryId ? dishes : null;
  const collectionTypes = libraryId ? dishTypes : [];

  const visibleDishes = useMemo(
    () =>
      (collectionDishes ?? []).filter(
        (dish) =>
          dish.status === activeTab &&
          (!typeFilter || dish.dishTypeId === typeFilter),
      ),
    [activeTab, collectionDishes, typeFilter],
  );
  const pendingCount = (collectionDishes ?? []).filter(
    (dish) => dish.status === "pending",
  ).length;
  const cookedCount = (collectionDishes ?? []).filter(
    (dish) => dish.status === "cooked",
  ).length;
  const statusMessage = libraryId ? message : message;

  async function addDish(event: FormEvent) {
    event.preventDefault();
    if (!libraryId || !dishName.trim() || isSaving) return;
    setIsSaving(true);
    setMessage("Guardando plato…");
    try {
      const dish = await createMenuDish(
        libraryId,
        dishName,
        dishTypeId || null,
      );
      setDishes((current) => [dish, ...current]);
      setDishName("");
      setMessage("Plato añadido.");
    } catch {
      setMessage(
        "No se pudo guardar el plato. Comprueba que no esté repetido.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function changeDishStatus(dish: MenuDish) {
    const status = dish.status === "pending" ? "cooked" : "pending";
    try {
      const updated = await updateMenuDish(dish.id, {
        status,
        cookedAt: status === "cooked" ? new Date().toISOString() : null,
      });
      setDishes((current) =>
        current.map((currentDish) =>
          currentDish.id === updated.id ? updated : currentDish,
        ),
      );
      setMessage(
        status === "cooked"
          ? "Plato marcado como cocinado."
          : "Plato recuperado.",
      );
    } catch {
      setMessage("No se pudo actualizar el estado del plato.");
    }
  }

  function startEditing(dish: MenuDish) {
    setEditingId(dish.id);
    setEditingName(dish.name);
    setEditingTypeId(dish.dishTypeId ?? "");
  }

  async function saveEdit(event: FormEvent, dish: MenuDish) {
    event.preventDefault();
    if (!editingName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateMenuDish(dish.id, {
        name: editingName,
        dishTypeId: editingTypeId || null,
      });
      setDishes((current) =>
        current.map((currentDish) =>
          currentDish.id === updated.id ? updated : currentDish,
        ),
      );
      setEditingId(null);
      setMessage("Plato actualizado.");
    } catch {
      setMessage("No se pudo actualizar el plato.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeDish(dish: MenuDish) {
    if (!window.confirm(`¿Eliminar «${dish.name}» de la biblioteca?`)) return;
    try {
      await deleteMenuDish(dish.id);
      setDishes((current) =>
        current.filter((currentDish) => currentDish.id !== dish.id),
      );
      setMessage("Plato eliminado.");
    } catch {
      setMessage("No se pudo eliminar el plato.");
    }
  }

  async function addDishType(event: FormEvent) {
    event.preventDefault();
    if (!libraryId || !newTypeName.trim()) return;
    try {
      await createMenuDishType(libraryId, newTypeName);
      setNewTypeName("");
      setDishTypes(await getMenuDishTypes(libraryId));
      setMessage("Tipo de plato añadido.");
    } catch {
      setMessage("No se pudo guardar el tipo de plato.");
    }
  }

  return (
    <section aria-labelledby="menu-title" className="menuPlanningScreen">
      <header className="menuPlanningHeader">
        <div>
          <p className="menuPlanningEyebrow">Biblioteca compartida</p>
          <h2 id="menu-title">Platos</h2>
          <p>Ideas que podéis cocinar cuando no queráis pensar desde cero.</p>
        </div>
        <div className="menuPlanningCounts" aria-label="Resumen de platos">
          <span>
            <strong>{pendingCount}</strong> por cocinar
          </span>
          <span>
            <strong>{cookedCount}</strong> cocinados
          </span>
        </div>
      </header>

      <form onSubmit={addDish} className="menuAddDishForm">
        <label htmlFor="new-dish">Añadir un plato</label>
        <div className="menuAddDishControls">
          <input
            id="new-dish"
            value={dishName}
            onChange={(event) => setDishName(event.target.value)}
            placeholder="Lentejas, tortilla de patata…"
            disabled={!libraryId || isSaving}
          />
          <select
            aria-label="Tipo del nuevo plato"
            value={dishTypeId}
            onChange={(event) => setDishTypeId(event.target.value)}
            disabled={!libraryId || isSaving}
          >
            <option value="">Sin tipo</option>
            {collectionTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!dishName.trim() || !libraryId || isSaving}
          >
            Añadir
          </button>
        </div>
      </form>

      <div
        className="menuDishTabs"
        role="tablist"
        aria-label="Estado de los platos"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
        >
          Por cocinar <span>{pendingCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "cooked"}
          onClick={() => setActiveTab("cooked")}
        >
          Cocinados <span>{cookedCount}</span>
        </button>
      </div>

      {collectionTypes.length > 0 ? (
        <label className="menuFilterField">
          Filtrar por tipo
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Todos los tipos</option>
            {collectionTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <section
        className="menuDishList"
        aria-live="polite"
        aria-label={
          activeTab === "pending" ? "Platos por cocinar" : "Platos cocinados"
        }
      >
        {visibleDishes.length > 0 ? (
          visibleDishes.map((dish) => (
            <article className="menuDishRow" key={dish.id}>
              {editingId === dish.id ? (
                <form
                  className="menuDishEditForm"
                  onSubmit={(event) => void saveEdit(event, dish)}
                >
                  <input
                    aria-label={`Editar ${dish.name}`}
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    autoFocus
                  />
                  <select
                    aria-label={`Tipo de ${dish.name}`}
                    value={editingTypeId}
                    onChange={(event) => setEditingTypeId(event.target.value)}
                  >
                    <option value="">Sin tipo</option>
                    {collectionTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Guardar</button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <div className="menuDishCopy">
                    <strong>{dish.name}</strong>
                    <span>
                      {dish.typeName ?? "Sin tipo"}
                      {dish.cookedAt
                        ? ` · ${formatCookedAt(dish.cookedAt)}`
                        : ""}
                    </span>
                  </div>
                  <div className="menuDishActions">
                    <button
                      type="button"
                      onClick={() => void changeDishStatus(dish)}
                    >
                      {dish.status === "pending"
                        ? "Marcar cocinado"
                        : "Recuperar"}
                    </button>
                    <button type="button" onClick={() => startEditing(dish)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => void removeDish(dish)}>
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        ) : message ? null : (
          <p className="menuEmptyState">
            {activeTab === "pending"
              ? "Todavía no hay platos por cocinar."
              : "Aún no hay platos cocinados."}
          </p>
        )}
      </section>

      <details className="menuDishTypes">
        <summary>Gestionar tipos de plato</summary>
        <form onSubmit={addDishType}>
          <label htmlFor="new-dish-type">Nuevo tipo</label>
          <div>
            <input
              id="new-dish-type"
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              placeholder="Pasta, pescado…"
            />
            <button type="submit" disabled={!newTypeName.trim() || !libraryId}>
              Añadir tipo
            </button>
          </div>
        </form>
      </details>

      {statusMessage ? (
        <p className="menuPlanningMessage" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
