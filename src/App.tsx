import {
  FormEvent,
  ChangeEvent,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { animate, stagger } from "animejs";
import useEmblaCarousel from "embla-carousel-react";

import styles from "./App.module.scss";
import {
  addShoppingItem,
  addShoppingSection,
  compareShoppingItemsForShopping,
  createInitialShoppingHistoryEvents,
  createShoppingHistoryEvent,
  defaultShoppingSections,
  findPendingShoppingItemByName,
  getShoppingCategoryName,
  getShoppingItemCategoryId,
  getQuickShoppingItemSuggestions,
  getRecentShoppingHistoryEvents,
  getUnseenRemoteShoppingHistoryEvents,
  moveShoppingSection,
  getShoppingUserName,
  isShoppingSectionId,
  isShoppingUserId,
  removeShoppingSection,
  removeShoppingItem,
  renameShoppingSection,
  ShoppingHistoryEvent,
  ShoppingItem,
  shoppingSectionColors,
  ShoppingSectionColor,
  ShoppingSection,
  ShoppingSectionId,
  ShoppingUserId,
  shoppingUsers,
  sortShoppingItemsForShopping,
  toggleShoppingItem,
  updateShoppingItemPurchasedState,
  updateShoppingSectionColor,
  updateShoppingItem,
} from "./shoppingItems";
import {
  getShoppingItemsStorageMode,
  getStoredShoppingData,
  replaceStoredShoppingData,
} from "./shoppingItemsDb";
import {
  DeveloperBackupRun,
  getLatestDeveloperBackupRun,
  isSupabaseConfigured,
  subscribeToSupabaseShoppingItems,
} from "./shoppingItemsSupabase";
import { updateBadge } from "./services/badgeService";

const selectedSectionStorageKey = "jucart:selected-section-id";
const selectedUserStorageKey = "jucart:selected-user-id";
const showPurchasedItemsStorageKey = "jucart:show-purchased-items";
const historyClientIdStorageKey = "jucart:history-client-id";
const lastSeenHistoryEventAtStorageKey = "jucart:last-seen-history-event-at";
const backupStaleThresholdMs = 6 * 60 * 60 * 1000;

type AppView = "shopping" | "sections" | "history" | "developer";

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
  | "history"
  | "sync"
  | "database";
type SyncStatus = "local" | "syncing" | "synced" | "offline";
type HapticFeedback = "light" | "medium" | "success" | "warning";
type DeveloperBackupStatus = "empty" | "success" | "failed" | "stale";
type AddProductNotice =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | { type: "duplicate"; message: string; itemId: string };

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
    history: ["M12 8v5l3 2", "M21 12a9 9 0 1 1-3-6.7"],
    sync: [
      "M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4",
      "M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4",
    ],
    database: [
      "M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3z",
      "M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6",
      "M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
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

function getInitialShowPurchasedItems() {
  try {
    return (
      window.localStorage.getItem(showPurchasedItemsStorageKey) !== "false"
    );
  } catch {
    return true;
  }
}

function getInitialHistoryClientId() {
  try {
    const storedClientId = window.localStorage.getItem(
      historyClientIdStorageKey,
    );

    if (storedClientId) {
      return storedClientId;
    }

    const clientId = `client-${createLocalId()}`;
    window.localStorage.setItem(historyClientIdStorageKey, clientId);

    return clientId;
  } catch {
    return `client-${createLocalId()}`;
  }
}

function formatShoppingItemQuantity(quantity: string) {
  return /^\d+(?:[.,]\d+)?$/.test(quantity) ? `x${quantity}` : quantity;
}

function getInitialLastSeenHistoryEventAt() {
  try {
    const rawValue = window.localStorage.getItem(
      lastSeenHistoryEventAtStorageKey,
    );
    const parsedValue = rawValue ? Number(rawValue) : 0;

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  } catch {
    return 0;
  }
}

function createLocalId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function compareShoppingItemsForVisibleOrder(
  firstItem: ShoppingItem,
  secondItem: ShoppingItem,
) {
  return compareShoppingItemsForShopping(firstItem, secondItem);
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

function getHistoryEventText(event: ShoppingHistoryEvent) {
  if (event.type === "added") {
    return "Producto añadido";
  }

  if (event.type === "purchased") {
    return "Marcado como comprado";
  }

  if (event.type === "unpurchased") {
    return "Devuelto a pendientes";
  }

  if (event.type === "moved") {
    return "Cambiado de lista";
  }

  if (event.type === "deleted") {
    return "Producto borrado";
  }

  return "Estado inicial";
}

function getHistoryEventMeta(event: ShoppingHistoryEvent) {
  const listText =
    event.type === "moved" && event.previousItem
      ? `${event.previousItem.sectionName} → ${event.item.sectionName}`
      : event.item.sectionName;

  return `${listText} · ${getShoppingUserName(event.actor)}`;
}

function formatHistoryEventDate(createdAt: number) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatDeveloperDate(value: number) {
  if (!Number.isFinite(value)) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileSize(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) {
    return "Sin dato";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(durationMs: number) {
  if (!Number.isFinite(durationMs)) {
    return "Sin dato";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function getDeveloperBackupStatus(run: DeveloperBackupRun | null) {
  if (!run) {
    return "empty";
  }

  if (run.status === "failed") {
    return "failed";
  }

  return Date.now() - run.finishedAt > backupStaleThresholdMs
    ? "stale"
    : "success";
}

function getDeveloperBackupStatusText(status: DeveloperBackupStatus) {
  if (status === "empty") {
    return "Sin copias registradas";
  }

  if (status === "failed") {
    return "Fallida";
  }

  if (status === "stale") {
    return "Sin copia reciente";
  }

  return "Correcta";
}

function formatShortHash(value: string | null) {
  return value ? value.slice(0, 12) : "Sin hash";
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

function getLoadingStatusText() {
  return isSupabaseConfigured()
    ? "Cargando lista de Supabase..."
    : "Cargando lista...";
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>("shopping");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [sections, setSections] = useState<ShoppingSection[]>(
    defaultShoppingSections,
  );
  const [historyEvents, setHistoryEvents] = useState<ShoppingHistoryEvent[]>(
    [],
  );
  const [historyClientId] = useState(getInitialHistoryClientId);
  const [lastSeenHistoryEventAt, setLastSeenHistoryEventAt] = useState(
    getInitialLastSeenHistoryEventAt,
  );
  const [showUnseenHistoryOnly, setShowUnseenHistoryOnly] = useState(false);
  const [unseenHistoryEventsForView, setUnseenHistoryEventsForView] = useState<
    ShoppingHistoryEvent[]
  >([]);
  const [itemName, setItemName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [sectionActionMessage, setSectionActionMessage] = useState<
    string | null
  >(null);
  const [selectedSectionId, setSelectedSectionId] = useState<ShoppingSectionId>(
    getInitialSelectedSectionId,
  );
  const [selectedUserId, setSelectedUserId] = useState<ShoppingUserId>(
    getInitialSelectedUserId,
  );
  const [showPurchasedItems, setShowPurchasedItems] = useState(
    getInitialShowPurchasedItems,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemQuantity, setEditingItemQuantity] = useState("");
  const [editingSectionId, setEditingSectionId] =
    useState<ShoppingSectionId>("mercadona");
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured() ? "syncing" : "local",
  );
  const [, setPendingRemoteRequests] = useState(0);
  const [developerBackupRun, setDeveloperBackupRun] =
    useState<DeveloperBackupRun | null>(null);
  const [developerBackupError, setDeveloperBackupError] = useState<
    string | null
  >(null);
  const [lastRemovedItems, setLastRemovedItems] = useState<ShoppingItem[]>([]);
  const [lastHiddenPurchasedItem, setLastHiddenPurchasedItem] =
    useState<ShoppingItem | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [addItemQuantity, setAddItemQuantity] = useState("1");
  const [addProductNotice, setAddProductNotice] =
    useState<AddProductNotice | null>(null);
  const [sheetKeyboardInset, setSheetKeyboardInset] = useState(0);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null,
  );
  const itemNameInputRef = useRef<HTMLTextAreaElement>(null);
  const addFabRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Partial<Record<string, HTMLElement>>>({});
  const clearDialogRef = useRef<HTMLDivElement>(null);
  const sectionNameInputRef = useRef<HTMLInputElement>(null);
  const sectionColumnRefs = useRef<
    Partial<Record<ShoppingSectionId, HTMLElement>>
  >({});
  const sectionsRef = useRef(sections);
  const selectedSectionIdRef = useRef(selectedSectionId);
  const hasAnimatedInitialColumnsRef = useRef(false);
  const previousItemIdsRef = useRef<Set<string>>(new Set());
  const previousUndoKeyRef = useRef<string | null>(null);
  const previousHiddenUndoKeyRef = useRef<string | null>(null);
  const undoItemRef = useRef<HTMLLIElement>(null);
  const hiddenUndoItemRef = useRef<HTMLLIElement>(null);
  const addSheetOpenRef = useRef(false);
  const addSheetDragStartYRef = useRef<number | null>(null);
  const pendingAddDraftRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const skipNextStoreRef = useRef(true);
  const pendingCount = items.filter((item) => !item.purchased).length;
  const purchasedCount = items.filter((item) => item.purchased).length;
  const selectedSectionIndex = Math.max(
    sections.findIndex((section) => section.id === selectedSectionId),
    0,
  );
  const [boardRef, boardApi] = useEmblaCarousel({
    align: "start",
    containScroll: false,
    dragFree: false,
    duration: shouldAnimate() ? 25 : 0,
    skipSnaps: false,
    slidesToScroll: 1,
    startIndex: selectedSectionIndex,
  });
  const editingItem = editingItemId
    ? items.find((item) => item.id === editingItemId)
    : null;
  const selectedSectionName =
    sections.find((section) => section.id === selectedSectionId)?.name ??
    "esta lista";
  const selectedPurchasedItems = sortShoppingItemsForShopping(
    items.filter(
      (item) => item.sectionId === selectedSectionId && item.purchased,
    ),
  );
  const selectedPurchasedCount = selectedPurchasedItems.length;
  const recentHistoryEvents = getRecentShoppingHistoryEvents(historyEvents);
  const quickItemSuggestions =
    isLoaded && isAddSheetOpen
      ? getQuickShoppingItemSuggestions(
          items,
          historyEvents,
          selectedSectionId,
          itemName,
          12,
        )
      : [];
  const unseenRemoteHistoryEvents = getUnseenRemoteShoppingHistoryEvents(
    historyEvents,
    historyClientId,
    lastSeenHistoryEventAt,
  );
  const displayedHistoryEvents = showUnseenHistoryOnly
    ? unseenHistoryEventsForView
    : recentHistoryEvents;
  const removePurchasedButtonText =
    selectedPurchasedCount === 1
      ? "Borrar 1 producto"
      : `Borrar ${selectedPurchasedCount} productos`;
  const clearPurchasedDescription =
    selectedPurchasedCount === 1
      ? `Se borrará 1 producto comprado de ${selectedSectionName}. Podrás deshacerlo después.`
      : `Se borrarán ${selectedPurchasedCount} productos comprados de ${selectedSectionName}. Podrás deshacerlo después.`;

  const beginRemoteRequest = useCallback(() => {
    if (!isSupabaseConfigured()) {
      return () => undefined;
    }

    setPendingRemoteRequests((currentCount) => currentCount + 1);

    let hasFinished = false;

    return () => {
      if (hasFinished || !isMountedRef.current) {
        return;
      }

      hasFinished = true;
      setPendingRemoteRequests((currentCount) => Math.max(0, currentCount - 1));
    };
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      const finishRemoteRequest = beginRemoteRequest();

      try {
        const storedData = await getStoredShoppingData();
        const shouldCreateInitialHistory =
          storedData.historyEvents.length === 0 && storedData.items.length > 0;
        const nextHistoryEvents = shouldCreateInitialHistory
          ? createInitialShoppingHistoryEvents(
              storedData.items,
              historyClientId,
              storedData.sections,
            )
          : storedData.historyEvents;

        if (isActive) {
          skipNextStoreRef.current = !shouldCreateInitialHistory;
          setItems(storedData.items);
          setSections(storedData.sections);
          setHistoryEvents(nextHistoryEvents);
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
        finishRemoteRequest();

        if (isActive) {
          setIsLoaded(true);
        }
      }
    }

    void loadItems();

    return () => {
      isActive = false;
    };
  }, [beginRemoteRequest, historyClientId]);

  useEffect(() => {
    void updateBadge(pendingCount);
  }, [pendingCount]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (skipNextStoreRef.current) {
      skipNextStoreRef.current = false;
      return;
    }

    async function storeItems() {
      const finishRemoteRequest = beginRemoteRequest();

      try {
        setSyncStatus(isSupabaseConfigured() ? "syncing" : "local");
        await replaceStoredShoppingData({ items, sections, historyEvents });
        pendingAddDraftRef.current = null;
        setStorageError(null);
        setSyncStatus(getSyncStatusFromStorageMode());
      } catch {
        const pendingAddDraft = pendingAddDraftRef.current;

        if (pendingAddDraft && addSheetOpenRef.current) {
          setItemName(pendingAddDraft);
          setAddProductNotice({
            type: "error",
            message: "No se pudo guardar el producto. Revisa la conexión.",
          });
          window.requestAnimationFrame(() => itemNameInputRef.current?.focus());
        }

        setStorageError("No se pudieron guardar los últimos cambios.");
        setSyncStatus(isSupabaseConfigured() ? "offline" : "local");
      } finally {
        finishRemoteRequest();
      }
    }

    void storeItems();
  }, [beginRemoteRequest, isLoaded, items, sections, historyEvents]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let isActive = true;

    async function refreshItemsFromSupabase() {
      const finishRemoteRequest = beginRemoteRequest();

      try {
        const storedData = await getStoredShoppingData();

        if (!isActive) {
          return;
        }

        skipNextStoreRef.current = true;
        setItems(storedData.items);
        setSections(storedData.sections);
        setHistoryEvents(storedData.historyEvents);
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
      } finally {
        finishRemoteRequest();
      }
    }

    const unsubscribe = subscribeToSupabaseShoppingItems(() => {
      void refreshItemsFromSupabase();
    });

    function refreshItemsWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshItemsFromSupabase();
      }
    }

    document.addEventListener("visibilitychange", refreshItemsWhenVisible);

    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", refreshItemsWhenVisible);
      unsubscribe();
    };
  }, [beginRemoteRequest, isLoaded]);

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
    if (!isLoaded || selectedUserId !== "rafa") {
      return;
    }

    void refreshDeveloperBackupRun();
  }, [isLoaded, selectedUserId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        showPurchasedItemsStorageKey,
        String(showPurchasedItems),
      );
    } catch {
      return;
    }
  }, [showPurchasedItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        lastSeenHistoryEventAtStorageKey,
        String(lastSeenHistoryEventAt),
      );
    } catch {
      return;
    }
  }, [lastSeenHistoryEventAt]);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    selectedSectionIdRef.current = selectedSectionId;
  }, [selectedSectionId]);

  useEffect(() => {
    if (!boardApi) {
      return;
    }

    const api = boardApi;

    function syncSelectedSection() {
      const nextSection = sectionsRef.current[api.selectedScrollSnap()];

      if (!nextSection || nextSection.id === selectedSectionIdRef.current) {
        return;
      }

      setSelectedSectionId(nextSection.id);
    }

    api.on("select", syncSelectedSection);

    return () => {
      api.off("select", syncSelectedSection);
    };
  }, [boardApi]);

  useEffect(() => {
    if (!boardApi || activeView !== "shopping") {
      return;
    }

    boardApi.scrollTo(selectedSectionIndex, !shouldAnimate());
  }, [activeView, boardApi, selectedSectionId, selectedSectionIndex]);

  useEffect(() => {
    if (!boardApi || activeView !== "shopping") {
      return;
    }

    const api = boardApi;
    const animationFrame = window.requestAnimationFrame(() => {
      const nextSectionIndex = Math.max(
        sectionsRef.current.findIndex(
          (section) => section.id === selectedSectionIdRef.current,
        ),
        0,
      );

      api.reInit();
      api.scrollTo(nextSectionIndex, true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeView, boardApi, sections]);

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
    if (lastRemovedItems.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLastRemovedItems([]);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [lastRemovedItems]);

  useEffect(() => {
    if (!lastHiddenPurchasedItem) {
      previousHiddenUndoKeyRef.current = null;
      return;
    }

    if (
      lastHiddenPurchasedItem.id === previousHiddenUndoKeyRef.current ||
      !hiddenUndoItemRef.current
    ) {
      return;
    }

    previousHiddenUndoKeyRef.current = lastHiddenPurchasedItem.id;
    runAnimation(hiddenUndoItemRef.current, {
      opacity: [0, 1],
      y: [-6, 0],
      scale: [0.98, 1],
      duration: 260,
      ease: "outBack",
    });
  }, [lastHiddenPurchasedItem]);

  useEffect(() => {
    if (!lastHiddenPurchasedItem) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLastHiddenPurchasedItem(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [lastHiddenPurchasedItem]);

  useEffect(() => {
    if (!isClearDialogOpen) {
      return;
    }

    clearDialogRef.current?.focus();
  }, [isClearDialogOpen]);

  useEffect(() => {
    const rootElement = document.getElementById("root");

    if (activeView !== "shopping") {
      return;
    }

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootHeight = rootElement?.style.height ?? "";
    const previousRootOverflow = rootElement?.style.overflow ?? "";

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    if (rootElement) {
      rootElement.style.height = "100dvh";
      rootElement.style.overflow = "hidden";
    }

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;

      if (rootElement) {
        rootElement.style.height = previousRootHeight;
        rootElement.style.overflow = previousRootOverflow;
      }
    };
  }, [activeView]);

  useEffect(() => {
    addSheetOpenRef.current = isAddSheetOpen;
  }, [isAddSheetOpen]);

  useEffect(() => {
    if (!isAddSheetOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function updateViewportInset() {
      const visualViewport = window.visualViewport;

      if (!visualViewport) {
        setSheetKeyboardInset(0);
        return;
      }

      setSheetKeyboardInset(
        Math.max(
          0,
          window.innerHeight - visualViewport.height - visualViewport.offsetTop,
        ),
      );
    }

    updateViewportInset();
    window.visualViewport?.addEventListener("resize", updateViewportInset);
    window.visualViewport?.addEventListener("scroll", updateViewportInset);
    const focusFrame = window.requestAnimationFrame(() => {
      itemNameInputRef.current?.focus({ preventScroll: true });
      const textLength = itemNameInputRef.current?.value.length ?? 0;
      itemNameInputRef.current?.setSelectionRange(textLength, textLength);
      resizeAddInput();
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.visualViewport?.removeEventListener("resize", updateViewportInset);
      window.visualViewport?.removeEventListener("scroll", updateViewportInset);
    };
  }, [isAddSheetOpen]);

  useEffect(() => {
    if (!isAddSheetOpen || !addProductNotice) {
      return;
    }

    if (addProductNotice.type !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAddProductNotice((currentNotice) =>
        currentNotice?.type === "success" ? null : currentNotice,
      );
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [addProductNotice, isAddSheetOpen]);

  useEffect(() => {
    if (!highlightedItemId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedItemId(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedItemId]);

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

  function focusAddInputAtEnd() {
    window.requestAnimationFrame(() => {
      const input = itemNameInputRef.current;

      if (!input) {
        return;
      }

      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function resizeAddInput() {
    const input = itemNameInputRef.current;

    if (!input) {
      return;
    }

    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }

  function closeAddSheet(restoreFabFocus = true) {
    setIsAddSheetOpen(false);
    setAddProductNotice(null);
    setSheetDragOffset(0);
    addSheetDragStartYRef.current = null;

    if (restoreFabFocus) {
      window.requestAnimationFrame(() => addFabRef.current?.focus());
    }
  }

  function openAddSheet() {
    setIsAddSheetOpen(true);
    setAddProductNotice(null);
    runHapticFeedback("light");
  }

  function addItemFromName(rawName: string, rawQuantity?: string) {
    const duplicateItem = findPendingShoppingItemByName(
      items,
      rawName,
      selectedSectionId,
    );

    if (duplicateItem) {
      setAddProductNotice({
        type: "duplicate",
        message: `"${duplicateItem.name}" ya está en la lista`,
        itemId: duplicateItem.id,
      });
      focusAddInputAtEnd();
      return false;
    }

    const nextItems = addShoppingItem(
      items,
      rawName,
      selectedSectionId,
      selectedUserId,
      undefined,
      undefined,
      rawQuantity,
    );

    if (nextItems !== items) {
      const currentItemIds = new Set(items.map((item) => item.id));
      const addedItem = nextItems.find((item) => !currentItemIds.has(item.id));

      runHapticFeedback("success");

      if (addedItem) {
        addHistoryEvent(addedItem, "added");
        pendingAddDraftRef.current = rawName;
      }

      setItems(nextItems);
      setItemName("");
      setAddProductNotice({ type: "success", message: "Producto añadido" });
      focusAddInputAtEnd();
      window.requestAnimationFrame(resizeAddInput);
      return true;
    }

    setAddProductNotice({
      type: "error",
      message: "Escribe un producto antes de añadirlo.",
    });
    focusAddInputAtEnd();
    return false;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addItemFromName(itemName, addItemQuantity || "1");
  }

  function handleQuickSuggestionClick(suggestionName: string) {
    setItemName(suggestionName);
    setAddProductNotice(null);
    window.requestAnimationFrame(() => {
      const input = itemNameInputRef.current;

      if (!input) {
        return;
      }

      input.focus({ preventScroll: true });
      input.setSelectionRange(suggestionName.length, suggestionName.length);
      resizeAddInput();
    });
  }

  function handleItemNameChange(value: string) {
    setItemName(value);
    window.requestAnimationFrame(resizeAddInput);

    if (!value) {
      setAddProductNotice(null);
    } else if (addProductNotice?.type === "duplicate") {
      setAddProductNotice(null);
    }
  }

  function handleAddItemQuantityChange(value: string) {
    const numericQuantity = value.replace(/\D+/g, "");

    setAddItemQuantity(numericQuantity);
  }

  function handleAddInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    addItemFromName(itemName, addItemQuantity || "1");
  }

  function handleAddSheetKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAddSheet();
    }
  }

  function handleAddSheetDragStart(event: PointerEvent<HTMLDivElement>) {
    addSheetDragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleAddSheetDragMove(event: PointerEvent<HTMLDivElement>) {
    if (addSheetDragStartYRef.current === null) {
      return;
    }

    setSheetDragOffset(
      Math.max(0, event.clientY - addSheetDragStartYRef.current),
    );
  }

  function handleAddSheetDragEnd() {
    if (sheetDragOffset > 70) {
      closeAddSheet();
      return;
    }

    setSheetDragOffset(0);
    addSheetDragStartYRef.current = null;
  }

  function handleViewDuplicateItem(itemId: string) {
    closeAddSheet(false);
    setHighlightedItemId(itemId);
    window.setTimeout(
      () => {
        itemRefs.current[itemId]?.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: shouldAnimate() ? "smooth" : "auto",
        });
        itemRefs.current[itemId]?.focus({ preventScroll: true });
      },
      shouldAnimate() ? 220 : 0,
    );
  }

  function addHistoryEvent(
    item: ShoppingItem,
    type: "added" | "purchased" | "unpurchased" | "moved" | "deleted",
    previousItem?: ShoppingItem,
  ) {
    const sectionName =
      sections.find((section) => section.id === item.sectionId)?.name ??
      item.sectionId;
    const previousSectionName = previousItem
      ? (sections.find((section) => section.id === previousItem.sectionId)
          ?.name ?? previousItem.sectionId)
      : "";

    setHistoryEvents((currentHistoryEvents) => [
      ...currentHistoryEvents,
      createShoppingHistoryEvent(
        item,
        type,
        selectedUserId,
        historyClientId,
        sectionName,
        previousItem,
        previousSectionName,
      ),
    ]);
  }

  function addHistoryEvents(
    changedItems: ShoppingItem[],
    type: "purchased" | "unpurchased" | "deleted",
  ) {
    setHistoryEvents((currentHistoryEvents) => [
      ...currentHistoryEvents,
      ...changedItems.map((item) => {
        const sectionName =
          sections.find((section) => section.id === item.sectionId)?.name ??
          item.sectionId;

        return createShoppingHistoryEvent(
          item,
          type,
          selectedUserId,
          historyClientId,
          sectionName,
        );
      }),
    ]);
  }

  function startEditing(item: ShoppingItem) {
    runHapticFeedback("light");
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemQuantity(item.quantity ?? "");
    setEditingSectionId(item.sectionId);
  }

  function resetEditing() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemQuantity("");
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
      editingItemQuantity,
    );

    if (nextItems !== items) {
      const previousItem = items.find((item) => item.id === editingItemId);
      const movedItem = nextItems.find((item) => item.id === editingItemId);

      runHapticFeedback("success");

      if (
        previousItem &&
        movedItem &&
        previousItem.sectionId !== movedItem.sectionId
      ) {
        addHistoryEvent(movedItem, "moved", previousItem);
      }

      setItems(nextItems);
    }

    resetEditing();
  }

  function handleRemovePurchasedItems() {
    if (selectedPurchasedCount === 0) {
      return;
    }

    runHapticFeedback("light");
    setIsClearDialogOpen(true);
  }

  function confirmRemovePurchasedItems() {
    if (selectedPurchasedCount === 0) {
      setIsClearDialogOpen(false);
      return;
    }

    const removedItems = selectedPurchasedItems;
    const removedItemIds = new Set(removedItems.map((item) => item.id));

    runHapticFeedback("warning");
    setLastRemovedItems(removedItems);
    setLastHiddenPurchasedItem(null);
    addHistoryEvents(removedItems, "deleted");
    setItems(items.filter((item) => !removedItemIds.has(item.id)));
    setIsClearDialogOpen(false);
  }

  function handleRemoveItem(itemId: string) {
    const removedItem = items.find((item) => item.id === itemId);

    if (!removedItem) {
      return;
    }

    runHapticFeedback("warning");
    setLastRemovedItems([removedItem]);
    setLastHiddenPurchasedItem(null);
    addHistoryEvent(removedItem, "deleted");
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

  function handleUndoHiddenPurchasedItem() {
    if (!lastHiddenPurchasedItem) {
      return;
    }

    const restoredHiddenPurchasedItem = updateShoppingItemPurchasedState(
      lastHiddenPurchasedItem,
      false,
    );

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === lastHiddenPurchasedItem.id
          ? restoredHiddenPurchasedItem
          : item,
      ),
    );
    addHistoryEvent(restoredHiddenPurchasedItem, "unpurchased");
    setLastHiddenPurchasedItem(null);
    runHapticFeedback("success");
  }

  function handleToggleItem(itemId: string) {
    const toggledItem = items.find((item) => item.id === itemId);

    if (!toggledItem) {
      return;
    }

    if (!toggledItem.purchased && !showPurchasedItems) {
      setLastHiddenPurchasedItem(toggledItem);
      setLastRemovedItems([]);
    } else {
      setLastHiddenPurchasedItem(null);
    }

    const nextItems = toggleShoppingItem(items, itemId);
    const changedItem = nextItems.find((item) => item.id === itemId);

    if (changedItem) {
      addHistoryEvent(
        changedItem,
        changedItem.purchased ? "purchased" : "unpurchased",
      );
    }

    setItems(nextItems);
    runHapticFeedback("medium");
  }

  function handleShowPurchasedItemsChange(isVisible: boolean) {
    setShowPurchasedItems(isVisible);

    if (isVisible) {
      setLastHiddenPurchasedItem(null);
    }
  }

  function handleSelectedUserChange(nextUserId: ShoppingUserId) {
    setSelectedUserId(nextUserId);

    if (nextUserId !== "rafa" && activeView === "developer") {
      setActiveView("shopping");
    }
  }

  function selectSection(sectionId: ShoppingSectionId) {
    if (sectionId === selectedSectionId) {
      return;
    }

    setSelectedSectionId(sectionId);
    runHapticFeedback("light");
  }

  async function refreshDeveloperBackupRun() {
    try {
      const latestBackupRun = await getLatestDeveloperBackupRun();
      setDeveloperBackupRun(latestBackupRun);
      setDeveloperBackupError(null);
    } catch {
      setDeveloperBackupError("No se pudo cargar el estado del backup.");
    }
  }

  function showSectionsView() {
    setActiveView("sections");
    setShowUnseenHistoryOnly(false);
    setUnseenHistoryEventsForView([]);
    runHapticFeedback("light");
    window.setTimeout(() => sectionNameInputRef.current?.focus(), 0);
  }

  function showShoppingView() {
    setActiveView("shopping");
    setShowUnseenHistoryOnly(false);
    setUnseenHistoryEventsForView([]);
    runHapticFeedback("light");
  }

  function showHistoryView() {
    setActiveView("history");
    setShowUnseenHistoryOnly(false);
    setUnseenHistoryEventsForView([]);
    runHapticFeedback("light");
  }

  function showDeveloperView() {
    setActiveView("developer");
    setShowUnseenHistoryOnly(false);
    setUnseenHistoryEventsForView([]);
    void refreshDeveloperBackupRun();
    runHapticFeedback("light");
  }

  function showUnseenHistoryView() {
    const latestUnseenEventAt = Math.max(
      ...unseenRemoteHistoryEvents.map((event) => event.createdAt),
      lastSeenHistoryEventAt,
    );

    setLastSeenHistoryEventAt(latestUnseenEventAt);
    setUnseenHistoryEventsForView(unseenRemoteHistoryEvents);
    setShowUnseenHistoryOnly(true);
    setActiveView("history");
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
    setSectionActionMessage(null);
    setSectionName("");
    sectionNameInputRef.current?.focus();
  }

  function handleMoveSection(sectionId: ShoppingSectionId, direction: -1 | 1) {
    const nextSections = moveShoppingSection(sections, sectionId, direction);

    if (nextSections === sections) {
      return;
    }

    runHapticFeedback("medium");
    setSectionActionMessage(null);
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
    setSectionActionMessage(null);
    setSections(nextSections);
  }

  function handleRemoveSection(sectionId: ShoppingSectionId) {
    const sectionToRemove = sections.find(
      (section) => section.id === sectionId,
    );
    const sectionProductCount = items.filter(
      (item) => item.sectionId === sectionId,
    ).length;
    const nextSections = removeShoppingSection(sections, items, sectionId);

    if (nextSections === sections) {
      runHapticFeedback("warning");

      if (sectionProductCount > 0 && sectionToRemove) {
        setSectionActionMessage(
          `No se puede borrar ${sectionToRemove.name} porque tiene productos.`,
        );
      } else if (sections.length <= 1) {
        setSectionActionMessage("No se puede borrar la última lista.");
      }

      return;
    }

    runHapticFeedback("warning");
    setSections(nextSections);
    setSectionActionMessage(
      sectionToRemove ? `${sectionToRemove.name} borrada.` : null,
    );

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

  function renderHiddenPurchasedUndoItem(item: ShoppingItem) {
    return (
      <li
        ref={hiddenUndoItemRef}
        className={styles.undoItem}
        key={`hidden-purchased-${item.id}`}
      >
        <span>Producto marcado como comprado.</span>
        <button
          className={styles.undoButton}
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={handleUndoHiddenPurchasedItem}
        >
          Deshacer
        </button>
      </li>
    );
  }

  function renderItems(
    sectionItems: ShoppingItem[],
    removedSectionItems: ShoppingItem[],
    hiddenPurchasedItem: ShoppingItem | null,
    sectionColor: ShoppingSectionColor,
  ) {
    const renderedSectionItems = showPurchasedItems
      ? sectionItems
      : sectionItems.filter((item) => !item.purchased);

    if (
      renderedSectionItems.length === 0 &&
      removedSectionItems.length === 0 &&
      !hiddenPurchasedItem
    ) {
      return (
        <div
          className={`${styles.empty} ${styles[`shoppingListColor${sectionColor}`]}`}
        >
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="list" />
          </span>
          <p className={styles.emptyTitle}>No hay productos</p>
          <p className={styles.emptyDescription}>
            {sectionItems.length === 0
              ? "Añade el primero usando el formulario superior."
              : "Los productos comprados están ocultos."}
          </p>
        </div>
      );
    }

    const visibleItems = sortShoppingItemsForShopping(renderedSectionItems);
    const sortedRemovedItems = [...removedSectionItems].sort(
      compareShoppingItemsForVisibleOrder,
    );
    const hasPendingItems = sectionItems.some((item) => !item.purchased);
    const hasPurchasedItems = sectionItems.some((item) => item.purchased);
    const shouldShowPurchasedDivider = hasPendingItems && hasPurchasedItems;
    let hasRenderedUndoItem = false;
    let hasRenderedHiddenPurchasedUndoItem = false;
    const listItems = visibleItems.flatMap((item, index) => {
      const itemCategoryId = getShoppingItemCategoryId(item);
      const previousItem = visibleItems[index - 1];
      const shouldRenderCategoryDivider =
        !previousItem ||
        previousItem.purchased !== item.purchased ||
        getShoppingItemCategoryId(previousItem) !== itemCategoryId;
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
              ? `${styles.item} ${styles.itemPurchased} ${
                  highlightedItemId === item.id ? styles.itemHighlighted : ""
                }`
              : `${styles.item} ${
                  highlightedItemId === item.id ? styles.itemHighlighted : ""
                }`
          }
          key={item.id}
          tabIndex={highlightedItemId === item.id ? -1 : undefined}
        >
          <button
            className={
              item.purchased
                ? `${styles.itemCheck} ${styles.itemCheckPurchased}`
                : styles.itemCheck
            }
            type="button"
            aria-label={
              item.purchased
                ? `Devolver ${item.name} a pendientes`
                : `Marcar ${item.name} como comprado`
            }
            title={item.purchased ? "Devolver a pendientes" : "Marcar comprado"}
            onClick={() => handleToggleItem(item.id)}
          >
            <Icon name="check" />
          </button>
          <span
            className={
              item.purchased
                ? `${styles.itemName} ${styles.itemNamePurchased}`
                : styles.itemName
            }
          >
            {item.name}
            {item.quantity ? (
              <span className={styles.itemQuantity}>
                {formatShoppingItemQuantity(item.quantity)}
              </span>
            ) : null}
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
      const categoryDivider = shouldRenderCategoryDivider ? (
        <li
          className={styles.categoryDivider}
          key={`${item.purchased ? "purchased" : "pending"}-${itemCategoryId}`}
        >
          {getShoppingCategoryName(itemCategoryId)}
        </li>
      ) : null;
      const shouldRenderUndoItem =
        !hasRenderedUndoItem &&
        sortedRemovedItems.length > 0 &&
        compareShoppingItemsForVisibleOrder(sortedRemovedItems[0], item) < 0;
      const shouldRenderHiddenPurchasedUndoItem =
        !hasRenderedHiddenPurchasedUndoItem &&
        hiddenPurchasedItem &&
        compareShoppingItemsForVisibleOrder(hiddenPurchasedItem, item) < 0;

      if (shouldRenderUndoItem) {
        hasRenderedUndoItem = true;

        return sortedRemovedItems[0].purchased
          ? [
              purchasedDivider,
              categoryDivider,
              renderUndoItem(sortedRemovedItems),
              itemContent,
            ]
          : [
              renderUndoItem(sortedRemovedItems),
              purchasedDivider,
              categoryDivider,
              itemContent,
            ];
      }

      if (shouldRenderHiddenPurchasedUndoItem) {
        hasRenderedHiddenPurchasedUndoItem = true;

        return [
          renderHiddenPurchasedUndoItem(hiddenPurchasedItem),
          purchasedDivider,
          categoryDivider,
          itemContent,
        ];
      }

      return [purchasedDivider, categoryDivider, itemContent];
    });

    if (!hasRenderedUndoItem && sortedRemovedItems.length > 0) {
      listItems.push(renderUndoItem(sortedRemovedItems));
    }

    if (hiddenPurchasedItem && !hasRenderedHiddenPurchasedUndoItem) {
      listItems.push(renderHiddenPurchasedUndoItem(hiddenPurchasedItem));
    }

    return (
      <ul
        className={`${styles.list} ${styles[`shoppingListColor${sectionColor}`]}`}
      >
        {listItems}
      </ul>
    );
  }

  function renderLoadingItems() {
    return (
      <ul className={`${styles.list} ${styles.loadingList}`} aria-hidden="true">
        {[0, 1, 2].map((itemIndex) => (
          <li className={styles.loadingItem} key={itemIndex}>
            <span className={styles.loadingCheck} />
            <span className={styles.loadingText} />
            <span className={styles.loadingMeta} />
            <span className={styles.loadingAction} />
          </li>
        ))}
      </ul>
    );
  }

  function renderLoadingBoard() {
    return [0, 1, 2].map((columnIndex) => (
      <article
        className={`${styles.column} ${styles.loadingColumn}`}
        aria-hidden="true"
        key={columnIndex}
      >
        <div className={styles.sectionHeader}>
          <span className={styles.loadingTitle} />
          <span className={styles.loadingCount} />
        </div>
        {renderLoadingItems()}
      </article>
    ));
  }

  function renderHistoryEvents() {
    if (displayedHistoryEvents.length === 0) {
      return (
        <div className={styles.historyEmpty}>
          <p className={styles.emptyTitle}>
            {showUnseenHistoryOnly
              ? "No hay cambios pendientes"
              : "No hay historial reciente"}
          </p>
          <p className={styles.emptyDescription}>
            {showUnseenHistoryOnly
              ? "Los cambios de otros dispositivos ya están revisados."
              : "Las compras y borrados aparecerán aquí durante 30 días."}
          </p>
        </div>
      );
    }

    return (
      <ol className={styles.historyList}>
        {displayedHistoryEvents.map((event) => (
          <li className={styles.historyItem} key={event.id}>
            <div className={styles.historyItemHeader}>
              <span className={styles.historyAction}>
                {getHistoryEventText(event)}
              </span>
              <time dateTime={new Date(event.createdAt).toISOString()}>
                {formatHistoryEventDate(event.createdAt)}
              </time>
            </div>
            <p className={styles.historyProduct}>{event.item.name}</p>
            <p className={styles.historyMeta}>{getHistoryEventMeta(event)}</p>
          </li>
        ))}
      </ol>
    );
  }

  function renderDeveloperBackupCard() {
    const backupStatus = getDeveloperBackupStatus(developerBackupRun);
    const backupStatusText = getDeveloperBackupStatusText(backupStatus);
    const hasBackupProblem =
      backupStatus === "failed" || backupStatus === "stale";

    return (
      <section className={styles.developerPanel} aria-label="Estado del backup">
        <div className={styles.developerPanelHeader}>
          <h3>Backup Supabase</h3>
          <span
            className={
              hasBackupProblem
                ? styles.developerStatusFailed
                : styles.developerStatusSuccess
            }
          >
            {backupStatusText}
          </span>
        </div>
        {developerBackupError ? (
          <p className={styles.error} role="alert">
            {developerBackupError}
          </p>
        ) : null}
        <dl className={styles.developerMetrics}>
          <div>
            <dt>Última copia</dt>
            <dd>
              {developerBackupRun
                ? formatDeveloperDate(developerBackupRun.finishedAt)
                : "Sin registro"}
            </dd>
          </div>
          <div>
            <dt>Duración</dt>
            <dd>
              {developerBackupRun
                ? formatDuration(developerBackupRun.durationMs)
                : "Sin dato"}
            </dd>
          </div>
          <div>
            <dt>Tamaño</dt>
            <dd>
              {developerBackupRun
                ? formatFileSize(developerBackupRun.fileSizeBytes)
                : "Sin dato"}
            </dd>
          </div>
          <div>
            <dt>Copias</dt>
            <dd>{developerBackupRun?.retainedCount ?? 0}</dd>
          </div>
          <div>
            <dt>Archivo</dt>
            <dd>{developerBackupRun?.fileName ?? "Sin archivo"}</dd>
          </div>
          <div>
            <dt>SHA-256</dt>
            <dd>{formatShortHash(developerBackupRun?.sha256 ?? null)}</dd>
          </div>
        </dl>
        {developerBackupRun?.errorMessage ? (
          <p className={styles.developerNote}>
            {developerBackupRun.errorMessage}
          </p>
        ) : null}
        {backupStatus === "stale" ? (
          <p className={styles.developerNote} role="alert">
            Hace más de 6 horas que no se completa una copia de seguridad.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <main
      className={
        activeView === "shopping"
          ? `${styles.app} ${styles.appShopping}`
          : styles.app
      }
    >
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
              <dd>
                {isLoaded ? (
                  pendingCount
                ) : (
                  <span className={styles.loadingSummaryValue} />
                )}
              </dd>
            </div>
            <div className={styles.summaryItem}>
              <dt>Comprados</dt>
              <dd>
                {isLoaded ? (
                  purchasedCount
                ) : (
                  <span className={styles.loadingSummaryValue} />
                )}
              </dd>
            </div>
          </dl>
          <p
            className={`${styles.syncStatus} ${styles[`syncStatus${syncStatus}`]}`}
            aria-live="polite"
          >
            {syncStatus === "syncing" ? (
              <span className={styles.syncStatusIndicator} aria-hidden="true" />
            ) : null}
            {getSyncStatusText(syncStatus)}
          </p>
          <div className={styles.headerUserField}>
            <label className={styles.headerUserLabel} htmlFor="user-id">
              Añadido por
            </label>
            <select
              id="user-id"
              className={styles.headerUserSelect}
              value={selectedUserId}
              onChange={(event) =>
                handleSelectedUserChange(event.target.value as ShoppingUserId)
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
      </section>

      {activeView === "shopping" ? (
        <section
          id="shopping-controls"
          className={styles.commandPanel}
          aria-label="Controles de lista"
        >
          <div className={styles.form}>
            <div className={styles.addRow}>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Borrar comprados"
                title="Borrar comprados"
                onPointerDown={handleButtonPointerDown}
                onClick={handleRemovePurchasedItems}
                disabled={!isLoaded || selectedPurchasedCount === 0}
              >
                <Icon name="trash" />
              </button>
              <label className={styles.visibilityToggle}>
                <input
                  checked={showPurchasedItems}
                  onChange={(event) =>
                    handleShowPurchasedItemsChange(event.target.checked)
                  }
                  type="checkbox"
                  disabled={!isLoaded}
                />
                <span>Comprados</span>
              </label>
            </div>
          </div>
        </section>
      ) : null}

      {!isLoaded ? (
        <p className={styles.loadingStatus} role="status" aria-live="polite">
          {getLoadingStatusText()}
        </p>
      ) : storageError ? (
        <p className={styles.error} role="alert">
          {storageError}
        </p>
      ) : null}

      {activeView === "shopping" && !isAddSheetOpen ? (
        <button
          ref={addFabRef}
          className={styles.floatingAddButton}
          type="button"
          aria-label="Añadir producto"
          title="Añadir producto"
          onPointerDown={handleButtonPointerDown}
          onClick={openAddSheet}
          disabled={!isLoaded}
        >
          <Icon name="plus" />
        </button>
      ) : null}

      {activeView === "shopping" && isAddSheetOpen ? (
        <div
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closeAddSheet()}
        >
          <form
            className={styles.addSheet}
            role="dialog"
            aria-modal="false"
            aria-labelledby="add-sheet-title"
            style={
              {
                "--sheet-drag-offset": `${sheetDragOffset}px`,
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleAddSheetKeyDown}
            onSubmit={handleSubmit}
          >
            <div
              className={styles.addSheetHandle}
              aria-label="Cerrar panel de alta"
              role="button"
              tabIndex={0}
              onPointerDown={handleAddSheetDragStart}
              onPointerMove={handleAddSheetDragMove}
              onPointerUp={handleAddSheetDragEnd}
              onPointerCancel={handleAddSheetDragEnd}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  closeAddSheet();
                }
              }}
            >
              <span />
            </div>
            <h2 id="add-sheet-title" className={styles.visuallyHidden}>
              Añadir producto
            </h2>
            <div className={styles.addSheetFields}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="item-name">
                  Producto
                </label>
                <textarea
                  id="item-name"
                  ref={itemNameInputRef}
                  className={styles.addSheetInput}
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  enterKeyHint="done"
                  inputMode="text"
                  rows={1}
                  spellCheck
                  value={itemName}
                  onChange={(event) => handleItemNameChange(event.target.value)}
                  onInput={(event) =>
                    handleItemNameChange(event.currentTarget.value)
                  }
                  onKeyDown={handleAddInputKeyDown}
                  onKeyUp={(event) =>
                    handleItemNameChange(event.currentTarget.value)
                  }
                  placeholder="¿Qué necesitas comprar?"
                  disabled={!isLoaded}
                />
              </div>
              <div className={styles.addSheetSelectors}>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor="sheet-section-id">
                    Supermercado
                  </label>
                  <select
                    id="sheet-section-id"
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
                  <label className={styles.label} htmlFor="item-quantity">
                    Cantidad
                  </label>
                  <input
                    id="item-quantity"
                    className={styles.select}
                    autoCapitalize="none"
                    autoCorrect="off"
                    enterKeyHint="done"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={addItemQuantity}
                    onChange={(event) =>
                      handleAddItemQuantityChange(event.target.value)
                    }
                    disabled={!isLoaded}
                    type="text"
                  />
                </div>
              </div>
            </div>
            <div
              className={styles.addSheetSuggestions}
              role="listbox"
              aria-label="Sugerencias de productos"
            >
              {quickItemSuggestions.map((suggestion) => (
                <button
                  className={styles.addSheetSuggestion}
                  key={`${suggestion.categoryId}-${suggestion.name}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  title={getShoppingCategoryName(suggestion.categoryId)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    handleButtonPointerDown(event);
                  }}
                  onClick={() => handleQuickSuggestionClick(suggestion.name)}
                  disabled={!isLoaded}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
            <div className={styles.addSheetFooter}>
              <p className={styles.addSheetNotice} aria-live="polite">
                {addProductNotice ? addProductNotice.message : ""}
              </p>
              {addProductNotice?.type === "duplicate" ? (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onPointerDown={handleButtonPointerDown}
                  onClick={() =>
                    handleViewDuplicateItem(addProductNotice.itemId)
                  }
                >
                  Ver producto
                </button>
              ) : null}
              <button
                className={styles.primaryButton}
                type="submit"
                onPointerDown={handleButtonPointerDown}
                disabled={!isLoaded}
              >
                Añadir
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {unseenRemoteHistoryEvents.length > 0 && activeView !== "history" ? (
        <section className={styles.remoteChangesBanner} role="status">
          <span>
            {unseenRemoteHistoryEvents.length === 1
              ? "Hay 1 cambio de otro dispositivo."
              : `Hay ${unseenRemoteHistoryEvents.length} cambios de otro dispositivo.`}
          </span>
          <button
            className={styles.undoButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={showUnseenHistoryView}
          >
            Ver cambios
          </button>
        </section>
      ) : null}

      {activeView === "shopping" ? (
        <>
          <section
            id="shopping-board"
            ref={boardRef}
            className={styles.board}
            aria-label="Lista por secciones"
            tabIndex={0}
          >
            <div className={styles.boardTrack}>
              {!isLoaded
                ? renderLoadingBoard()
                : sections.map((section) => {
                    const sectionItems = items.filter(
                      (item) => item.sectionId === section.id,
                    );
                    const removedSectionItems = lastRemovedItems.filter(
                      (item) => item.sectionId === section.id,
                    );
                    const hiddenPurchasedSectionItem =
                      lastHiddenPurchasedItem?.sectionId === section.id
                        ? lastHiddenPurchasedItem
                        : null;
                    const pendingCount = sectionItems.filter(
                      (item) => !item.purchased,
                    ).length;

                    return (
                      <article
                        ref={(column) => {
                          if (column) {
                            sectionColumnRefs.current[section.id] = column;
                          } else {
                            delete sectionColumnRefs.current[section.id];
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
                        onKeyDown={(event) =>
                          handleColumnKeyDown(event, section.id)
                        }
                        tabIndex={0}
                      >
                        <div className={styles.sectionHeader}>
                          <h2 id={`section-${section.id}-title`}>
                            <span>{section.name}</span>
                            <span className={styles.count} aria-hidden="true">
                              · {pendingCount}
                            </span>
                          </h2>
                          <span className={styles.visuallyHidden}>
                            {pendingCount} productos pendientes
                          </span>
                        </div>
                        {renderItems(
                          sectionItems,
                          removedSectionItems,
                          hiddenPurchasedSectionItem,
                          section.color,
                        )}
                      </article>
                    );
                  })}
            </div>
          </section>
          {isLoaded ? (
            <nav
              className={styles.sectionIndicators}
              aria-label="Listas disponibles"
            >
              {sections.map((section) => (
                <button
                  className={
                    selectedSectionId === section.id
                      ? styles.sectionIndicatorActive
                      : styles.sectionIndicator
                  }
                  type="button"
                  aria-current={
                    selectedSectionId === section.id ? "true" : undefined
                  }
                  aria-label={`Ver lista ${section.name}`}
                  key={section.id}
                  onPointerDown={handleButtonPointerDown}
                  onClick={() => selectSection(section.id)}
                />
              ))}
            </nav>
          ) : (
            <div className={styles.sectionIndicators} aria-hidden="true">
              {[0, 1, 2].map((indicatorIndex) => (
                <span
                  className={styles.loadingIndicator}
                  key={indicatorIndex}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {activeView === "sections" ? (
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
          {sectionActionMessage ? (
            <p className={styles.sectionActionMessage} role="status">
              {sectionActionMessage}
            </p>
          ) : null}
          <ol className={styles.sectionManagerList}>
            {sections.map((section, index) => {
              const sectionProductCount = items.filter(
                (item) => item.sectionId === section.id,
              ).length;

              return (
                <li
                  className={`${styles.sectionManagerItem} ${styles[`sectionColor${section.color}`]}`}
                  key={section.id}
                >
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
                      aria-label={`Borrar ${section.name}`}
                      title={
                        sectionProductCount > 0
                          ? "No se puede borrar una lista con productos"
                          : "Borrar"
                      }
                      onPointerDown={handleButtonPointerDown}
                      onClick={() => handleRemoveSection(section.id)}
                      disabled={!isLoaded}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {activeView === "history" ? (
        <section
          className={styles.historyScreen}
          aria-labelledby="history-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="history-title">
              {showUnseenHistoryOnly ? "Cambios nuevos" : "Historial"}
            </h2>
            <span className={styles.count}>
              {displayedHistoryEvents.length}
            </span>
          </div>
          {showUnseenHistoryOnly ? (
            <button
              className={styles.secondaryButton}
              type="button"
              onPointerDown={handleButtonPointerDown}
              onClick={showHistoryView}
            >
              Ver historial completo
            </button>
          ) : null}
          {renderHistoryEvents()}
        </section>
      ) : null}

      {activeView === "developer" && selectedUserId === "rafa" ? (
        <section
          className={styles.developerScreen}
          aria-labelledby="developer-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="developer-title">Dev</h2>
            <span className={styles.count}>Rafa</span>
          </div>
          {renderDeveloperBackupCard()}
          <section
            className={styles.developerPanel}
            aria-label="Información operativa"
          >
            <div className={styles.developerPanelHeader}>
              <h3>App</h3>
              <span className={styles.developerStatusSuccess}>
                {getSyncStatusText(syncStatus)}
              </span>
            </div>
            <dl className={styles.developerMetrics}>
              <div>
                <dt>Almacenamiento</dt>
                <dd>{getShoppingItemsStorageMode()}</dd>
              </div>
              <div>
                <dt>Supabase</dt>
                <dd>
                  {isSupabaseConfigured() ? "Configurado" : "No configurado"}
                </dd>
              </div>
              <div>
                <dt>Listas</dt>
                <dd>{sections.length}</dd>
              </div>
              <div>
                <dt>Pendientes</dt>
                <dd>{pendingCount}</dd>
              </div>
              <div>
                <dt>Comprados</dt>
                <dd>{purchasedCount}</dd>
              </div>
              <div>
                <dt>Historial 30 días</dt>
                <dd>{recentHistoryEvents.length}</dd>
              </div>
            </dl>
          </section>
        </section>
      ) : null}

      <nav className={styles.bottomNav} aria-label="Navegación principal">
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
        <button
          className={
            activeView === "history"
              ? styles.bottomNavItemActive
              : styles.bottomNavItem
          }
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={showHistoryView}
          disabled={!isLoaded}
        >
          <Icon name="history" />
          <span>Historial</span>
        </button>
        {selectedUserId === "rafa" ? (
          <button
            className={
              activeView === "developer"
                ? styles.bottomNavItemActive
                : styles.bottomNavItem
            }
            type="button"
            aria-label="Vista de desarrollador"
            onPointerDown={handleButtonPointerDown}
            onClick={showDeveloperView}
            disabled={!isLoaded}
          >
            <Icon name="database" />
            <span>Dev</span>
          </button>
        ) : null}
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
            <ul
              className={styles.clearPurchasedList}
              aria-label="Productos comprados que se borrarán"
            >
              {selectedPurchasedItems.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <span>{getShoppingUserName(item.addedBy)}</span>
                </li>
              ))}
            </ul>
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
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  autoFocus
                  enterKeyHint="done"
                  inputMode="text"
                  spellCheck
                  value={editingItemName}
                  onChange={(event) => setEditingItemName(event.target.value)}
                  type="text"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="edit-item-quantity">
                  Cantidad
                </label>
                <input
                  id="edit-item-quantity"
                  className={styles.input}
                  autoCapitalize="none"
                  autoCorrect="off"
                  enterKeyHint="done"
                  inputMode="text"
                  spellCheck={false}
                  value={editingItemQuantity}
                  onChange={(event) =>
                    setEditingItemQuantity(event.target.value)
                  }
                  placeholder="x2, 1 kg, 2 packs..."
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
