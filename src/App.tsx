import {
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { animate, stagger } from "animejs";

import styles from "./App.module.scss";
import {
  addShoppingItem,
  addShoppingSection,
  defaultShoppingSections,
  moveShoppingSection,
  getShoppingUserName,
  isShoppingSectionId,
  isShoppingUserId,
  removePurchasedShoppingItems,
  removeShoppingSection,
  removeShoppingItem,
  renameShoppingSection,
  ShoppingItem,
  shoppingSectionColors,
  ShoppingSectionColor,
  ShoppingSection,
  ShoppingSectionId,
  ShoppingUserId,
  shoppingUsers,
  sortShoppingItemsForShopping,
  toggleShoppingItem,
  updateShoppingSectionColor,
  updateShoppingItem,
} from "./shoppingItems";
import {
  getShoppingItemsStorageMode,
  getStoredShoppingData,
  replaceStoredShoppingData,
} from "./shoppingItemsDb";
import {
  isSupabaseConfigured,
  subscribeToSupabaseShoppingItems,
} from "./shoppingItemsSupabase";

const selectedSectionStorageKey = "jucart:selected-section-id";
const selectedUserStorageKey = "jucart:selected-user-id";

type AppView = "shopping" | "sections";

type IconName =
  | "check"
  | "edit"
  | "trash"
  | "undo"
  | "save"
  | "close"
  | "plus"
  | "list"
  | "settings"
  | "arrowUp"
  | "arrowDown"
  | "sync";
type SyncStatus = "local" | "syncing" | "synced" | "offline";
type HapticFeedback = "light" | "medium" | "success" | "warning";

const hapticFeedbackPatterns: Record<HapticFeedback, VibratePattern> = {
  light: 10,
  medium: 18,
  success: [14, 32, 18],
  warning: [28, 42, 36],
};

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string[]> = {
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
    save: ["M5 3h12l2 2v16H5z", "M8 3v6h8V3", "M8 17h8"],
    close: ["M6 6l12 12", "M18 6L6 18"],
    plus: ["M12 5v14", "M5 12h14"],
    list: [
      "M8 6h13",
      "M8 12h13",
      "M8 18h13",
      "M3 6h.01",
      "M3 12h.01",
      "M3 18h.01",
    ],
    settings: [
      "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
      "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .4.21.77.6 1 .3.26.68.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6z",
    ],
    arrowUp: ["M12 19V5", "M5 12l7-7 7 7"],
    arrowDown: ["M12 5v14", "M19 12l-7 7-7-7"],
    sync: [
      "M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4",
      "M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4",
    ],
  };

  return (
    <svg
      className={styles.buttonIcon}
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

function HeaderLogo() {
  return (
    <svg
      className={styles.logoMark}
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
    >
      <path
        d="M13 18h8l5 27h23l6-20H25"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 25h24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M29 34h14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M16 18l7-8h18l8 8"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <path
        d="M33 42l7-9 6 5"
        stroke="#dff4ea"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="51" r="4.5" fill="currentColor" />
      <circle cx="48" cy="51" r="4.5" fill="currentColor" />
      <path
        d="M8 29h8M10 38h10"
        stroke="#dff4ea"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getInitialSelectedSectionId(): ShoppingSectionId {
  try {
    const storedSectionId = window.localStorage.getItem(
      selectedSectionStorageKey,
    );

    return storedSectionId && isShoppingSectionId(storedSectionId)
      ? storedSectionId
      : "mercadona";
  } catch {
    return "mercadona";
  }
}

function getInitialSelectedUserId(): ShoppingUserId {
  try {
    const storedUserId = window.localStorage.getItem(selectedUserStorageKey);

    return storedUserId && isShoppingUserId(storedUserId)
      ? storedUserId
      : "rafa";
  } catch {
    return "rafa";
  }
}

function compareShoppingItemsForVisibleOrder(
  firstItem: ShoppingItem,
  secondItem: ShoppingItem,
) {
  if (firstItem.purchased !== secondItem.purchased) {
    return firstItem.purchased ? 1 : -1;
  }

  return firstItem.createdAt - secondItem.createdAt;
}

function shouldAnimate() {
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function runAnimation(
  targets: HTMLElement | HTMLElement[],
  parameters: Parameters<typeof animate>[1],
) {
  if (!shouldAnimate()) {
    return;
  }

  try {
    animate(targets, parameters);
  } catch {
    return;
  }
}

function runHapticFeedback(feedback: HapticFeedback) {
  try {
    void navigator.vibrate?.(hapticFeedbackPatterns[feedback]);
  } catch {
    return;
  }
}

function getSyncStatusText(status: SyncStatus) {
  if (status === "syncing") {
    return "Sincronizando";
  }

  if (status === "synced") {
    return "Sincronizado";
  }

  if (status === "offline") {
    return "Offline";
  }

  return "Local";
}

function getSyncStatusFromStorageMode() {
  const storageMode = getShoppingItemsStorageMode();

  if (storageMode === "remote") {
    return "synced";
  }

  if (storageMode === "fallback") {
    return "offline";
  }

  return "local";
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>("shopping");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [sections, setSections] = useState<ShoppingSection[]>(
    defaultShoppingSections,
  );
  const [itemName, setItemName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<ShoppingSectionId>(
    getInitialSelectedSectionId,
  );
  const [selectedUserId, setSelectedUserId] = useState<ShoppingUserId>(
    getInitialSelectedUserId,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingSectionId, setEditingSectionId] =
    useState<ShoppingSectionId>("mercadona");
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured() ? "syncing" : "local",
  );
  const [lastRemovedItems, setLastRemovedItems] = useState<ShoppingItem[]>([]);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Partial<Record<string, HTMLElement>>>({});
  const boardRef = useRef<HTMLElement>(null);
  const clearDialogRef = useRef<HTMLDivElement>(null);
  const sectionNameInputRef = useRef<HTMLInputElement>(null);
  const sectionColumnRefs = useRef<
    Partial<Record<ShoppingSectionId, HTMLElement>>
  >({});
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
  const hasAnimatedInitialColumnsRef = useRef(false);
  const previousItemIdsRef = useRef<Set<string>>(new Set());
  const previousUndoKeyRef = useRef<string | null>(null);
  const undoItemRef = useRef<HTMLLIElement>(null);
  const skipNextStoreRef = useRef(true);
  const pendingCount = items.filter((item) => !item.purchased).length;
  const purchasedCount = items.filter((item) => item.purchased).length;
  const editingItem = editingItemId
    ? items.find((item) => item.id === editingItemId)
    : null;
  const removePurchasedButtonText =
    purchasedCount === 1
      ? "Borrar 1 producto"
      : `Borrar ${purchasedCount} productos`;
  const clearPurchasedDescription =
    purchasedCount === 1
      ? "Se borrará 1 producto comprado. Podrás deshacerlo después."
      : `Se borrarán ${purchasedCount} productos comprados. Podrás deshacerlo después.`;

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      try {
        const storedData = await getStoredShoppingData();

        if (isActive) {
          skipNextStoreRef.current = true;
          setItems(storedData.items);
          setSections(storedData.sections);
          setSelectedSectionId((currentSectionId) =>
            isShoppingSectionId(currentSectionId, storedData.sections)
              ? currentSectionId
              : storedData.sections[0]?.id || "general",
          );
          setStorageError(null);
          setSyncStatus(getSyncStatusFromStorageMode());
        }
      } catch {
        if (isActive) {
          setStorageError("No se pudo cargar la lista guardada.");
          setSyncStatus(isSupabaseConfigured() ? "offline" : "local");
        }
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    }

    void loadItems();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (skipNextStoreRef.current) {
      skipNextStoreRef.current = false;
      return;
    }

    async function storeItems() {
      try {
        setSyncStatus(isSupabaseConfigured() ? "syncing" : "local");
        await replaceStoredShoppingData({ items, sections });
        setStorageError(null);
        setSyncStatus(getSyncStatusFromStorageMode());
      } catch {
        setStorageError("No se pudieron guardar los últimos cambios.");
        setSyncStatus(isSupabaseConfigured() ? "offline" : "local");
      }
    }

    void storeItems();
  }, [isLoaded, items, sections]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let isActive = true;

    async function refreshItemsFromSupabase() {
      try {
        const storedData = await getStoredShoppingData();

        if (!isActive) {
          return;
        }

        skipNextStoreRef.current = true;
        setItems(storedData.items);
        setSections(storedData.sections);
        setSelectedSectionId((currentSectionId) =>
          isShoppingSectionId(currentSectionId, storedData.sections)
            ? currentSectionId
            : storedData.sections[0]?.id || "general",
        );
        setStorageError(null);
        setSyncStatus(getSyncStatusFromStorageMode());
      } catch {
        if (isActive) {
          setStorageError("No se pudo sincronizar la lista.");
          setSyncStatus(isSupabaseConfigured() ? "offline" : "local");
        }
      }
    }

    const unsubscribe = subscribeToSupabaseShoppingItems(() => {
      void refreshItemsFromSupabase();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isLoaded]);

  useEffect(() => {
    try {
      window.localStorage.setItem(selectedSectionStorageKey, selectedSectionId);
    } catch {
      return;
    }
  }, [selectedSectionId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(selectedUserStorageKey, selectedUserId);
    } catch {
      return;
    }
  }, [selectedUserId]);

  useEffect(() => {
    const board = boardRef.current;
    const selectedColumn = sectionColumnRefs.current[selectedSectionId];

    if (!board || !selectedColumn || board.scrollWidth <= board.clientWidth) {
      return;
    }

    if (programmaticScrollTimeoutRef.current) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
    }

    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      programmaticScrollTimeoutRef.current = null;
    }, 500);

    runAnimation(board, {
      scrollLeft: selectedColumn.offsetLeft,
      duration: 420,
      ease: "outCubic",
    });
  }, [selectedSectionId]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || hasAnimatedInitialColumnsRef.current) {
      return;
    }

    const columns = sections
      .map((section) => sectionColumnRefs.current[section.id])
      .filter((column): column is HTMLElement => Boolean(column));

    if (columns.length === 0) {
      return;
    }

    hasAnimatedInitialColumnsRef.current = true;
    runAnimation(columns, {
      opacity: [0, 1],
      y: [14, 0],
      duration: 420,
      delay: stagger(55),
      ease: "outCubic",
    });
  }, [isLoaded, sections]);

  useEffect(() => {
    const selectedColumn = sectionColumnRefs.current[selectedSectionId];

    if (!selectedColumn) {
      return;
    }

    runAnimation(selectedColumn, {
      scale: [0.985, 1],
      duration: 280,
      ease: "outBack",
    });
  }, [selectedSectionId]);

  useEffect(() => {
    const previousItemIds = previousItemIdsRef.current;
    const newItems = items.filter((item) => !previousItemIds.has(item.id));

    previousItemIdsRef.current = new Set(items.map((item) => item.id));

    const newItemElements = newItems
      .map((item) => itemRefs.current[item.id])
      .filter((item): item is HTMLElement => Boolean(item));

    if (newItemElements.length === 0) {
      return;
    }

    runAnimation(newItemElements, {
      opacity: [0, 1],
      y: [-8, 0],
      scale: [0.97, 1],
      duration: 320,
      delay: stagger(35),
      ease: "outBack",
    });
  }, [items]);

  useEffect(() => {
    if (lastRemovedItems.length === 0) {
      previousUndoKeyRef.current = null;
      return;
    }

    const undoKey = lastRemovedItems.map((item) => item.id).join("-");

    if (undoKey === previousUndoKeyRef.current || !undoItemRef.current) {
      return;
    }

    previousUndoKeyRef.current = undoKey;
    runAnimation(undoItemRef.current, {
      opacity: [0, 1],
      y: [-6, 0],
      scale: [0.98, 1],
      duration: 260,
      ease: "outBack",
    });
  }, [lastRemovedItems]);

  useEffect(() => {
    if (!isClearDialogOpen) {
      return;
    }

    clearDialogRef.current?.focus();
  }, [isClearDialogOpen]);

  function animateButtonPress(element: HTMLElement) {
    runAnimation(element, {
      scale: [0.92, 1],
      duration: 220,
      ease: "outBack",
    });
  }

  function handleButtonPointerDown(event: MouseEvent<HTMLButtonElement>) {
    animateButtonPress(event.currentTarget);
  }

  function focusAddProductField() {
    runHapticFeedback("light");
    document.getElementById("add-product")?.scrollIntoView?.({
      behavior: shouldAnimate() ? "smooth" : "auto",
      block: "start",
    });
    itemNameInputRef.current?.focus({ preventScroll: true });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextItems = addShoppingItem(
      items,
      itemName,
      selectedSectionId,
      selectedUserId,
    );

    if (nextItems !== items) {
      runHapticFeedback("success");
      setItems(nextItems);
    }

    setItemName("");
    itemNameInputRef.current?.focus();
  }

  function startEditing(item: ShoppingItem) {
    runHapticFeedback("light");
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingSectionId(item.sectionId);
  }

  function resetEditing() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingSectionId("mercadona");
  }

  function cancelEditing() {
    runHapticFeedback("light");
    resetEditing();
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingItemId) {
      return;
    }

    const nextItems = updateShoppingItem(
      items,
      editingItemId,
      editingItemName,
      editingSectionId,
    );

    if (nextItems !== items) {
      runHapticFeedback("success");
      setItems(nextItems);
    }

    resetEditing();
  }

  function handleRemovePurchasedItems() {
    if (purchasedCount === 0) {
      return;
    }

    runHapticFeedback("light");
    setIsClearDialogOpen(true);
  }

  function confirmRemovePurchasedItems() {
    if (purchasedCount === 0) {
      setIsClearDialogOpen(false);
      return;
    }

    const removedItems = items.filter((item) => item.purchased);

    if (removedItems.length === 0) {
      setIsClearDialogOpen(false);
      return;
    }

    runHapticFeedback("warning");
    setLastRemovedItems(removedItems);
    setItems(removePurchasedShoppingItems(items));
    setIsClearDialogOpen(false);
  }

  function handleRemoveItem(itemId: string) {
    const removedItem = items.find((item) => item.id === itemId);

    if (!removedItem) {
      return;
    }

    runHapticFeedback("warning");
    setLastRemovedItems([removedItem]);
    setItems(removeShoppingItem(items, itemId));
  }

  function handleUndoRemoveItems() {
    if (lastRemovedItems.length === 0) {
      return;
    }

    setItems((currentItems) => {
      const currentItemIds = new Set(currentItems.map((item) => item.id));
      const restorableItems = lastRemovedItems.filter(
        (item) => !currentItemIds.has(item.id),
      );

      if (restorableItems.length === 0) {
        return currentItems;
      }

      return [...currentItems, ...restorableItems].sort(
        (firstItem, secondItem) => firstItem.createdAt - secondItem.createdAt,
      );
    });
    setLastRemovedItems([]);
    runHapticFeedback("success");
  }

  function handleToggleItem(itemId: string) {
    if (!items.some((item) => item.id === itemId)) {
      return;
    }

    setItems(toggleShoppingItem(items, itemId));
    runHapticFeedback("medium");
  }

  function handleBoardScroll(event: UIEvent<HTMLElement>) {
    const board = event.currentTarget;

    if (
      programmaticScrollTimeoutRef.current ||
      board.scrollWidth <= board.clientWidth
    ) {
      return;
    }

    const nextSection = sections.reduce<{
      distance: number;
      id: ShoppingSectionId;
    } | null>((closestSection, section) => {
      const column = sectionColumnRefs.current[section.id];

      if (!column) {
        return closestSection;
      }

      const distance = Math.abs(column.offsetLeft - board.scrollLeft);

      if (!closestSection || distance < closestSection.distance) {
        return { distance, id: section.id };
      }

      return closestSection;
    }, null);

    if (nextSection && nextSection.id !== selectedSectionId) {
      setSelectedSectionId(nextSection.id);
    }
  }

  function selectSection(sectionId: ShoppingSectionId) {
    if (sectionId === selectedSectionId) {
      return;
    }

    setSelectedSectionId(sectionId);
    runHapticFeedback("light");
  }

  function showSectionsView() {
    setActiveView("sections");
    runHapticFeedback("light");
    window.setTimeout(() => sectionNameInputRef.current?.focus(), 0);
  }

  function showShoppingView() {
    setActiveView("shopping");
    runHapticFeedback("light");
  }

  function handleSectionNameChange(
    sectionId: ShoppingSectionId,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextSections = renameShoppingSection(
      sections,
      sectionId,
      event.target.value,
    );

    if (nextSections !== sections) {
      setSections(nextSections);
    }
  }

  function handleSectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSections = addShoppingSection(sections, sectionName);

    if (nextSections === sections) {
      return;
    }

    runHapticFeedback("success");
    setSections(nextSections);
    setSelectedSectionId(nextSections[nextSections.length - 1].id);
    setSectionName("");
    sectionNameInputRef.current?.focus();
  }

  function handleMoveSection(sectionId: ShoppingSectionId, direction: -1 | 1) {
    const nextSections = moveShoppingSection(sections, sectionId, direction);

    if (nextSections === sections) {
      return;
    }

    runHapticFeedback("medium");
    setSections(nextSections);
  }

  function handleSectionColorChange(
    sectionId: ShoppingSectionId,
    color: ShoppingSectionColor,
  ) {
    const nextSections = updateShoppingSectionColor(sections, sectionId, color);

    if (nextSections === sections) {
      return;
    }

    runHapticFeedback("light");
    setSections(nextSections);
  }

  function handleRemoveSection(sectionId: ShoppingSectionId) {
    const nextSections = removeShoppingSection(sections, items, sectionId);

    if (nextSections === sections) {
      return;
    }

    runHapticFeedback("warning");
    setSections(nextSections);

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(nextSections[0]?.id || "general");
    }
  }

  function handleColumnKeyDown(
    event: KeyboardEvent<HTMLElement>,
    sectionId: ShoppingSectionId,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    selectSection(sectionId);
  }

  function handleItemKeyDown(
    event: KeyboardEvent<HTMLElement>,
    itemId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleToggleItem(itemId);
  }

  function renderUndoItem(removedItems: ShoppingItem[]) {
    return (
      <li
        ref={undoItemRef}
        className={styles.undoItem}
        key={`undo-${removedItems[0].id}`}
      >
        <span>
          {removedItems.length === 1
            ? "Producto borrado."
            : `${removedItems.length} productos borrados.`}
        </span>
        <button
          className={styles.undoButton}
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={handleUndoRemoveItems}
        >
          Deshacer
        </button>
      </li>
    );
  }

  function renderItems(
    sectionItems: ShoppingItem[],
    removedSectionItems: ShoppingItem[],
  ) {
    if (sectionItems.length === 0 && removedSectionItems.length === 0) {
      return <p className={styles.empty}>Sin productos.</p>;
    }

    const visibleItems = sortShoppingItemsForShopping(sectionItems);
    const sortedRemovedItems = [...removedSectionItems].sort(
      compareShoppingItemsForVisibleOrder,
    );
    const hasPendingItems = sectionItems.some((item) => !item.purchased);
    const hasPurchasedItems = sectionItems.some((item) => item.purchased);
    const shouldShowPurchasedDivider = hasPendingItems && hasPurchasedItems;
    let hasRenderedUndoItem = false;
    const listItems = visibleItems.flatMap((item, index) => {
      const shouldRenderPurchasedDivider =
        shouldShowPurchasedDivider &&
        item.purchased &&
        !visibleItems[index - 1]?.purchased;
      const itemContent = (
        <li
          ref={(itemElement) => {
            if (itemElement) {
              itemRefs.current[item.id] = itemElement;
            } else {
              delete itemRefs.current[item.id];
            }
          }}
          className={
            item.purchased
              ? `${styles.item} ${styles.itemPurchased}`
              : styles.item
          }
          aria-label={
            item.purchased
              ? `Devolver ${item.name} a pendientes`
              : `Marcar ${item.name} como comprado`
          }
          role="button"
          tabIndex={0}
          key={item.id}
          onClick={() => handleToggleItem(item.id)}
          onKeyDown={(event) => handleItemKeyDown(event, item.id)}
        >
          <span
            className={
              item.purchased
                ? `${styles.itemCheck} ${styles.itemCheckPurchased}`
                : styles.itemCheck
            }
            aria-hidden="true"
          >
            <Icon name="check" />
          </span>
          <span
            className={
              item.purchased
                ? `${styles.itemName} ${styles.itemNamePurchased}`
                : styles.itemName
            }
          >
            {item.name}
          </span>
          <span className={styles.itemMeta}>
            {getShoppingUserName(item.addedBy)}
          </span>
          <div className={styles.itemActions}>
            <button
              className={styles.iconButton}
              type="button"
              aria-label={`Editar ${item.name}`}
              title="Editar"
              onPointerDown={handleButtonPointerDown}
              onClick={(event) => {
                event.stopPropagation();
                startEditing(item);
              }}
            >
              <Icon name="edit" />
            </button>
            <button
              className={styles.iconButtonDanger}
              type="button"
              aria-label={`Eliminar ${item.name}`}
              title="Eliminar"
              onPointerDown={handleButtonPointerDown}
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveItem(item.id);
              }}
            >
              <Icon name="trash" />
            </button>
          </div>
        </li>
      );
      const purchasedDivider = shouldRenderPurchasedDivider ? (
        <li className={styles.purchasedDivider} key="purchased-divider">
          Comprados
        </li>
      ) : null;
      const shouldRenderUndoItem =
        !hasRenderedUndoItem &&
        sortedRemovedItems.length > 0 &&
        compareShoppingItemsForVisibleOrder(sortedRemovedItems[0], item) < 0;

      if (shouldRenderUndoItem) {
        hasRenderedUndoItem = true;

        return sortedRemovedItems[0].purchased
          ? [purchasedDivider, renderUndoItem(sortedRemovedItems), itemContent]
          : [renderUndoItem(sortedRemovedItems), purchasedDivider, itemContent];
      }

      return [purchasedDivider, itemContent];
    });

    if (!hasRenderedUndoItem && sortedRemovedItems.length > 0) {
      listItems.push(renderUndoItem(sortedRemovedItems));
    }

    return <ul className={styles.list}>{listItems}</ul>;
  }

  return (
    <main className={styles.app}>
      <section className={styles.header} aria-labelledby="app-title">
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <HeaderLogo />
          </span>
          <div>
            <p className={styles.kicker}>Lista de la compra</p>
            <h1 id="app-title">Jucart</h1>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <dl className={styles.summary} aria-label="Resumen de la lista">
            <div className={styles.summaryItem}>
              <dt>Pendientes</dt>
              <dd>{pendingCount}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt>Comprados</dt>
              <dd>{purchasedCount}</dd>
            </div>
          </dl>
          <p
            className={`${styles.syncStatus} ${styles[`syncStatus${syncStatus}`]}`}
            aria-live="polite"
          >
            {getSyncStatusText(syncStatus)}
          </p>
        </div>
      </section>

      {activeView === "shopping" ? (
        <section
          id="add-product"
          className={styles.commandPanel}
          aria-label="Añadir producto"
        >
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formOptions}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="section-id">
                  Sección
                </label>
                <select
                  id="section-id"
                  className={styles.select}
                  value={selectedSectionId}
                  onChange={(event) =>
                    selectSection(event.target.value as ShoppingSectionId)
                  }
                  disabled={!isLoaded}
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="user-id">
                  Añadido por
                </label>
                <select
                  id="user-id"
                  className={styles.select}
                  value={selectedUserId}
                  onChange={(event) =>
                    setSelectedUserId(event.target.value as ShoppingUserId)
                  }
                  disabled={!isLoaded}
                >
                  {shoppingUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="item-name">
                Producto
              </label>
              <div className={styles.addRow}>
                <input
                  id="item-name"
                  ref={itemNameInputRef}
                  className={styles.input}
                  autoComplete="off"
                  autoFocus
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="Leche, pan, fruta..."
                  type="text"
                  disabled={!isLoaded}
                />
                <button
                  className={styles.primaryButton}
                  type="submit"
                  onPointerDown={handleButtonPointerDown}
                  disabled={!isLoaded}
                >
                  Añadir
                </button>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      {!isLoaded ? (
        <p className={styles.status} role="status" aria-live="polite">
          Cargando lista...
        </p>
      ) : storageError ? (
        <p className={styles.error} role="alert">
          {storageError}
        </p>
      ) : null}

      {activeView === "shopping" ? (
        <section
          id="shopping-board"
          ref={boardRef}
          className={styles.board}
          aria-label="Lista por secciones"
          onScroll={handleBoardScroll}
          tabIndex={0}
        >
          {sections.map((section) => {
            const sectionItems = items.filter(
              (item) => item.sectionId === section.id,
            );
            const removedSectionItems = lastRemovedItems.filter(
              (item) => item.sectionId === section.id,
            );
            const pendingCount = sectionItems.filter(
              (item) => !item.purchased,
            ).length;

            return (
              <article
                ref={(column) => {
                  if (column) {
                    sectionColumnRefs.current[section.id] = column;
                  }
                }}
                className={
                  selectedSectionId === section.id
                    ? `${styles.column} ${styles[`sectionColor${section.color}`]} ${styles.columnSelected}`
                    : `${styles.column} ${styles[`sectionColor${section.color}`]}`
                }
                aria-current={
                  selectedSectionId === section.id ? "true" : undefined
                }
                aria-labelledby={`section-${section.id}-title`}
                key={section.id}
                onClick={() => selectSection(section.id)}
                onKeyDown={(event) => handleColumnKeyDown(event, section.id)}
                tabIndex={0}
              >
                <div className={styles.sectionHeader}>
                  <h2 id={`section-${section.id}-title`}>{section.name}</h2>
                  <span
                    className={styles.count}
                    aria-label={`${pendingCount} productos pendientes`}
                  >
                    {pendingCount}
                  </span>
                </div>
                {renderItems(sectionItems, removedSectionItems)}
              </article>
            );
          })}
        </section>
      ) : (
        <section
          className={styles.sectionsScreen}
          aria-labelledby="sections-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="sections-title">Listas</h2>
            <span className={styles.count}>{sections.length}</span>
          </div>
          <form
            className={styles.sectionCreateForm}
            onSubmit={handleSectionSubmit}
          >
            <label className={styles.label} htmlFor="section-name">
              Nueva lista
            </label>
            <div className={styles.addRow}>
              <input
                id="section-name"
                ref={sectionNameInputRef}
                className={styles.input}
                autoComplete="off"
                value={sectionName}
                onChange={(event) => setSectionName(event.target.value)}
                placeholder="Carrefour, frutería..."
                type="text"
                disabled={!isLoaded}
              />
              <button
                className={styles.primaryButton}
                type="submit"
                onPointerDown={handleButtonPointerDown}
                disabled={!isLoaded}
              >
                Crear
              </button>
            </div>
          </form>
          <ol className={styles.sectionManagerList}>
            {sections.map((section, index) => {
              const sectionProductCount = items.filter(
                (item) => item.sectionId === section.id,
              ).length;
              const canRemoveSection =
                isLoaded && sections.length > 1 && sectionProductCount === 0;

              return (
                <li className={styles.sectionManagerItem} key={section.id}>
                  <span className={styles.sectionPosition}>{index + 1}</span>
                  <div className={styles.sectionFields}>
                    <input
                      className={styles.input}
                      aria-label={`Nombre de ${section.name}`}
                      value={section.name}
                      onChange={(event) =>
                        handleSectionNameChange(section.id, event)
                      }
                      disabled={!isLoaded}
                      type="text"
                    />
                    <div
                      className={styles.sectionColorPicker}
                      aria-label={`Color de ${section.name}`}
                      role="group"
                    >
                      {shoppingSectionColors.map((color) => (
                        <button
                          className={
                            section.color === color
                              ? `${styles.sectionColorButton} ${styles.sectionColorButtonSelected} ${styles[`sectionColorSwatch${color}`]}`
                              : `${styles.sectionColorButton} ${styles[`sectionColorSwatch${color}`]}`
                          }
                          type="button"
                          aria-label={`Poner ${section.name} en color ${color}`}
                          aria-pressed={section.color === color}
                          key={color}
                          onPointerDown={handleButtonPointerDown}
                          onClick={() =>
                            handleSectionColorChange(section.id, color)
                          }
                          disabled={!isLoaded}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.sectionActions}>
                    <button
                      className={styles.iconButton}
                      type="button"
                      aria-label={`Subir ${section.name}`}
                      title="Subir"
                      onPointerDown={handleButtonPointerDown}
                      onClick={() => handleMoveSection(section.id, -1)}
                      disabled={!isLoaded || index === 0}
                    >
                      <Icon name="arrowUp" />
                    </button>
                    <button
                      className={styles.iconButton}
                      type="button"
                      aria-label={`Bajar ${section.name}`}
                      title="Bajar"
                      onPointerDown={handleButtonPointerDown}
                      onClick={() => handleMoveSection(section.id, 1)}
                      disabled={!isLoaded || index === sections.length - 1}
                    >
                      <Icon name="arrowDown" />
                    </button>
                    <button
                      className={styles.iconButtonDanger}
                      type="button"
                      aria-label={
                        sectionProductCount > 0
                          ? `No se puede borrar ${section.name} porque tiene productos`
                          : `Borrar ${section.name}`
                      }
                      title={
                        sectionProductCount > 0
                          ? "No se puede borrar una lista con productos"
                          : "Borrar"
                      }
                      onPointerDown={handleButtonPointerDown}
                      onClick={() => handleRemoveSection(section.id)}
                      disabled={!canRemoveSection}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <nav className={styles.bottomNav} aria-label="Navegación principal">
        <button
          className={
            activeView === "shopping"
              ? styles.bottomNavItemActive
              : styles.bottomNavItem
          }
          type="button"
          aria-label="Ir a añadir producto"
          onPointerDown={handleButtonPointerDown}
          onClick={() => {
            if (activeView !== "shopping") {
              showShoppingView();
              window.setTimeout(focusAddProductField, 0);
              return;
            }

            focusAddProductField();
          }}
          disabled={!isLoaded}
        >
          <Icon name="plus" />
          <span>Añadir</span>
        </button>
        <button
          className={
            activeView === "shopping"
              ? styles.bottomNavItemActive
              : styles.bottomNavItem
          }
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={showShoppingView}
          disabled={!isLoaded}
        >
          <Icon name="list" />
          <span>Lista</span>
        </button>
        <button
          className={styles.bottomNavItem}
          type="button"
          aria-label="Borrar comprados"
          onPointerDown={handleButtonPointerDown}
          onClick={handleRemovePurchasedItems}
          disabled={!isLoaded || purchasedCount === 0}
        >
          <Icon name="trash" />
          <span>Limpiar</span>
        </button>
        <button
          className={
            activeView === "sections"
              ? styles.bottomNavItemActive
              : styles.bottomNavItem
          }
          type="button"
          aria-label="Gestionar listas"
          onPointerDown={handleButtonPointerDown}
          onClick={showSectionsView}
          disabled={!isLoaded}
        >
          <Icon name="settings" />
          <span>Listas</span>
        </button>
      </nav>

      {isClearDialogOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            runHapticFeedback("light");
            setIsClearDialogOpen(false);
          }}
        >
          <div
            ref={clearDialogRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-purchased-title"
            aria-describedby="clear-purchased-description"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                runHapticFeedback("light");
                setIsClearDialogOpen(false);
              }
            }}
          >
            <h2 id="clear-purchased-title">Borrar comprados</h2>
            <p id="clear-purchased-description">{clearPurchasedDescription}</p>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={() => {
                  runHapticFeedback("light");
                  setIsClearDialogOpen(false);
                }}
              >
                Cancelar
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={confirmRemovePurchasedItems}
              >
                {removePurchasedButtonText}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div className={styles.modalBackdrop} onClick={cancelEditing}>
          <form
            className={`${styles.modal} ${styles.editModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancelEditing();
              }
            }}
            onSubmit={handleEditSubmit}
          >
            <h2 id="edit-product-title">Editar {editingItem.name}</h2>
            <div className={styles.modalForm}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="edit-item-name">
                  Producto
                </label>
                <input
                  id="edit-item-name"
                  className={styles.input}
                  autoComplete="off"
                  autoFocus
                  value={editingItemName}
                  onChange={(event) => setEditingItemName(event.target.value)}
                  type="text"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="edit-section-id">
                  Sección
                </label>
                <select
                  id="edit-section-id"
                  className={styles.select}
                  value={editingSectionId}
                  onChange={(event) =>
                    setEditingSectionId(event.target.value as ShoppingSectionId)
                  }
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={cancelEditing}
              >
                Cancelar
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                onPointerDown={handleButtonPointerDown}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
