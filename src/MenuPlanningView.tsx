import {
  FormEvent,
  PointerEventHandler,
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
  getMenuDishLibrary,
  getMenuDishCategories,
  getMenuDishTypes,
  getMenuDishes,
  updateMenuDish,
  updateMenuDishCategory,
  updateMenuDishType,
  deleteMenuDishCategory,
} from "./menuPlanning";
import type { MenuDish, MenuDishCategory, MenuDishType } from "./menuPlanning";
import { useSheetDrag } from "./hooks/useSheetDrag";
import { BottomSheetFrame } from "./components/ui/BottomSheetFrame";
import { ConfirmSheet } from "./components/ui/ConfirmSheet";
import { FloatingActionButton } from "./components/app/FloatingActionButton";

type MenuPlanningViewProps = {
  onButtonPointerDown?: PointerEventHandler<HTMLButtonElement>;
};

type DishTab = "pending" | "cooked";
type DishSort = "default" | "rating-desc" | "rating-asc";
type ClassificationTab = "types" | "categories";
type DishConfirmation = {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
};
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

function DishRating({
  dish,
  onRate,
}: {
  dish: MenuDish;
  onRate: (rating: number) => void;
}) {
  return (
    <div
      className="menuDishRating"
      role="group"
      aria-label={`Valorar ${dish.name}`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const isSelected = dish.rating === rating;
        return (
          <button
            key={rating}
            className="menuDishRatingButton"
            type="button"
            aria-label={
              isSelected
                ? `Quitar valoración de ${dish.name}`
                : `Valorar ${dish.name} con ${rating} ${rating === 1 ? "estrella" : "estrellas"}`
            }
            aria-pressed={isSelected}
            title={isSelected ? "Quitar valoración" : `Valorar con ${rating}`}
            onClick={() => onRate(isSelected ? 0 : rating)}
          >
            {dish.rating !== null && rating <= dish.rating ? "★" : "☆"}
          </button>
        );
      })}
      {dish.rating !== null ? (
        <span className="menuDishRatingValue">{dish.rating}/5</span>
      ) : null}
    </div>
  );
}

