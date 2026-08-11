import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createMenuDish,
  createMenuDishCategory,
  createMenuDishType,
  deleteMenuDish,
  deleteMenuDishType,
  getLatestMenuDishRecategorization,
  getMenuDishLibrary,
  getMenuDishCategories,
  getMenuDishTypes,
  getMenuDishes,
  requestMenuDishRecategorization,
  undoMenuDishRecategorization,
  updateMenuDish,
  updateMenuDishCategory,
  updateMenuDishType,
  deleteMenuDishCategory,
} from "./menuPlanning";
import type {
  MenuDish,
  MenuDishCategory,
  MenuDishRecategorizationRun,
  MenuDishType,
} from "./menuPlanning";
import { getRemoteAction } from "./remoteActions";
import type { RemoteAction } from "./remoteActions";

type DishTab = "pending" | "cooked";
type DishIconName = "check" | "edit" | "trash" | "undo";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatCookedAt(value: string) {
  return dateFormatter.format(new Date(value));
}

function DishIcon({ name }: { name: DishIconName }) {
  const paths: Record<DishIconName, string[]> = {
    check: ["M5 12l4 4L19 6"],
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"],
    trash: [
      "M3 6h18",
      "M8 6V4h8v2",
      "M6 6l1 14h10l1-14",
      "M10 11v5",
      "M14 11v5",
    ],
    undo: ["M9 14l-4-4 4-4", "M5 10h9a5 5 0 1 1 0 10h-2"],
  };

  return (
    <svg
      className="menuDishIcon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

export function MenuPlanningView() {
  const [libraryId, setLibraryId] = useState("");
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [dishTypes, setDishTypes] = useState<MenuDishType[]>([]);
  const [dishCategories, setDishCategories] = useState<MenuDishCategory[]>([]);
  const [dishName, setDishName] = useState("");
  const [dishTypeId, setDishTypeId] = useState("");
  const [dishCategoryIds, setDishCategoryIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DishTab>("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [editingCategoryIds, setEditingCategoryIds] = useState<string[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
  const [editingTypeIdInModal, setEditingTypeIdInModal] = useState<
    string | null
  >(null);
  const [editingTypeName, setEditingTypeName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [remoteAction, setRemoteAction] = useState<RemoteAction | null>(null);
  const [latestRun, setLatestRun] =
    useState<MenuDishRecategorizationRun | null>(null);
  const [message, setMessage] = useState("Cargando platos…");
  const [modalMessage, setModalMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const typesModalRef = useRef<HTMLElement>(null);
  const typesTriggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const loadCollection = useCallback(async (nextLibraryId: string) => {
    setMessage("Cargando platos…");
    try {
      const [nextDishes, nextTypes, nextCategories, nextRun] =
        await Promise.all([
          getMenuDishes(nextLibraryId),
          getMenuDishTypes(nextLibraryId),
          getMenuDishCategories(nextLibraryId),
          getLatestMenuDishRecategorization(nextLibraryId),
        ]);
      setDishes(nextDishes);
      setDishTypes(nextTypes);
      setDishCategories(nextCategories);
      setLatestRun(nextRun);
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

  useEffect(() => {
    if (
      !remoteAction ||
      !libraryId ||
      !["pending", "running"].includes(remoteAction.status)
    )
      return;
    const intervalId = window.setInterval(() => {
      void getRemoteAction(remoteAction.id)
        .then((nextAction) => {
          if (!nextAction) return;
          setRemoteAction(nextAction);
          if (nextAction.status === "completed") void loadCollection(libraryId);
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [libraryId, loadCollection, remoteAction]);

  useEffect(() => {
    if (!isTypesModalOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    typesModalRef.current?.focus();
    const trigger = typesTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsTypesModalOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      (previousFocusRef.current ?? trigger)?.focus();
      previousFocusRef.current = null;
    };
  }, [isTypesModalOpen]);

  const collectionDishes = libraryId ? dishes : null;
  const collectionTypes = libraryId ? dishTypes : [];
  const visibleDishes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("es");
    return (collectionDishes ?? []).filter((dish) => {
      const matchesQuery =
        !normalizedQuery ||
        `${dish.name} ${dish.categories.map((category) => category.name).join(" ")}`
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      return (
        dish.status === activeTab &&
        matchesQuery &&
        (!typeFilter || dish.dishTypeId === typeFilter) &&
        (!categoryFilter ||
          dish.categories.some((category) => category.id === categoryFilter))
      );
    });
  }, [activeTab, categoryFilter, collectionDishes, searchQuery, typeFilter]);
  const pendingCount = (collectionDishes ?? []).filter(
    (dish) => dish.status === "pending",
  ).length;
  const cookedCount = (collectionDishes ?? []).filter(
    (dish) => dish.status === "cooked",
  ).length;
  const typeUsage = useMemo(
    () =>
      new Map(
        dishTypes.map((type) => [
          type.id,
          dishes.filter((dish) => dish.dishTypeId === type.id).length,
        ]),
      ),
    [dishTypes, dishes],
  );
  const categoryUsage = useMemo(
    () =>
      new Map(
        dishCategories.map((category) => [
          category.id,
          dishes.filter((dish) =>
            dish.categories.some(
              (dishCategory) => dishCategory.id === category.id,
            ),
          ).length,
        ]),
      ),
    [dishCategories, dishes],
  );
  const statusMessage = message;
  const recategorizationRunning =
    remoteAction?.status === "pending" || remoteAction?.status === "running";

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
        dishCategoryIds,
      );
      setDishes((current) => [dish, ...current]);
      setDishName("");
      setDishCategoryIds([]);
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
    setEditingCategoryIds(dish.categories.map((category) => category.id));
  }

  async function saveEdit(event: FormEvent, dish: MenuDish) {
    event.preventDefault();
    if (!editingName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateMenuDish(dish.id, {
        name: editingName,
        dishTypeId: editingTypeId || null,
        categoryIds: editingCategoryIds,
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
      setModalMessage("Tipo de plato añadido.");
    } catch {
      setModalMessage("No se pudo guardar el tipo de plato.");
    }
  }

  async function addDishCategory(event: FormEvent) {
    event.preventDefault();
    if (!libraryId || !newCategoryName.trim()) return;
    try {
      await createMenuDishCategory(libraryId, newCategoryName);
      setNewCategoryName("");
      setDishCategories(await getMenuDishCategories(libraryId));
      setModalMessage("Categoría culinaria añadida.");
    } catch {
      setModalMessage("No se pudo guardar la categoría culinaria.");
    }
  }

  async function saveDishCategory(
    event: FormEvent,
    category: MenuDishCategory,
  ) {
    event.preventDefault();
    if (!editingCategoryName.trim()) return;
    try {
      await updateMenuDishCategory(category.id, editingCategoryName);
      setDishCategories(await getMenuDishCategories(libraryId));
      setEditingCategoryId(null);
      setModalMessage("Categoría culinaria actualizada.");
    } catch {
      setModalMessage("No se pudo actualizar la categoría culinaria.");
    }
  }

  async function removeDishCategory(category: MenuDishCategory) {
    if (
      !window.confirm(
        `¿Eliminar «${category.name}»? Se quitará de los platos, pero no se borrarán platos.`,
      )
    )
      return;
    try {
      await deleteMenuDishCategory(category.id);
      setDishCategories(await getMenuDishCategories(libraryId));
      setDishes(await getMenuDishes(libraryId));
      setModalMessage("Categoría culinaria eliminada.");
    } catch {
      setModalMessage("No se pudo eliminar la categoría culinaria.");
    }
  }

  async function saveDishType(event: FormEvent, type: MenuDishType) {
    event.preventDefault();
    if (!editingTypeName.trim()) return;
    try {
      await updateMenuDishType(type.id, editingTypeName);
      setDishTypes(await getMenuDishTypes(libraryId));
      setEditingTypeIdInModal(null);
      setModalMessage("Tipo de plato actualizado.");
    } catch {
      setModalMessage("No se pudo actualizar el tipo de plato.");
    }
  }

  async function removeDishType(type: MenuDishType) {
    if (
      !window.confirm(`¿Eliminar «${type.name}»? Los platos quedarán sin tipo.`)
    )
      return;
    try {
      await deleteMenuDishType(type.id);
      setDishTypes(await getMenuDishTypes(libraryId));
      setDishes(await getMenuDishes(libraryId));
      setModalMessage("Tipo de plato eliminado.");
    } catch {
      setModalMessage("No se pudo eliminar el tipo de plato.");
    }
  }

  function openTypesModal() {
    setModalMessage("");
    setIsTypesModalOpen(true);
  }

  function closeTypesModal() {
    setIsTypesModalOpen(false);
    setEditingTypeIdInModal(null);
  }

  async function requestRecategorization() {
    if (!libraryId || recategorizationRunning) return;
    setModalMessage("Solicitando recategorización…");
    try {
      const actionId = await requestMenuDishRecategorization(libraryId);
      setRemoteAction({
        id: actionId,
        action: "recategorize_menu_dishes",
        status: "pending",
        resultSummary: null,
        errorMessage: null,
        createdAt: Date.now(),
        startedAt: null,
        finishedAt: null,
      });
      setModalMessage("Codex revisará los platos automáticamente.");
    } catch {
      setModalMessage("No se pudo solicitar la recategorización.");
    }
  }

  async function undoRecategorization() {
    if (!latestRun || latestRun.revertedAt) return;
    try {
      await undoMenuDishRecategorization(latestRun.id);
      await loadCollection(libraryId);
      setModalMessage("Última recategorización deshecha.");
    } catch {
      setModalMessage("No se pudo deshacer la recategorización.");
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
          <select
            aria-label="Categorías del nuevo plato"
            multiple
            value={dishCategoryIds}
            onChange={(event) =>
              setDishCategoryIds(
                [...event.target.selectedOptions].map((option) => option.value),
              )
            }
            disabled={!libraryId || isSaving}
          >
            {dishCategories.length === 0 ? (
              <option value="" disabled>
                Sin categorías
              </option>
            ) : (
              dishCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            )}
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

      <div className="menuDishFilters">
        <label className="menuFilterField menuSearchField">
          Buscar platos
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre o categoría…"
          />
        </label>
        {collectionTypes.length > 0 ? (
          <label className="menuFilterField">
            Tipo funcional
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
        {dishCategories.length > 0 ? (
          <label className="menuFilterField">
            Categoría culinaria
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {dishCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

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
                  <select
                    aria-label={`Categorías de ${dish.name}`}
                    multiple
                    value={editingCategoryIds}
                    onChange={(event) =>
                      setEditingCategoryIds(
                        [...event.target.selectedOptions].map(
                          (option) => option.value,
                        ),
                      )
                    }
                  >
                    {dishCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
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
                    {dish.categories.length > 0 ? (
                      <div className="menuDishTags" aria-label="Categorías">
                        {dish.categories.map((category) => (
                          <span key={category.id}>{category.name}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="menuDishActions">
                    <button
                      className="menuDishIconButton"
                      type="button"
                      aria-label={`${dish.status === "pending" ? "Marcar cocinado" : "Recuperar"}: ${dish.name}`}
                      title={
                        dish.status === "pending"
                          ? "Marcar cocinado"
                          : "Recuperar"
                      }
                      onClick={() => void changeDishStatus(dish)}
                    >
                      <DishIcon
                        name={dish.status === "pending" ? "check" : "undo"}
                      />
                    </button>
                    <button
                      className="menuDishIconButton"
                      type="button"
                      aria-label={`Editar: ${dish.name}`}
                      title="Editar"
                      onClick={() => startEditing(dish)}
                    >
                      <DishIcon name="edit" />
                    </button>
                    <button
                      className="menuDishIconButton menuDishIconButtonDanger"
                      type="button"
                      aria-label={`Eliminar: ${dish.name}`}
                      title="Eliminar"
                      onClick={() => void removeDish(dish)}
                    >
                      <DishIcon name="trash" />
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

      <button
        ref={typesTriggerRef}
        className="menuManageTypesButton"
        type="button"
        onClick={openTypesModal}
        disabled={!libraryId}
      >
        Gestionar tipos de plato
      </button>
      {statusMessage ? (
        <p className="menuPlanningMessage" role="status">
          {statusMessage}
        </p>
      ) : null}

      {isTypesModalOpen ? (
        <div className="menuModalBackdrop" onClick={closeTypesModal}>
          <section
            ref={typesModalRef}
            className="menuTypesModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-types-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="menuTypesModalHeader">
              <div>
                <p className="menuPlanningEyebrow">Biblioteca compartida</p>
                <h3 id="menu-types-title">Tipos de plato</h3>
              </div>
              <button
                className="menuModalCloseButton"
                type="button"
                aria-label="Cerrar tipos de plato"
                onClick={closeTypesModal}
              >
                ×
              </button>
            </header>
            <p className="menuTypesModalIntro">
              Organiza la biblioteca sin ocupar espacio en la vista principal.
            </p>
            <div className="menuTypeList">
              {dishTypes.map((type) =>
                editingTypeIdInModal === type.id ? (
                  <form
                    className="menuTypeRow"
                    key={type.id}
                    onSubmit={(event) => void saveDishType(event, type)}
                  >
                    <input
                      aria-label={`Renombrar ${type.name}`}
                      value={editingTypeName}
                      onChange={(event) =>
                        setEditingTypeName(event.target.value)
                      }
                      autoFocus
                    />
                    <button type="submit">Guardar</button>
                    <button
                      type="button"
                      onClick={() => setEditingTypeIdInModal(null)}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="menuTypeRow" key={type.id}>
                    <span>
                      <strong>{type.name}</strong>
                      <small>{typeUsage.get(type.id) ?? 0} platos</small>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTypeIdInModal(type.id);
                        setEditingTypeName(type.name);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDishType(type)}
                    >
                      Eliminar
                    </button>
                  </div>
                ),
              )}
            </div>
            <form className="menuTypeAddForm" onSubmit={addDishType}>
              <label htmlFor="new-dish-type">Nuevo tipo</label>
              <div>
                <input
                  id="new-dish-type"
                  value={newTypeName}
                  onChange={(event) => setNewTypeName(event.target.value)}
                  placeholder="Pasta, pescado…"
                />
                <button type="submit" disabled={!newTypeName.trim()}>
                  Añadir
                </button>
              </div>
            </form>
            <section
              className="menuCategoryManager"
              aria-labelledby="menu-categories-title"
            >
              <div className="menuManagerSectionHeader">
                <div>
                  <p className="menuPlanningEyebrow">Nueva clasificación</p>
                  <h4 id="menu-categories-title">Categorías culinarias</h4>
                </div>
                <span>{dishCategories.length}</span>
              </div>
              <p className="menuTypesModalIntro">
                Puedes asignar varias categorías a cada plato para encontrar
                ideas por ingrediente o preparación.
              </p>
              <div className="menuCategoryList">
                {dishCategories.map((category) =>
                  editingCategoryId === category.id ? (
                    <form
                      className="menuTypeRow"
                      key={category.id}
                      onSubmit={(event) =>
                        void saveDishCategory(event, category)
                      }
                    >
                      <input
                        aria-label={`Renombrar categoría ${category.name}`}
                        value={editingCategoryName}
                        onChange={(event) =>
                          setEditingCategoryName(event.target.value)
                        }
                        autoFocus
                      />
                      <button type="submit">Guardar</button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <div className="menuTypeRow" key={category.id}>
                      <span>
                        <strong>{category.name}</strong>
                        <small>
                          {categoryUsage.get(category.id) ?? 0} platos
                        </small>
                      </span>
                      <button
                        type="button"
                        aria-label={`Editar categoría ${category.name}`}
                        onClick={() => {
                          setEditingCategoryId(category.id);
                          setEditingCategoryName(category.name);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar categoría ${category.name}`}
                        onClick={() => void removeDishCategory(category)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ),
                )}
              </div>
              <form className="menuTypeAddForm" onSubmit={addDishCategory}>
                <label htmlFor="new-dish-category">Nueva categoría</label>
                <div>
                  <input
                    id="new-dish-category"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Pasta, verduras…"
                  />
                  <button
                    type="submit"
                    aria-label="Añadir categoría"
                    disabled={!newCategoryName.trim()}
                  >
                    Añadir
                  </button>
                </div>
              </form>
            </section>
            <section
              className="menuRecategorizationPanel"
              aria-label="Recategorización con Codex"
            >
              <h4>Recategorizar con Codex</h4>
              <p>
                Analiza los nombres y asigna automáticamente los tipos más
                claros.
              </p>
              <button
                type="button"
                onClick={() => void requestRecategorization()}
                disabled={recategorizationRunning || dishes.length === 0}
              >
                {recategorizationRunning
                  ? "Recategorizando…"
                  : "Recategorizar platos"}
              </button>
              {remoteAction?.status === "failed" ? (
                <p role="alert">
                  {remoteAction.errorMessage ?? "La recategorización falló."}
                </p>
              ) : null}
              {remoteAction?.status === "completed" ? (
                <p role="status">
                  {remoteAction.resultSummary ??
                    latestRun?.summary ??
                    "Recategorización completada."}
                </p>
              ) : null}
              {latestRun && !latestRun.revertedAt ? (
                <button
                  className="menuUndoRecategorizationButton"
                  type="button"
                  onClick={() => void undoRecategorization()}
                >
                  Deshacer última recategorización (
                  {latestRun.dishesRecategorized})
                </button>
              ) : null}
            </section>
            {modalMessage ? (
              <p className="menuPlanningMessage" role="status">
                {modalMessage}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