export function MenuPlanningView({
  onButtonPointerDown = () => undefined,
}: MenuPlanningViewProps) {
  const menuScreenRef = useRef<HTMLElement>(null);
  const [libraryId, setLibraryId] = useState("");
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [dishTypes, setDishTypes] = useState<MenuDishType[]>([]);
  const [dishCategories, setDishCategories] = useState<MenuDishCategory[]>([]);
  const [dishName, setDishName] = useState("");
  const [dishTypeId, setDishTypeId] = useState("");
  const [dishCategoryIds, setDishCategoryIds] = useState<string[]>([]);
  const [dishDescription, setDishDescription] = useState("");
  const [dishComment, setDishComment] = useState("");
  const [activeTab, setActiveTab] = useState<DishTab>("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dishSort, setDishSort] = useState<DishSort>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [editingCategoryIds, setEditingCategoryIds] = useState<string[]>([]);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingComment, setEditingComment] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
  const [classificationTab, setClassificationTab] =
    useState<ClassificationTab>("types");
  const [isDishSheetOpen, setIsDishSheetOpen] = useState(false);
  const [dishConfirmation, setDishConfirmation] =
    useState<DishConfirmation | null>(null);
  const [editingTypeIdInModal, setEditingTypeIdInModal] = useState<
    string | null
  >(null);
  const [editingTypeName, setEditingTypeName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [message, setMessage] = useState("Cargando platos…");
  const [modalMessage, setModalMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const typesModalRef = useRef<HTMLElement>(null);
  const classificationBackdropRef = useRef<HTMLDivElement>(null);
  const typesTriggerRef = useRef<HTMLButtonElement>(null);
  const dishSheetBackdropRef = useRef<HTMLDivElement>(null);
  const dishSheetRef = useRef<HTMLElement>(null);
  const confirmationBackdropRef = useRef<HTMLDivElement>(null);
  const confirmationSheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dishTriggerRef = useRef<HTMLButtonElement>(null);

  const {
    handleEnd: handleDishSheetDragEnd,
    handleMove: handleDishSheetDragMove,
    handleStart: handleDishSheetDragStart,
    offset: dishSheetDragOffset,
    reset: resetDishSheetDrag,
  } = useSheetDrag({
    onDismiss: () => closeDishSheet(),
  });
  const {
    handleEnd: handleConfirmationDragEnd,
    handleMove: handleConfirmationDragMove,
    handleStart: handleConfirmationDragStart,
    offset: confirmationDragOffset,
    reset: resetConfirmationDrag,
  } = useSheetDrag({
    onDismiss: () => closeConfirmation(),
  });
  const {
    handleEnd: handleClassificationDragEnd,
    handleMove: handleClassificationDragMove,
    handleStart: handleClassificationDragStart,
    offset: classificationDragOffset,
    reset: resetClassificationDrag,
  } = useSheetDrag({
    onDismiss: () => closeTypesModal(),
  });

  const loadCollection = useCallback(async (nextLibraryId: string) => {
    setMessage("Cargando platos…");
    try {
      const [nextDishes, nextTypes, nextCategories] = await Promise.all([
        getMenuDishes(nextLibraryId),
        getMenuDishTypes(nextLibraryId),
        getMenuDishCategories(nextLibraryId),
      ]);
      setDishes(nextDishes);
      setDishTypes(nextTypes);
      setDishCategories(nextCategories);
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
    const filtered = (collectionDishes ?? []).filter((dish) => {
      const matchesQuery =
        !normalizedQuery ||
        `${dish.name} ${dish.description ?? ""} ${dish.comment ?? ""} ${dish.categories.map((category) => category.name).join(" ")}`
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
    if (dishSort === "default") return filtered;
    return [...filtered].sort((left, right) => {
      if (left.rating === null && right.rating === null) return 0;
      if (left.rating === null) return 1;
      if (right.rating === null) return -1;
      return dishSort === "rating-desc"
        ? right.rating - left.rating
        : left.rating - right.rating;
    });
  }, [
    activeTab,
    categoryFilter,
    collectionDishes,
    dishSort,
    searchQuery,
    typeFilter,
  ]);
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
  const hasActiveFilters = Boolean(
    searchQuery.trim() || typeFilter || categoryFilter,
  );

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("");
    setCategoryFilter("");
  }

  async function rateDish(dish: MenuDish, rating: number) {
    try {
      const updated = await updateMenuDish(dish.id, {
        rating: rating === 0 ? null : rating,
      });
      setDishes((current) =>
        current.map((currentDish) =>
          currentDish.id === updated.id ? updated : currentDish,
        ),
      );
      setMessage(rating === 0 ? "Valoración quitada." : "Plato valorado.");
    } catch {
      setMessage("No se pudo guardar la valoración.");
    }
  }

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
        dishDescription,
        dishComment,
      );
      setDishes((current) => [dish, ...current]);
      setDishName("");
      setDishTypeId("");
      setDishCategoryIds([]);
      setDishDescription("");
      setDishComment("");
      setMessage("Plato añadido.");
      closeDishSheet();
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
    setEditingDescription(dish.description ?? "");
    setEditingComment(dish.comment ?? "");
    setIsDishSheetOpen(true);
  }

  function openDishSheet() {
    setEditingId(null);
    setDishName("");
    setDishTypeId("");
    setDishCategoryIds([]);
    setDishDescription("");
    setDishComment("");
    setIsDishSheetOpen(true);
  }

  function closeDishSheet() {
    setIsDishSheetOpen(false);
    setEditingId(null);
    resetDishSheetDrag();
    window.setTimeout(() => dishTriggerRef.current?.focus(), 0);
  }

  function askForConfirmation(confirmation: DishConfirmation) {
    setDishConfirmation(confirmation);
  }

  function closeConfirmation() {
    setDishConfirmation(null);
    resetConfirmationDrag();
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
        description: editingDescription,
        comment: editingComment,
      });
      setDishes((current) =>
        current.map((currentDish) =>
          currentDish.id === updated.id ? updated : currentDish,
        ),
      );
      closeDishSheet();
      setMessage("Plato actualizado.");
    } catch {
      setMessage("No se pudo actualizar el plato.");
    } finally {
      setIsSaving(false);
    }
  }

  function removeDish(dish: MenuDish) {
    askForConfirmation({
      title: "Eliminar plato",
      description: `Se eliminará «${dish.name}» de la biblioteca.`,
      confirmLabel: "Eliminar plato",
      onConfirm: () => {
        closeConfirmation();
        void deleteMenuDish(dish.id)
          .then(() => {
            setDishes((current) =>
              current.filter((currentDish) => currentDish.id !== dish.id),
            );
            setMessage("Plato eliminado.");
          })
          .catch(() => setMessage("No se pudo eliminar el plato."));
      },
    });
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

  function removeDishCategory(category: MenuDishCategory) {
    askForConfirmation({
      title: "Eliminar categoría",
      description: `«${category.name}» se quitará de los platos, pero no se borrará ningún plato.`,
      confirmLabel: "Eliminar categoría",
      onConfirm: () => {
        closeConfirmation();
        void deleteMenuDishCategory(category.id)
          .then(async () => {
            setDishCategories(await getMenuDishCategories(libraryId));
            setDishes(await getMenuDishes(libraryId));
            setModalMessage("Categoría culinaria eliminada.");
          })
          .catch(() =>
            setModalMessage("No se pudo eliminar la categoría culinaria."),
          );
      },
    });
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

  function removeDishType(type: MenuDishType) {
    askForConfirmation({
      title: "Eliminar tipo de plato",
      description: `«${type.name}» se eliminará y los platos quedarán sin tipo.`,
      confirmLabel: "Eliminar tipo",
      onConfirm: () => {
        closeConfirmation();
        void deleteMenuDishType(type.id)
          .then(async () => {
            setDishTypes(await getMenuDishTypes(libraryId));
            setDishes(await getMenuDishes(libraryId));
            setModalMessage("Tipo de plato eliminado.");
          })
          .catch(() =>
            setModalMessage("No se pudo eliminar el tipo de plato."),
          );
      },
    });
  }

  function openTypesModal() {
    setModalMessage("");
    setClassificationTab("types");
    setIsTypesModalOpen(true);
  }

  function closeTypesModal() {
    setIsTypesModalOpen(false);
    setEditingTypeIdInModal(null);
    resetClassificationDrag();
  }

  const editingDish = editingId
    ? (dishes.find((dish) => dish.id === editingId) ?? null)
    : null;

  return (
    <section
      ref={menuScreenRef}
      aria-labelledby="menu-title"
      className="menuPlanningScreen"
    >
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

      {!isDishSheetOpen ? (
        <FloatingActionButton
          buttonRef={dishTriggerRef}
          label="Añadir plato"
          icon="plus"
          disabled={!libraryId}
          onButtonPointerDown={onButtonPointerDown}
          onClick={openDishSheet}
        />
      ) : null}

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
        <label className="menuFilterField">
          Ordenar platos
          <select
            value={dishSort}
            onChange={(event) => setDishSort(event.target.value as DishSort)}
          >
            <option value="default">Orden habitual</option>
            <option value="rating-desc">Mejor valorados</option>
            <option value="rating-asc">Peor valorados</option>
          </select>
        </label>
      </div>

      <div className="menuFilterSummary" aria-live="polite">
        <span>
          {visibleDishes.length}{" "}
          {visibleDishes.length === 1 ? "plato" : "platos"} visibles
        </span>
        {hasActiveFilters ? (
          <button type="button" onClick={clearFilters}>
            Limpiar filtros
          </button>
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
              {editingId === dish.id && !isDishSheetOpen ? (
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
                    {dish.description ? (
                      <p className="menuDishTextSummary">
                        <strong>Descripción:</strong> {dish.description}
                      </p>
                    ) : null}
                    {dish.comment ? (
                      <p className="menuDishTextSummary">
                        <strong>Comentario:</strong> {dish.comment}
                      </p>
                    ) : null}
                    <DishRating
                      dish={dish}
                      onRate={(rating) => void rateDish(dish, rating)}
                    />
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
          <div className="menuEmptyState">
            <strong>
              {hasActiveFilters
                ? "No hay platos con estos filtros."
                : activeTab === "pending"
                  ? "Todavía no hay platos por cocinar."
                  : "Aún no hay platos cocinados."}
            </strong>
            <span>
              {hasActiveFilters
                ? "Prueba otra combinación o vuelve a ver toda la biblioteca."
                : "Añade una idea arriba para empezar a llenar la semana."}
            </span>
            {hasActiveFilters ? (
              <button type="button" onClick={clearFilters}>
                Ver todos los platos
              </button>
            ) : null}
          </div>
        )}
      </section>

      {isDishSheetOpen ? (
        <BottomSheetFrame
          ariaLabelledBy="menu-dish-sheet-title"
          backdropRef={dishSheetBackdropRef}
          dragOffset={dishSheetDragOffset}
          onClose={closeDishSheet}
          onDragEnd={handleDishSheetDragEnd}
          onDragMove={handleDishSheetDragMove}
          onDragStart={handleDishSheetDragStart}
          sheetRef={dishSheetRef}
          title={editingDish ? `Editar ${editingDish.name}` : "Añadir un plato"}
          subtitle="Define el tipo y las categorías para encontrarlo más tarde."
        >
          <form
            className="menuDishSheetForm"
            onSubmit={(event) =>
              editingDish
                ? void saveEdit(event, editingDish)
                : void addDish(event)
            }
          >
            <label className="menuFilterField">
              Nombre del plato
              <input
                id="new-dish"
                autoFocus
                value={editingDish ? editingName : dishName}
                onChange={(event) =>
                  editingDish
                    ? setEditingName(event.target.value)
                    : setDishName(event.target.value)
                }
                placeholder="Lentejas, tortilla de patata…"
                disabled={isSaving}
              />
            </label>
            <label className="menuFilterField">
              Tipo funcional
              <select
                value={editingDish ? editingTypeId : dishTypeId}
                onChange={(event) =>
                  editingDish
                    ? setEditingTypeId(event.target.value)
                    : setDishTypeId(event.target.value)
                }
                disabled={isSaving}
              >
                <option value="">Sin tipo</option>
                {collectionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="menuFilterField">
              Categorías culinarias
              <select
                multiple
                value={editingDish ? editingCategoryIds : dishCategoryIds}
                onChange={(event) => {
                  const values = [...event.target.selectedOptions].map(
                    (option) => option.value,
                  );
                  if (editingDish) setEditingCategoryIds(values);
                  else setDishCategoryIds(values);
                }}
                disabled={isSaving}
              >
                {dishCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="menuFilterField">
              Descripción (opcional)
              <textarea
                maxLength={1000}
                value={editingDish ? editingDescription : dishDescription}
                onChange={(event) =>
                  editingDish
                    ? setEditingDescription(event.target.value)
                    : setDishDescription(event.target.value)
                }
                placeholder="Qué es, qué lleva o cómo se prepara…"
                disabled={isSaving}
              />
            </label>
            <label className="menuFilterField">
              Comentario (opcional)
              <textarea
                maxLength={1000}
                value={editingDish ? editingComment : dishComment}
                onChange={(event) =>
                  editingDish
                    ? setEditingComment(event.target.value)
                    : setDishComment(event.target.value)
                }
                placeholder="Apuntes, preferencias o cambios…"
                disabled={isSaving}
              />
            </label>
            <div className="bottomSheetFooter">
              <button type="button" onClick={closeDishSheet}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  !(editingDish ? editingName : dishName).trim() || isSaving
                }
              >
                {editingDish ? "Guardar cambios" : "Añadir plato"}
              </button>
            </div>
          </form>
        </BottomSheetFrame>
      ) : null}

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

      {dishConfirmation ? (
        <ConfirmSheet
          backdropRef={confirmationBackdropRef}
          confirmLabel={dishConfirmation.confirmLabel}
          description={dishConfirmation.description}
          dragOffset={confirmationDragOffset}
          onCancel={closeConfirmation}
          onConfirm={dishConfirmation.onConfirm}
          onDragEnd={handleConfirmationDragEnd}
          onDragMove={handleConfirmationDragMove}
          onDragStart={handleConfirmationDragStart}
          sheetRef={confirmationSheetRef}
          title={dishConfirmation.title}
        />
      ) : null}

      {isTypesModalOpen ? (
        <BottomSheetFrame
          ariaLabelledBy="menu-classification-title"
          backdropRef={classificationBackdropRef}
          className="menuTypesModal"
          dragOffset={classificationDragOffset}
          handleLabel="Cerrar gestión de clasificación"
          onClose={closeTypesModal}
          onDragEnd={handleClassificationDragEnd}
          onDragMove={handleClassificationDragMove}
          onDragStart={handleClassificationDragStart}
          sheetRef={typesModalRef}
          title={
            classificationTab === "types"
              ? "Tipos de plato"
              : "Categorías culinarias"
          }
          subtitle="Mantén separadas las reglas de organización para encontrar cada plato sin esfuerzo."
          tabIndex={-1}
        >
          <div
            className="menuClassificationTabs"
            role="tablist"
            aria-label="Clasificación"
          >
            <button
              className={classificationTab === "types" ? "isActive" : ""}
              type="button"
              role="tab"
              aria-selected={classificationTab === "types"}
              onClick={() => {
                setClassificationTab("types");
                setModalMessage("");
              }}
            >
              Tipos
            </button>
            <button
              className={classificationTab === "categories" ? "isActive" : ""}
              type="button"
              role="tab"
              aria-selected={classificationTab === "categories"}
              onClick={() => {
                setClassificationTab("categories");
                setModalMessage("");
              }}
            >
              Categorías
            </button>
          </div>
          {classificationTab === "types" ? (
            <>
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
            </>
          ) : null}
          {classificationTab === "categories" ? (
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
          ) : null}
          {modalMessage ? (
            <p className="menuPlanningMessage" role="status">
              {modalMessage}
            </p>
          ) : null}
        </BottomSheetFrame>
      ) : null}
    </section>
  );
}
