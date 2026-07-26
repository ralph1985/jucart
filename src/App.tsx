import {
  FormEvent,
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { animate, stagger } from "animejs";
import useEmblaCarousel from "embla-carousel-react";

import styles from "./App.module.scss";
import {
  addFreezerItem,
  freezerDrawers,
  FreezerDrawerId,
  FreezerItem,
  getFreezerDrawerName,
  getFreezerItemsByDrawer,
  isFreezerDrawerId,
  removeFreezerItem,
  sortFreezerItemsByUseFirst,
  updateFreezerItem,
} from "./freezerItems";
import {
  addShoppingItem,
  addShoppingSection,
  CanonicalProductComparisonUnit,
  compareShoppingItemsForShopping,
  createInitialShoppingHistoryEvents,
  createShoppingHistoryEvent,
  defaultShoppingCategories,
  defaultShoppingProductCatalogEntries,
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
  reactivatePurchasedShoppingItem,
  ShoppingCategory,
  ShoppingCanonicalProduct,
  ShoppingCanonicalProductAlias,
  ShoppingHistoryEvent,
  ShoppingItem,
  ShoppingProductNormalizationChange,
  ShoppingProductNormalizationRun,
  ShoppingPriceObservation,
  ShoppingProductCatalogEntry,
  ShoppingRecategorizationChange,
  ShoppingRecategorizationRun,
  shoppingSectionColors,
  ShoppingSectionColor,
  ShoppingSection,
  ShoppingSectionId,
  ShoppingTicket,
  ShoppingTicketFile,
  ShoppingTicketStatus,
  ShoppingUserId,
  shoppingUsers,
  sortShoppingItemsForShopping,
  toggleShoppingItem,
  updateShoppingItemPurchasedState,
  updateShoppingSectionColor,
  updateShoppingItem,
} from "./shoppingItems";
import {
  ShoppingData,
  getCachedShoppingData,
  getShoppingItemsStorageMode,
  getStoredShoppingData,
  replaceStoredShoppingData,
} from "./shoppingItemsDb";
import {
  diagnosePushNotifications,
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationSnapshot,
} from "./pushNotifications";
import type {
  PushNotificationDiagnostic,
  PushNotificationSnapshot,
} from "./pushNotifications";
import type { DeveloperBackupRun } from "./shoppingItemsSupabase";
import { isSupabaseConfigured } from "./supabaseConfig";
import { updateBadge } from "./services/badgeService";

const selectedSectionStorageKey = "jucart:selected-section-id";
const selectedUserStorageKey = "jucart:selected-user-id";
const showPurchasedItemsStorageKey = "jucart:show-purchased-items";
const historyClientIdStorageKey = "jucart:history-client-id";
const lastSeenHistoryEventAtStorageKey = "jucart:last-seen-history-event-at";
const lastSeenRecategorizationChangeAtStorageKey =
  "jucart:last-seen-recategorizations-at";
const lastSeenProductNormalizationChangeAtStorageKey =
  "jucart:last-seen-product-normalizations-at";
const pushInviteDismissedStorageKey = "jucart:push-invite-dismissed";
const ticketPageSize = 10;
const priceObservationPageSize = 10;
const backupStaleThresholdMs = 6 * 60 * 60 * 1000;
const initialPushNotificationSnapshot: PushNotificationSnapshot = {
  status: "syncing",
  message: "Comprobando",
};

type AppView =
  "shopping" | "freezer" | "tickets" | "sections" | "history" | "developer";
type HistoryTab = "changes" | "categories" | "normalizations";
type TicketFilter = "all" | ShoppingTicketStatus;

type IconName =
  | "bell"
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
  | "database"
  | "freezer"
  | "search"
  | "ticket"
  | "upload"
  | "file"
  | "clock"
  | "alert";
type SyncStatus = "local" | "syncing" | "synced" | "offline";
type PullRefreshGesture = {
  pointerId: number;
  startY: number;
  scrollContainer: HTMLElement | null;
};

type TimestampedItem = {
  id: string;
  updatedAt: number;
};
type HapticFeedback = "light" | "medium" | "success" | "warning";
type DeveloperBackupStatus = "empty" | "success" | "failed" | "stale";
type AppOverlay =
  | "add-sheet"
  | "ticket-upload-sheet"
  | "price-detail-sheet"
  | "section-add-sheet"
  | "freezer-add-sheet"
  | "freezer-edit-sheet"
  | "clear-dialog"
  | "edit-dialog";

type BottomSheetOverlay = Extract<
  AppOverlay,
  | "add-sheet"
  | "ticket-upload-sheet"
  | "price-detail-sheet"
  | "section-add-sheet"
  | "freezer-add-sheet"
  | "freezer-edit-sheet"
>;
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
const overlayHistoryStateKey = "jucartOverlay";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string[]> = {
    bell: [
      "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9",
      "M13.73 21a2 2 0 0 1-3.46 0",
    ],
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
    freezer: [
      "M12 3v18",
      "M5 6l14 12",
      "M19 6L5 18",
      "M7 4l5 3 5-3",
      "M7 20l5-3 5 3",
    ],
    search: [
      "M21 21l-4.35-4.35",
      "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z",
    ],
    ticket: [
      "M4 4h16v4a2 2 0 1 0 0 4v8H4v-8a2 2 0 1 0 0-4z",
      "M9 8h6",
      "M9 12h6",
      "M9 16h4",
    ],
    upload: ["M12 16V4", "M7 9l5-5 5 5", "M5 20h14"],
    file: ["M14 3H6v18h12V7z", "M14 3v4h4", "M8 13h8", "M8 17h5"],
    clock: ["M12 8v5l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"],
    alert: [
      "M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z",
      "M12 9v4",
      "M12 17h.01",
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

type ProductPriceSummary = {
  latestObservedAt: number;
  latestPrice: number;
  averagePrice: number;
  comparisonUnit: CanonicalProductComparisonUnit;
  observationCount: number;
};

type ProductPriceCardSummary = {
  ticketSummary: ProductPriceSummary | null;
  bestExternalObservation: ShoppingPriceObservation | null;
};

type ProductPriceSectionSummary = ProductPriceSummary & {
  sectionId: ShoppingSectionId;
};

type TicketReviewEntry = {
  ticket: ShoppingTicket;
  line: ShoppingTicket["lines"][number];
};

function getProductPriceSummaries(
  priceObservations: ShoppingPriceObservation[],
) {
  const ticketObservations = priceObservations.filter(
    (observation) => observation.source === "ticket",
  );
  const observationsByProductId = ticketObservations.reduce(
    (groups, observation) => {
      const currentObservations =
        groups.get(observation.canonicalProductId) ?? [];
      currentObservations.push(observation);
      groups.set(observation.canonicalProductId, currentObservations);

      return groups;
    },
    new Map<string, ShoppingPriceObservation[]>(),
  );
  const priceSummaries = new Map<string, ProductPriceSummary>();

  observationsByProductId.forEach((observations, canonicalProductId) => {
    const [latestObservation] = [...observations].sort(
      (firstObservation, secondObservation) =>
        secondObservation.observedAt - firstObservation.observedAt,
    );

    if (!latestObservation) {
      return;
    }

    priceSummaries.set(canonicalProductId, {
      latestObservedAt: latestObservation.observedAt,
      latestPrice: latestObservation.observedPrice,
      averagePrice:
        observations.reduce(
          (total, observation) => total + observation.observedPrice,
          0,
        ) / observations.length,
      comparisonUnit: latestObservation.comparisonUnit,
      observationCount: observations.length,
    });
  });

  return priceSummaries;
}

function getProductPriceCardSummaries(
  priceObservations: ShoppingPriceObservation[],
) {
  const ticketSummaries = getProductPriceSummaries(priceObservations);
  const externalObservations = priceObservations.filter(
    (observation) => observation.source === "external",
  );
  const summaries = new Map<string, ProductPriceCardSummary>();

  ticketSummaries.forEach((ticketSummary, canonicalProductId) => {
    summaries.set(canonicalProductId, {
      bestExternalObservation: null,
      ticketSummary,
    });
  });

  for (const observation of externalObservations) {
    const currentSummary = summaries.get(observation.canonicalProductId) ?? {
      bestExternalObservation: null,
      ticketSummary: null,
    };
    const currentExternal = currentSummary.bestExternalObservation;

    if (
      !currentExternal ||
      observation.observedPrice < currentExternal.observedPrice
    ) {
      summaries.set(observation.canonicalProductId, {
        ...currentSummary,
        bestExternalObservation: observation,
      });
    }
  }

  return summaries;
}

function getPriceSectionSummaries(
  priceObservations: ShoppingPriceObservation[],
) {
  const ticketObservations = priceObservations.filter(
    (observation) => observation.source === "ticket",
  );
  const observationsBySectionId = ticketObservations.reduce(
    (groups, observation) => {
      const currentObservations = groups.get(observation.sectionId) ?? [];
      currentObservations.push(observation);
      groups.set(observation.sectionId, currentObservations);

      return groups;
    },
    new Map<ShoppingSectionId, ShoppingPriceObservation[]>(),
  );

  return [...observationsBySectionId.entries()]
    .map(([sectionId, observations]): ProductPriceSectionSummary | null => {
      const [latestObservation] = [...observations].sort(
        (firstObservation, secondObservation) =>
          secondObservation.observedAt - firstObservation.observedAt,
      );

      if (!latestObservation) {
        return null;
      }

      return {
        sectionId,
        latestObservedAt: latestObservation.observedAt,
        latestPrice: latestObservation.observedPrice,
        averagePrice:
          observations.reduce(
            (total, observation) => total + observation.observedPrice,
            0,
          ) / observations.length,
        comparisonUnit: latestObservation.comparisonUnit,
        observationCount: observations.length,
      };
    })
    .filter((summary): summary is ProductPriceSectionSummary =>
      Boolean(summary),
    )
    .sort(
      (firstSummary, secondSummary) =>
        secondSummary.latestObservedAt - firstSummary.latestObservedAt,
    );
}

function formatPriceValue(value: number) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatComparisonUnit(unit: CanonicalProductComparisonUnit) {
  if (unit === "kg") {
    return "€/kg";
  }

  if (unit === "l") {
    return "€/l";
  }

  return "€/ud.";
}

function formatPriceSummaryValue(
  value: number,
  unit: CanonicalProductComparisonUnit,
) {
  return `${formatPriceValue(value)} ${formatComparisonUnit(unit)}`;
}

function formatPriceDifference(
  value: number,
  unit: CanonicalProductComparisonUnit,
) {
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${formatPriceSummaryValue(value, unit)}`;
}

function getTicketLineName(line: ShoppingTicket["lines"][number]) {
  return line.productName ?? line.rawText ?? "Línea de ticket";
}

function getTicketLinePriceText(line: ShoppingTicket["lines"][number]) {
  return [
    line.quantity,
    line.unitPrice !== null ? `${line.unitPrice.toFixed(2)} €/ud.` : null,
    line.totalPrice !== null ? `${line.totalPrice.toFixed(2)} €` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function selectTextOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function formatDateInputValue(value: number) {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(value - timezoneOffsetMs).toISOString().slice(0, 10);
}

function parseDateInputValue(value: string, fallback: number = Date.now()) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Date.parse(`${value}T00:00:00`);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function formatFreezerDate(value: number) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getFreezerAgeText(frozenAt: number, now: number = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000;
  const ageDays = Math.max(0, Math.floor((now - frozenAt) / dayMs));

  if (ageDays === 0) {
    return "Hoy";
  }

  if (ageDays === 1) {
    return "1 día";
  }

  if (ageDays < 31) {
    return `${ageDays} días`;
  }

  const ageMonths = Math.floor(ageDays / 30);

  return ageMonths === 1 ? "1 mes" : `${ageMonths} meses`;
}

function getInitialLastSeenHistoryEventAt() {
  return getInitialStoredTimestamp(lastSeenHistoryEventAtStorageKey);
}

function getInitialLastSeenRecategorizationChangeAt() {
  return getInitialStoredTimestamp(lastSeenRecategorizationChangeAtStorageKey);
}

function getInitialLastSeenProductNormalizationChangeAt() {
  return getInitialStoredTimestamp(
    lastSeenProductNormalizationChangeAtStorageKey,
  );
}

function getInitialStoredTimestamp(storageKey: string) {
  try {
    const rawValue = window.localStorage.getItem(storageKey);
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
  categories: ShoppingCategory[] = defaultShoppingCategories,
  productCatalogEntries: ShoppingProductCatalogEntry[] = defaultShoppingProductCatalogEntries,
) {
  return compareShoppingItemsForShopping(
    firstItem,
    secondItem,
    categories,
    productCatalogEntries,
  );
}

function shouldAnimate() {
  if (import.meta.env.MODE === "test") {
    return false;
  }

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

function runAnimationWithCompletion(
  targets: HTMLElement | HTMLElement[],
  parameters: Parameters<typeof animate>[1],
  onComplete: () => void,
) {
  if (!shouldAnimate()) {
    onComplete();
    return;
  }

  let hasCompleted = false;
  const completeOnce = () => {
    if (hasCompleted) {
      return;
    }

    hasCompleted = true;
    onComplete();
  };

  try {
    animate(targets, { ...parameters, onComplete: completeOnce });
  } catch {
    completeOnce();
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

function getRecategorizationChangeMeta(
  change: ShoppingRecategorizationChange,
  categories: ShoppingCategory[],
) {
  return `${getShoppingCategoryName(
    change.previousCategoryId,
    categories,
  )} → ${getShoppingCategoryName(change.nextCategoryId, categories)}`;
}

function getRecategorizationRunSummary(
  run: ShoppingRecategorizationRun | undefined,
) {
  if (!run) {
    return "";
  }

  return `${run.itemsRecategorized} productos · ${run.catalogEntriesAdded} entradas catálogo`;
}

function getProductNormalizationActionText(
  change: ShoppingProductNormalizationChange,
) {
  if (change.action === "merged") {
    return "Productos fusionados";
  }

  if (change.action === "alias_created") {
    return "Alias creado";
  }

  if (change.action === "deleted") {
    return "Producto eliminado";
  }

  return "Producto normalizado";
}

function getProductNormalizationProductText(
  change: ShoppingProductNormalizationChange,
) {
  if (change.previousItemName && change.nextItemName) {
    return `${change.previousItemName} → ${change.nextItemName}`;
  }

  return change.nextItemName ?? change.previousItemName ?? "Producto";
}

function getProductNormalizationChangeMeta(
  change: ShoppingProductNormalizationChange,
) {
  const parts = [
    change.previousCanonicalProductId && change.nextCanonicalProductId
      ? `${change.previousCanonicalProductId} → ${change.nextCanonicalProductId}`
      : change.nextCanonicalProductId
        ? `Canónico: ${change.nextCanonicalProductId}`
        : null,
    change.quantityBefore && change.quantityAfter
      ? `Cantidad: ${change.quantityBefore} → ${change.quantityAfter}`
      : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function getProductNormalizationRunSummary(
  run: ShoppingProductNormalizationRun | undefined,
) {
  if (!run) {
    return "";
  }

  return `${run.itemsTouched} productos · ${run.aliasesCreated} aliases · ${run.quantitiesMerged} cantidades`;
}

function getRecentRecategorizationChanges(
  changes: ShoppingRecategorizationChange[],
  now: () => number = () => Date.now(),
) {
  const cutoff = now() - 30 * 24 * 60 * 60 * 1000;

  return [...changes]
    .filter((change) => change.createdAt >= cutoff)
    .sort(
      (firstChange, secondChange) =>
        secondChange.createdAt - firstChange.createdAt,
    );
}

function getUnseenRecategorizationChanges(
  changes: ShoppingRecategorizationChange[],
  lastSeenRecategorizationChangeAt: number,
  now: () => number = () => Date.now(),
) {
  return getRecentRecategorizationChanges(changes, now).filter(
    (change) => change.createdAt > lastSeenRecategorizationChangeAt,
  );
}

function getRecentProductNormalizationChanges(
  changes: ShoppingProductNormalizationChange[],
  now: () => number = () => Date.now(),
) {
  const cutoff = now() - 30 * 24 * 60 * 60 * 1000;

  return [...changes]
    .filter((change) => change.createdAt >= cutoff)
    .sort(
      (firstChange, secondChange) =>
        secondChange.createdAt - firstChange.createdAt,
    );
}

function getUnseenProductNormalizationChanges(
  changes: ShoppingProductNormalizationChange[],
  lastSeenProductNormalizationChangeAt: number,
  now: () => number = () => Date.now(),
) {
  return getRecentProductNormalizationChanges(changes, now).filter(
    (change) => change.createdAt > lastSeenProductNormalizationChangeAt,
  );
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

function formatTicketDate(value: number) {
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

function getTicketStatusText(status: ShoppingTicketStatus) {
  if (status === "processing") {
    return "Procesando";
  }

  if (status === "processed") {
    return "Procesado";
  }

  if (status === "needs_review") {
    return "Necesita revisión";
  }

  if (status === "failed") {
    return "Fallido";
  }

  return "Pendiente";
}

function getTicketFilterText(filter: TicketFilter) {
  if (filter === "all") {
    return "Todos";
  }

  if (filter === "pending") {
    return "Pendientes";
  }

  if (filter === "processed") {
    return "Procesados";
  }

  if (filter === "failed") {
    return "Fallidos";
  }

  if (filter === "needs_review") {
    return "Necesitan revisión";
  }

  return "Procesando";
}

function getTicketFilterShortText(filter: TicketFilter) {
  if (filter === "needs_review") {
    return "Revisión";
  }

  if (filter === "processed") {
    return "OK";
  }

  if (filter === "failed") {
    return "Error";
  }

  if (filter === "pending") {
    return "Pend.";
  }

  if (filter === "processing") {
    return "Proc.";
  }

  return "Todos";
}

function getTicketFilterIcon(filter: TicketFilter): IconName {
  if (filter === "pending") {
    return "clock";
  }

  if (filter === "processed") {
    return "check";
  }

  if (filter === "failed") {
    return "close";
  }

  if (filter === "needs_review") {
    return "alert";
  }

  if (filter === "processing") {
    return "sync";
  }

  return "list";
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

function keepNewerLocalItems<Item extends TimestampedItem>(
  remoteItems: Item[],
  localItems: Item[],
) {
  const localItemsById = new Map(localItems.map((item) => [item.id, item]));

  return remoteItems.map((remoteItem) => {
    const localItem = localItemsById.get(remoteItem.id);

    return localItem && localItem.updatedAt > remoteItem.updatedAt
      ? localItem
      : remoteItem;
  });
}

function mergeRemoteShoppingDataWithNewerLocalData(
  remoteData: ShoppingData,
  localItems: ShoppingItem[],
  localFreezerItems: FreezerItem[],
): ShoppingData {
  return {
    ...remoteData,
    items: keepNewerLocalItems(remoteData.items, localItems),
    freezerItems: keepNewerLocalItems(
      remoteData.freezerItems ?? [],
      localFreezerItems,
    ),
  };
}

function getLoadingStatusText() {
  return isSupabaseConfigured()
    ? "Cargando lista de Supabase..."
    : "Cargando lista...";
}

function normalizeShoppingSearchQuery(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function getPushNotificationActionText(
  snapshot: PushNotificationSnapshot,
  isSupabaseAvailable: boolean,
) {
  if (!isSupabaseAvailable) {
    return "Sin Supabase";
  }

  if (snapshot.status === "subscribed") {
    return "Desactivar";
  }

  if (snapshot.status === "denied") {
    return "Bloqueadas";
  }

  if (snapshot.status === "unsupported") {
    return "No soportadas";
  }

  if (snapshot.status === "unconfigured") {
    return "Sin clave";
  }

  if (snapshot.status === "syncing") {
    return "Comprobando";
  }

  return snapshot.status === "error" ? "Reintentar" : "Activar";
}

function isPushNotificationActionDisabled(
  snapshot: PushNotificationSnapshot,
  isSupabaseAvailable: boolean,
) {
  return (
    !isSupabaseAvailable ||
    snapshot.status === "denied" ||
    snapshot.status === "syncing" ||
    snapshot.status === "unconfigured" ||
    snapshot.status === "unsupported"
  );
}

function shouldShowPushNotificationInvite(
  snapshot: PushNotificationSnapshot,
  isSupabaseAvailable: boolean,
  isDismissed: boolean,
) {
  return (
    isSupabaseAvailable &&
    !isDismissed &&
    (snapshot.status === "prompt" ||
      snapshot.status === "unsubscribed" ||
      snapshot.status === "error")
  );
}

async function getStoredPriceObservations() {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { getSupabasePriceObservations } =
      await import("./shoppingItemsSupabase");

    return (await getSupabasePriceObservations()) ?? [];
  } catch {
    return [];
  }
}

export function App() {
  const [activeView, setActiveView] = useState<AppView>("shopping");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [freezerItems, setFreezerItems] = useState<FreezerItem[]>([]);
  const [sections, setSections] = useState<ShoppingSection[]>(
    defaultShoppingSections,
  );
  const [categories, setCategories] = useState<ShoppingCategory[]>(
    defaultShoppingCategories,
  );
  const [productCatalogEntries, setProductCatalogEntries] = useState<
    ShoppingProductCatalogEntry[]
  >(defaultShoppingProductCatalogEntries);
  const [canonicalProducts, setCanonicalProducts] = useState<
    ShoppingCanonicalProduct[]
  >([]);
  const [canonicalProductAliases, setCanonicalProductAliases] = useState<
    ShoppingCanonicalProductAlias[]
  >([]);
  const [historyEvents, setHistoryEvents] = useState<ShoppingHistoryEvent[]>(
    [],
  );
  const [recategorizationRuns, setRecategorizationRuns] = useState<
    ShoppingRecategorizationRun[]
  >([]);
  const [recategorizationChanges, setRecategorizationChanges] = useState<
    ShoppingRecategorizationChange[]
  >([]);
  const [productNormalizationRuns, setProductNormalizationRuns] = useState<
    ShoppingProductNormalizationRun[]
  >([]);
  const [productNormalizationChanges, setProductNormalizationChanges] =
    useState<ShoppingProductNormalizationChange[]>([]);
  const [tickets, setTickets] = useState<ShoppingTicket[]>([]);
  const [priceObservations, setPriceObservations] = useState<
    ShoppingPriceObservation[]
  >([]);
  const [selectedPriceProductId, setSelectedPriceProductId] = useState<
    string | null
  >(null);
  const [visiblePriceObservationCount, setVisiblePriceObservationCount] =
    useState(priceObservationPageSize);
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [visibleTicketCount, setVisibleTicketCount] = useState(ticketPageSize);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketReviewProductIds, setTicketReviewProductIds] = useState<
    Record<string, string>
  >({});
  const [ticketCorrectionProductIds, setTicketCorrectionProductIds] = useState<
    Record<string, string>
  >({});
  const [pendingTicketReviewLineId, setPendingTicketReviewLineId] = useState<
    string | null
  >(null);
  const [ticketUploadNotice, setTicketUploadNotice] = useState<string | null>(
    null,
  );
  const [ticketUploadFiles, setTicketUploadFiles] = useState<File[]>([]);
  const [ticketUploadSectionId, setTicketUploadSectionId] =
    useState<ShoppingSectionId>(getInitialSelectedSectionId);
  const [isTicketUploadSheetOpen, setIsTicketUploadSheetOpen] = useState(false);
  const [isTicketUploadPending, setIsTicketUploadPending] = useState(false);
  const [historyClientId] = useState(getInitialHistoryClientId);
  const [lastSeenHistoryEventAt, setLastSeenHistoryEventAt] = useState(
    getInitialLastSeenHistoryEventAt,
  );
  const [
    lastSeenRecategorizationChangeAt,
    setLastSeenRecategorizationChangeAt,
  ] = useState(getInitialLastSeenRecategorizationChangeAt);
  const [
    lastSeenProductNormalizationChangeAt,
    setLastSeenProductNormalizationChangeAt,
  ] = useState(getInitialLastSeenProductNormalizationChangeAt);
  const [showUnseenHistoryOnly, setShowUnseenHistoryOnly] = useState(false);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("changes");
  const [unseenHistoryEventsForView, setUnseenHistoryEventsForView] = useState<
    ShoppingHistoryEvent[]
  >([]);
  const [
    unseenRecategorizationChangesForView,
    setUnseenRecategorizationChangesForView,
  ] = useState<ShoppingRecategorizationChange[]>([]);
  const [
    unseenProductNormalizationChangesForView,
    setUnseenProductNormalizationChangesForView,
  ] = useState<ShoppingProductNormalizationChange[]>([]);
  const [itemName, setItemName] = useState("");
  const [freezerItemName, setFreezerItemName] = useState("");
  const [freezerItemQuantity, setFreezerItemQuantity] = useState("");
  const [selectedFreezerDrawerId, setSelectedFreezerDrawerId] =
    useState<FreezerDrawerId>("top");
  const [freezerItemFrozenAt, setFreezerItemFrozenAt] = useState(() =>
    formatDateInputValue(Date.now()),
  );
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
  const [shoppingSearchQuery, setShoppingSearchQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemQuantity, setEditingItemQuantity] = useState("");
  const [editingSectionId, setEditingSectionId] =
    useState<ShoppingSectionId>("mercadona");
  const [editingFreezerItemId, setEditingFreezerItemId] = useState<
    string | null
  >(null);
  const [editingFreezerItemName, setEditingFreezerItemName] = useState("");
  const [editingFreezerItemQuantity, setEditingFreezerItemQuantity] =
    useState("");
  const [editingFreezerDrawerId, setEditingFreezerDrawerId] =
    useState<FreezerDrawerId>("top");
  const [editingFreezerFrozenAt, setEditingFreezerFrozenAt] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured() ? "syncing" : "local",
  );
  const [pullRefreshDistance, setPullRefreshDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullRefreshMessage, setPullRefreshMessage] = useState<string | null>(
    null,
  );
  const [, setPendingRemoteRequests] = useState(0);
  const [developerBackupRun, setDeveloperBackupRun] =
    useState<DeveloperBackupRun | null>(null);
  const [developerBackupError, setDeveloperBackupError] = useState<
    string | null
  >(null);
  const [pushNotificationSnapshot, setPushNotificationSnapshot] = useState(
    initialPushNotificationSnapshot,
  );
  const [isPushInviteDismissed, setIsPushInviteDismissed] = useState(
    () => window.localStorage.getItem(pushInviteDismissedStorageKey) === "true",
  );
  const [isPushNotificationActionPending, setIsPushNotificationActionPending] =
    useState(false);
  const [pushNotificationDiagnostic, setPushNotificationDiagnostic] =
    useState<PushNotificationDiagnostic | null>(null);
  const [isPushDiagnosticPending, setIsPushDiagnosticPending] = useState(false);
  const [lastRemovedItems, setLastRemovedItems] = useState<ShoppingItem[]>([]);
  const [lastUsedFreezerItem, setLastUsedFreezerItem] =
    useState<FreezerItem | null>(null);
  const [lastHiddenPurchasedItem, setLastHiddenPurchasedItem] =
    useState<ShoppingItem | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isSectionAddSheetOpen, setIsSectionAddSheetOpen] = useState(false);
  const [isFreezerAddSheetOpen, setIsFreezerAddSheetOpen] = useState(false);
  const [closingBottomSheet, setClosingBottomSheet] =
    useState<BottomSheetOverlay | null>(null);
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
  const sectionAddFabRef = useRef<HTMLButtonElement>(null);
  const freezerAddFabRef = useRef<HTMLButtonElement>(null);
  const ticketUploadFabRef = useRef<HTMLButtonElement>(null);
  const freezerItemNameInputRef = useRef<HTMLInputElement>(null);
  const editingFreezerItemNameInputRef = useRef<HTMLInputElement>(null);
  const syncStatusRef = useRef<HTMLParagraphElement>(null);
  const commandPanelRef = useRef<HTMLElement>(null);
  const shoppingBoardElementRef = useRef<HTMLElement | null>(null);
  const freezerScreenRef = useRef<HTMLElement>(null);
  const sectionsScreenRef = useRef<HTMLElement>(null);
  const historyScreenRef = useRef<HTMLElement>(null);
  const ticketsScreenRef = useRef<HTMLElement>(null);
  const developerScreenRef = useRef<HTMLElement>(null);
  const splashScreenRef = useRef<HTMLDivElement>(null);
  const addSheetBackdropRef = useRef<HTMLDivElement>(null);
  const addSheetRef = useRef<HTMLFormElement>(null);
  const sectionAddSheetBackdropRef = useRef<HTMLDivElement>(null);
  const sectionAddSheetRef = useRef<HTMLFormElement>(null);
  const freezerAddSheetBackdropRef = useRef<HTMLDivElement>(null);
  const freezerAddSheetRef = useRef<HTMLFormElement>(null);
  const ticketUploadSheetBackdropRef = useRef<HTMLDivElement>(null);
  const ticketUploadSheetRef = useRef<HTMLFormElement>(null);
  const priceDetailSheetBackdropRef = useRef<HTMLDivElement>(null);
  const priceDetailSheetRef = useRef<HTMLElement>(null);
  const ticketFileInputRef = useRef<HTMLInputElement>(null);
  const freezerEditSheetBackdropRef = useRef<HTMLDivElement>(null);
  const freezerEditSheetRef = useRef<HTMLFormElement>(null);
  const itemRefs = useRef<Partial<Record<string, HTMLElement>>>({});
  const freezerItemRefs = useRef<Partial<Record<string, HTMLElement>>>({});
  const clearDialogRef = useRef<HTMLDivElement>(null);
  const sectionNameInputRef = useRef<HTMLInputElement>(null);
  const sectionColumnRefs = useRef<
    Partial<Record<ShoppingSectionId, HTMLElement>>
  >({});
  const sectionIndicatorRefs = useRef<
    Partial<Record<ShoppingSectionId, HTMLButtonElement>>
  >({});
  const activeSectionIndicatorRef = useRef<HTMLSpanElement>(null);
  const itemsRef = useRef(items);
  const freezerItemsRef = useRef(freezerItems);
  const sectionsRef = useRef(sections);
  const selectedSectionIdRef = useRef(selectedSectionId);
  const hasAnimatedInitialColumnsRef = useRef(false);
  const previousItemIdsRef = useRef<Set<string>>(new Set());
  const previousFreezerItemIdsRef = useRef<Set<string>>(new Set());
  const previousSyncStatusRef = useRef<SyncStatus>(syncStatus);
  const previousUndoKeyRef = useRef<string | null>(null);
  const previousHiddenUndoKeyRef = useRef<string | null>(null);
  const undoItemRef = useRef<HTMLLIElement>(null);
  const hiddenUndoItemRef = useRef<HTMLLIElement>(null);
  const freezerUndoRef = useRef<HTMLDivElement>(null);
  const addSheetOpenRef = useRef(false);
  const overlayHistoryStackRef = useRef<AppOverlay[]>([]);
  const closeOverlayFromHistoryRef = useRef<
    ((overlay: AppOverlay) => void) | null
  >(null);
  const ignoreNextOverlayPopRef = useRef(false);
  const addSheetDragStartYRef = useRef<number | null>(null);
  const pendingAddDraftRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const skipNextStoreRef = useRef(true);
  const localDataRevisionRef = useRef(0);
  const pendingLocalStoresRef = useRef(0);
  const queuedRemoteRefreshRef = useRef(false);
  const refreshRemoteDataRef = useRef<(() => Promise<void>) | null>(null);
  const pullRefreshGestureRef = useRef<PullRefreshGesture | null>(null);
  const pullRefreshMessageTimeoutRef = useRef<number | null>(null);
  const pendingCount = items.filter((item) => !item.purchased).length;
  const purchasedCount = items.filter((item) => item.purchased).length;
  const useFirstFreezerItems = sortFreezerItemsByUseFirst(freezerItems).slice(
    0,
    4,
  );
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
  const editingFreezerItem = editingFreezerItemId
    ? freezerItems.find((item) => item.id === editingFreezerItemId)
    : null;
  const isBottomSheetOpen =
    isAddSheetOpen ||
    isTicketUploadSheetOpen ||
    selectedPriceProductId !== null ||
    isSectionAddSheetOpen ||
    isFreezerAddSheetOpen ||
    editingFreezerItem !== null;
  const selectedSectionName =
    sections.find((section) => section.id === selectedSectionId)?.name ??
    "esta lista";
  const selectedPurchasedItems = sortShoppingItemsForShopping(
    items.filter(
      (item) => item.sectionId === selectedSectionId && item.purchased,
    ),
    categories,
    productCatalogEntries,
  );
  const selectedPurchasedCount = selectedPurchasedItems.length;
  const normalizedShoppingSearchQuery =
    normalizeShoppingSearchQuery(shoppingSearchQuery);
  const isShoppingSearchActive = normalizedShoppingSearchQuery.length > 0;
  const filteredTickets =
    ticketFilter === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.status === ticketFilter);
  const visibleTickets = filteredTickets.slice(0, visibleTicketCount);
  const hiddenTicketCount = Math.max(
    filteredTickets.length - visibleTickets.length,
    0,
  );
  const ticketReviewEntries = tickets.flatMap<TicketReviewEntry>((ticket) =>
    ticket.lines
      .filter((line) => line.needsReview)
      .map((line) => ({ ticket, line })),
  );
  const productPriceCardSummaries =
    getProductPriceCardSummaries(priceObservations);
  const selectedPriceProduct = selectedPriceProductId
    ? canonicalProducts.find((product) => product.id === selectedPriceProductId)
    : null;
  const selectedPriceObservations = selectedPriceProductId
    ? priceObservations
        .filter(
          (observation) =>
            observation.canonicalProductId === selectedPriceProductId,
        )
        .sort(
          (firstObservation, secondObservation) =>
            secondObservation.observedAt - firstObservation.observedAt,
        )
    : [];
  const visibleSelectedPriceObservations = selectedPriceObservations.slice(
    0,
    visiblePriceObservationCount,
  );
  const selectedTicketPriceObservations = selectedPriceObservations.filter(
    (observation) => observation.source === "ticket",
  );
  const hiddenSelectedPriceObservationCount = Math.max(
    selectedPriceObservations.length - visibleSelectedPriceObservations.length,
    0,
  );
  const selectedPriceSummary = selectedPriceProductId
    ? (productPriceCardSummaries.get(selectedPriceProductId)?.ticketSummary ??
      null)
    : null;
  const selectedPriceSectionSummaries = getPriceSectionSummaries(
    selectedPriceObservations,
  );
  const selectedLatestPriceObservation =
    selectedTicketPriceObservations[0] ?? null;
  const selectedPreviousPriceObservation =
    selectedTicketPriceObservations[1] ?? null;
  const selectedPriceDifference =
    selectedLatestPriceObservation && selectedPreviousPriceObservation
      ? selectedLatestPriceObservation.observedPrice -
        selectedPreviousPriceObservation.observedPrice
      : null;
  const selectedPriceDifferenceClassName =
    selectedPriceDifference === null
      ? styles.priceDifferenceNeutral
      : selectedPriceDifference > 0
        ? styles.priceDifferenceUp
        : selectedPriceDifference < 0
          ? styles.priceDifferenceDown
          : styles.priceDifferenceNeutral;
  const selectedPriceProductName =
    selectedPriceProduct?.name ??
    selectedLatestPriceObservation?.productName ??
    "Producto";
  const recentHistoryEvents = getRecentShoppingHistoryEvents(historyEvents);
  const quickItemSuggestions =
    isLoaded && isAddSheetOpen
      ? getQuickShoppingItemSuggestions(
          items,
          historyEvents,
          selectedSectionId,
          itemName,
          12,
          categories,
          productCatalogEntries,
        )
      : [];
  const unseenRemoteHistoryEvents = getUnseenRemoteShoppingHistoryEvents(
    historyEvents,
    historyClientId,
    lastSeenHistoryEventAt,
  );
  const recentRecategorizationChanges = getRecentRecategorizationChanges(
    recategorizationChanges,
  );
  const unseenRecategorizationChanges = getUnseenRecategorizationChanges(
    recategorizationChanges,
    lastSeenRecategorizationChangeAt,
  );
  const recentProductNormalizationChanges =
    getRecentProductNormalizationChanges(productNormalizationChanges);
  const unseenProductNormalizationChanges =
    getUnseenProductNormalizationChanges(
      productNormalizationChanges,
      lastSeenProductNormalizationChangeAt,
    );
  const displayedHistoryEvents = showUnseenHistoryOnly
    ? unseenHistoryEventsForView
    : recentHistoryEvents;
  const displayedRecategorizationChanges = showUnseenHistoryOnly
    ? unseenRecategorizationChangesForView
    : recentRecategorizationChanges;
  const displayedProductNormalizationChanges = showUnseenHistoryOnly
    ? unseenProductNormalizationChangesForView
    : recentProductNormalizationChanges;
  const recategorizationRunsById = new Map(
    recategorizationRuns.map((run) => [run.id, run]),
  );
  const productNormalizationRunsById = new Map(
    productNormalizationRuns.map((run) => [run.id, run]),
  );
  const displayedHistoryCount =
    historyTab === "normalizations"
      ? displayedProductNormalizationChanges.length
      : historyTab === "categories"
        ? displayedRecategorizationChanges.length
        : displayedHistoryEvents.length;
  const removePurchasedButtonText =
    selectedPurchasedCount === 1
      ? "Borrar 1 producto"
      : `Borrar ${selectedPurchasedCount} productos`;
  const clearPurchasedDescription =
    selectedPurchasedCount === 1
      ? `Se borrará 1 producto comprado de ${selectedSectionName}. Podrás deshacerlo después. Si no queda asociado a un producto canónico, dejará de contar para el análisis de precios.`
      : `Se borrarán ${selectedPurchasedCount} productos comprados de ${selectedSectionName}. Podrás deshacerlo después. Si no quedan asociados a un producto canónico, dejarán de contar para el análisis de precios.`;
  const isPushInviteVisible =
    isLoaded &&
    shouldShowPushNotificationInvite(
      pushNotificationSnapshot,
      isSupabaseConfigured(),
      isPushInviteDismissed,
    );

  itemsRef.current = items;
  freezerItemsRef.current = freezerItems;

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

  const markLocalDataChange = useCallback(() => {
    localDataRevisionRef.current += 1;
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pullRefreshMessageTimeoutRef.current !== null) {
        window.clearTimeout(pullRefreshMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function refreshPushNotificationSnapshot() {
      const nextSnapshot = await getPushNotificationSnapshot();

      if (isActive) {
        setPushNotificationSnapshot(nextSnapshot);
      }
    }

    void refreshPushNotificationSnapshot();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      try {
        const storedData = await getCachedShoppingData();
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
          setFreezerItems(storedData.freezerItems ?? []);
          setSections(storedData.sections);
          setCategories(storedData.categories ?? defaultShoppingCategories);
          setProductCatalogEntries(
            storedData.productCatalogEntries ??
              defaultShoppingProductCatalogEntries,
          );
          setCanonicalProducts(storedData.canonicalProducts ?? []);
          setCanonicalProductAliases(storedData.canonicalProductAliases ?? []);
          setHistoryEvents(nextHistoryEvents);
          setRecategorizationRuns(storedData.recategorizationRuns ?? []);
          setRecategorizationChanges(storedData.recategorizationChanges ?? []);
          setProductNormalizationRuns(
            storedData.productNormalizationRuns ?? [],
          );
          setProductNormalizationChanges(
            storedData.productNormalizationChanges ?? [],
          );
          setSelectedSectionId((currentSectionId) =>
            isShoppingSectionId(currentSectionId, storedData.sections)
              ? currentSectionId
              : storedData.sections[0]?.id || "general",
          );
          setStorageError(null);
          setSyncStatus(isSupabaseConfigured() ? "syncing" : "local");
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
      pendingLocalStoresRef.current += 1;

      try {
        setSyncStatus(isSupabaseConfigured() ? "syncing" : "local");
        await replaceStoredShoppingData({
          items,
          sections,
          historyEvents,
          freezerItems,
          categories,
          productCatalogEntries,
          recategorizationRuns,
          recategorizationChanges,
          canonicalProducts,
          canonicalProductAliases,
          productNormalizationRuns,
          productNormalizationChanges,
        });
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
        pendingLocalStoresRef.current = Math.max(
          0,
          pendingLocalStoresRef.current - 1,
        );
        finishRemoteRequest();

        if (
          pendingLocalStoresRef.current === 0 &&
          queuedRemoteRefreshRef.current
        ) {
          queuedRemoteRefreshRef.current = false;
          refreshRemoteDataRef.current?.();
        }
      }
    }

    void storeItems();
  }, [
    beginRemoteRequest,
    canonicalProductAliases,
    canonicalProducts,
    categories,
    freezerItems,
    historyEvents,
    isLoaded,
    items,
    productCatalogEntries,
    productNormalizationChanges,
    productNormalizationRuns,
    recategorizationChanges,
    recategorizationRuns,
    sections,
  ]);

  useEffect(() => {
    if (!isLoaded || !isSupabaseConfigured()) {
      return;
    }

    let isActive = true;

    async function refreshItemsFromSupabase() {
      const refreshStartedAtRevision = localDataRevisionRef.current;
      const finishRemoteRequest = beginRemoteRequest();

      try {
        const [storedData, nextPriceObservations] = await Promise.all([
          getStoredShoppingData(),
          getStoredPriceObservations(),
        ]);

        if (!isActive) {
          return;
        }

        if (pendingLocalStoresRef.current > 0) {
          queuedRemoteRefreshRef.current = true;
          return;
        }

        if (localDataRevisionRef.current !== refreshStartedAtRevision) {
          return;
        }

        const nextStoredData = mergeRemoteShoppingDataWithNewerLocalData(
          storedData,
          itemsRef.current,
          freezerItemsRef.current,
        );

        skipNextStoreRef.current = true;
        setItems(nextStoredData.items);
        setFreezerItems(nextStoredData.freezerItems ?? []);
        setSections(nextStoredData.sections);
        setCategories(nextStoredData.categories ?? defaultShoppingCategories);
        setProductCatalogEntries(
          nextStoredData.productCatalogEntries ??
            defaultShoppingProductCatalogEntries,
        );
        setCanonicalProducts(nextStoredData.canonicalProducts ?? []);
        setCanonicalProductAliases(
          nextStoredData.canonicalProductAliases ?? [],
        );
        setHistoryEvents(nextStoredData.historyEvents);
        setRecategorizationRuns(nextStoredData.recategorizationRuns ?? []);
        setRecategorizationChanges(
          nextStoredData.recategorizationChanges ?? [],
        );
        setProductNormalizationRuns(
          nextStoredData.productNormalizationRuns ?? [],
        );
        setProductNormalizationChanges(
          nextStoredData.productNormalizationChanges ?? [],
        );
        setPriceObservations(nextPriceObservations);
        setSelectedSectionId((currentSectionId) =>
          isShoppingSectionId(currentSectionId, nextStoredData.sections)
            ? currentSectionId
            : nextStoredData.sections[0]?.id || "general",
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

    refreshRemoteDataRef.current = () => {
      return refreshItemsFromSupabase();
    };

    let unsubscribe: () => void = () => undefined;

    async function startSupabaseSubscription() {
      const { subscribeToSupabaseShoppingItems } =
        await import("./shoppingItemsSupabase");

      if (!isActive) {
        return;
      }

      unsubscribe = subscribeToSupabaseShoppingItems(() => {
        if (pendingLocalStoresRef.current > 0) {
          queuedRemoteRefreshRef.current = true;
          return;
        }

        void refreshItemsFromSupabase();
      });
    }

    void startSupabaseSubscription();

    /*
     * The initial render uses IndexedDB. Refresh once after the Supabase chunk
     * loads so cached data is reconciled with the remote list.
     */
    void refreshItemsFromSupabase();

    function refreshItemsWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshItemsFromSupabase();
      }
    }

    document.addEventListener("visibilitychange", refreshItemsWhenVisible);

    return () => {
      isActive = false;
      refreshRemoteDataRef.current = null;
      unsubscribe();
      document.removeEventListener("visibilitychange", refreshItemsWhenVisible);
    };
  }, [beginRemoteRequest, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !isSupabaseConfigured()) {
      return;
    }

    let isActive = true;

    async function refreshTickets() {
      setIsTicketsLoading(true);

      try {
        const { getSupabaseShoppingTickets } =
          await import("./shoppingItemsSupabase");
        const nextTickets = await getSupabaseShoppingTickets();

        if (!isActive) {
          return;
        }

        setTickets(nextTickets ?? []);
        setTicketError(null);
      } catch {
        if (isActive) {
          setTicketError("No se pudo cargar la bandeja de tickets.");
        }
      } finally {
        if (isActive) {
          setIsTicketsLoading(false);
        }
      }
    }

    void refreshTickets();
    const intervalId = window.setInterval(refreshTickets, 30_000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
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
    try {
      window.localStorage.setItem(
        lastSeenRecategorizationChangeAtStorageKey,
        String(lastSeenRecategorizationChangeAt),
      );
    } catch {
      return;
    }
  }, [lastSeenRecategorizationChangeAt]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        lastSeenProductNormalizationChangeAtStorageKey,
        String(lastSeenProductNormalizationChangeAt),
      );
    } catch {
      return;
    }
  }, [lastSeenProductNormalizationChangeAt]);

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
    const splashScreen = splashScreenRef.current;

    if (!isLoaded || !splashScreen) {
      return;
    }

    runAnimationWithCompletion(
      splashScreen,
      {
        opacity: [1, 0],
        scale: [1, 0.985],
        duration: 260,
        ease: "outCubic",
      },
      () => setIsSplashVisible(false),
    );
  }, [isLoaded]);

  useLayoutEffect(() => {
    if (!isLoaded || activeView !== "shopping") {
      return;
    }

    const activeIndicator = activeSectionIndicatorRef.current;
    const selectedButton = sectionIndicatorRefs.current[selectedSectionId];

    if (!activeIndicator || !selectedButton) {
      return;
    }

    const targetX =
      selectedButton.offsetLeft +
      selectedButton.offsetWidth / 2 -
      activeIndicator.offsetWidth / 2;

    if (!shouldAnimate()) {
      activeIndicator.style.transform = `translate3d(${targetX}px, 0, 0)`;
      activeIndicator.style.opacity = "1";
      return;
    }

    runAnimation(activeIndicator, {
      translateX: targetX,
      scale: [0.82, 1],
      opacity: [0.72, 1],
      duration: 300,
      ease: "outCubic",
    });
  }, [activeView, isLoaded, selectedSectionId, sections]);

  useEffect(() => {
    if (!isLoaded || activeView !== "shopping") {
      return;
    }

    function syncActiveSectionIndicatorPosition() {
      const activeIndicator = activeSectionIndicatorRef.current;
      const selectedButton = sectionIndicatorRefs.current[selectedSectionId];

      if (!activeIndicator || !selectedButton) {
        return;
      }

      const targetX =
        selectedButton.offsetLeft +
        selectedButton.offsetWidth / 2 -
        activeIndicator.offsetWidth / 2;

      activeIndicator.style.transform = `translate3d(${targetX}px, 0, 0)`;
    }

    window.addEventListener("resize", syncActiveSectionIndicatorPosition);

    return () => {
      window.removeEventListener("resize", syncActiveSectionIndicatorPosition);
    };
  }, [activeView, isLoaded, selectedSectionId]);

  useLayoutEffect(() => {
    const targets =
      activeView === "shopping"
        ? [commandPanelRef.current, shoppingBoardElementRef.current]
        : [
            activeView === "freezer" ? freezerScreenRef.current : null,
            activeView === "tickets" ? ticketsScreenRef.current : null,
            activeView === "sections" ? sectionsScreenRef.current : null,
            activeView === "history" ? historyScreenRef.current : null,
            activeView === "developer" ? developerScreenRef.current : null,
          ];
    const visibleTargets = targets.filter((target): target is HTMLElement =>
      Boolean(target),
    );

    if (visibleTargets.length === 0) {
      return;
    }

    runAnimation(visibleTargets, {
      opacity: [0, 1],
      y: [10, 0],
      duration: 240,
      delay: stagger(35),
      ease: "outCubic",
    });
  }, [activeView]);

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
    const previousFreezerItemIds = previousFreezerItemIdsRef.current;
    const newFreezerItems = freezerItems.filter(
      (item) => !previousFreezerItemIds.has(item.id),
    );

    previousFreezerItemIdsRef.current = new Set(
      freezerItems.map((item) => item.id),
    );

    const newFreezerItemElements = newFreezerItems
      .map((item) => freezerItemRefs.current[item.id])
      .filter((item): item is HTMLElement => Boolean(item));

    if (newFreezerItemElements.length === 0) {
      return;
    }

    runAnimation(newFreezerItemElements, {
      opacity: [0, 1],
      y: [-8, 0],
      scale: [0.97, 1],
      duration: 320,
      delay: stagger(35),
      ease: "outBack",
    });
  }, [freezerItems]);

  useEffect(() => {
    const previousSyncStatus = previousSyncStatusRef.current;
    previousSyncStatusRef.current = syncStatus;

    if (previousSyncStatus === syncStatus || !syncStatusRef.current) {
      return;
    }

    runAnimation(syncStatusRef.current, {
      scale: [0.94, 1],
      opacity: [0.72, 1],
      duration: 220,
      ease: "outBack",
    });
  }, [syncStatus]);

  useLayoutEffect(() => {
    if (!isAddSheetOpen || closingBottomSheet === "add-sheet") {
      return;
    }

    const sheet = addSheetRef.current;
    const backdrop = addSheetBackdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    runAnimation(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    runAnimation(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [closingBottomSheet, isAddSheetOpen]);

  useLayoutEffect(() => {
    if (!isFreezerAddSheetOpen || closingBottomSheet === "freezer-add-sheet") {
      return;
    }

    const sheet = freezerAddSheetRef.current;
    const backdrop = freezerAddSheetBackdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    runAnimation(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    runAnimation(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [closingBottomSheet, isFreezerAddSheetOpen]);

  useLayoutEffect(() => {
    if (
      !isTicketUploadSheetOpen ||
      closingBottomSheet === "ticket-upload-sheet"
    ) {
      return;
    }

    const sheet = ticketUploadSheetRef.current;
    const backdrop = ticketUploadSheetBackdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    runAnimation(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    runAnimation(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [closingBottomSheet, isTicketUploadSheetOpen]);

  useLayoutEffect(() => {
    if (
      selectedPriceProductId === null ||
      closingBottomSheet === "price-detail-sheet"
    ) {
      return;
    }

    const sheet = priceDetailSheetRef.current;
    const backdrop = priceDetailSheetBackdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    runAnimation(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    runAnimation(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [closingBottomSheet, selectedPriceProductId]);

  useLayoutEffect(() => {
    if (!isSectionAddSheetOpen || closingBottomSheet === "section-add-sheet") {
      return;
    }

    const sheet = sectionAddSheetRef.current;
    const backdrop = sectionAddSheetBackdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    runAnimation(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    runAnimation(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [closingBottomSheet, isSectionAddSheetOpen]);

  useLayoutEffect(() => {
    if (!editingFreezerItem || closingBottomSheet === "freezer-edit-sheet") {
      return;
    }

    const sheet = freezerEditSheetRef.current;
    const backdrop = freezerEditSheetBackdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    runAnimation(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    runAnimation(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [closingBottomSheet, editingFreezerItem]);

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
    if (!lastUsedFreezerItem || !freezerUndoRef.current) {
      return;
    }

    runAnimation(freezerUndoRef.current, {
      opacity: [0, 1],
      y: [-6, 0],
      scale: [0.98, 1],
      duration: 260,
      ease: "outBack",
    });
  }, [lastUsedFreezerItem]);

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
    function handleOverlayPopState() {
      if (ignoreNextOverlayPopRef.current) {
        ignoreNextOverlayPopRef.current = false;
        return;
      }

      const overlay = overlayHistoryStackRef.current.pop();

      if (!overlay) {
        return;
      }

      closeOverlayFromHistoryRef.current?.(overlay);
    }

    window.addEventListener("popstate", handleOverlayPopState);

    return () => {
      window.removeEventListener("popstate", handleOverlayPopState);
    };
  }, []);

  useEffect(() => {
    if (!isBottomSheetOpen) {
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
      if (isAddSheetOpen) {
        itemNameInputRef.current?.focus({ preventScroll: true });
        const textLength = itemNameInputRef.current?.value.length ?? 0;
        itemNameInputRef.current?.setSelectionRange(textLength, textLength);
        resizeAddInput();
        return;
      }

      if (isTicketUploadSheetOpen) {
        ticketFileInputRef.current?.focus({ preventScroll: true });
        return;
      }

      if (selectedPriceProductId !== null) {
        priceDetailSheetRef.current?.focus({ preventScroll: true });
        return;
      }

      if (editingFreezerItem) {
        editingFreezerItemNameInputRef.current?.focus({
          preventScroll: true,
        });
        return;
      }

      if (isSectionAddSheetOpen) {
        sectionNameInputRef.current?.focus({ preventScroll: true });
        return;
      }

      freezerItemNameInputRef.current?.focus({ preventScroll: true });
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.visualViewport?.removeEventListener("resize", updateViewportInset);
      window.visualViewport?.removeEventListener("scroll", updateViewportInset);
    };
  }, [
    editingFreezerItem,
    isAddSheetOpen,
    isBottomSheetOpen,
    isSectionAddSheetOpen,
    isTicketUploadSheetOpen,
    selectedPriceProductId,
  ]);

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

  function focusAddInputAtEndNow() {
    const input = itemNameInputRef.current;

    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function focusAddInputAtEnd() {
    window.requestAnimationFrame(() => {
      focusAddInputAtEndNow();
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

  function pushOverlayHistory(overlay: AppOverlay) {
    const stack = overlayHistoryStackRef.current;

    if (stack.at(-1) === overlay) {
      return;
    }

    const currentState =
      typeof window.history.state === "object" && window.history.state !== null
        ? window.history.state
        : {};

    stack.push(overlay);
    window.history.pushState(
      { ...currentState, [overlayHistoryStateKey]: overlay },
      "",
      window.location.href,
    );
  }

  function consumeOverlayHistory(overlay: AppOverlay) {
    const stack = overlayHistoryStackRef.current;

    if (stack.at(-1) !== overlay) {
      return;
    }

    stack.pop();
    ignoreNextOverlayPopRef.current = true;
    window.history.back();
  }

  function closeBottomSheetWithAnimation(
    overlay: BottomSheetOverlay,
    sheet: HTMLElement | null,
    backdrop: HTMLElement | null,
    closeNow: () => void,
  ) {
    if (closingBottomSheet === overlay) {
      return;
    }

    if (!sheet || !backdrop || !shouldAnimate()) {
      closeNow();
      return;
    }

    setClosingBottomSheet(overlay);
    runAnimation(backdrop, {
      opacity: [1, 0],
      duration: 180,
      ease: "outCubic",
    });
    runAnimationWithCompletion(
      sheet,
      {
        opacity: [1, 0.88],
        y: [Math.max(sheetDragOffset, 0), "100%"],
        duration: 220,
        ease: "inCubic",
      },
      closeNow,
    );
  }

  function closeAddSheet(restoreFabFocus = true, syncHistory = true) {
    closeBottomSheetWithAnimation(
      "add-sheet",
      addSheetRef.current,
      addSheetBackdropRef.current,
      () => {
        if (syncHistory) {
          consumeOverlayHistory("add-sheet");
        }

        setIsAddSheetOpen(false);
        setClosingBottomSheet(null);
        setAddProductNotice(null);
        setSheetDragOffset(0);
        addSheetDragStartYRef.current = null;

        if (restoreFabFocus) {
          window.requestAnimationFrame(() => addFabRef.current?.focus());
        }
      },
    );
  }

  function openAddSheet() {
    pushOverlayHistory("add-sheet");
    flushSync(() => {
      setIsAddSheetOpen(true);
      setAddProductNotice(null);
    });
    focusAddInputAtEndNow();
    runHapticFeedback("light");
  }

  function closeFreezerAddSheet(restoreFabFocus = true, syncHistory = true) {
    closeBottomSheetWithAnimation(
      "freezer-add-sheet",
      freezerAddSheetRef.current,
      freezerAddSheetBackdropRef.current,
      () => {
        if (syncHistory) {
          consumeOverlayHistory("freezer-add-sheet");
        }

        setIsFreezerAddSheetOpen(false);
        setClosingBottomSheet(null);
        setSheetDragOffset(0);
        addSheetDragStartYRef.current = null;

        if (restoreFabFocus) {
          window.requestAnimationFrame(() => freezerAddFabRef.current?.focus());
        }
      },
    );
  }

  function openFreezerAddSheet() {
    pushOverlayHistory("freezer-add-sheet");
    setIsFreezerAddSheetOpen(true);
    runHapticFeedback("light");
  }

  function closePriceDetailSheet(syncHistory = true) {
    closeBottomSheetWithAnimation(
      "price-detail-sheet",
      priceDetailSheetRef.current,
      priceDetailSheetBackdropRef.current,
      () => {
        if (syncHistory) {
          consumeOverlayHistory("price-detail-sheet");
        }

        setSelectedPriceProductId(null);
        setClosingBottomSheet(null);
        setSheetDragOffset(0);
        addSheetDragStartYRef.current = null;
      },
    );
  }

  function openPriceDetailSheet(item: ShoppingItem) {
    if (!item.canonicalProductId) {
      return;
    }

    pushOverlayHistory("price-detail-sheet");
    setSelectedPriceProductId(item.canonicalProductId);
    setVisiblePriceObservationCount(priceObservationPageSize);
    runHapticFeedback("light");
  }

  function closeSectionAddSheet(restoreFabFocus = true, syncHistory = true) {
    closeBottomSheetWithAnimation(
      "section-add-sheet",
      sectionAddSheetRef.current,
      sectionAddSheetBackdropRef.current,
      () => {
        if (syncHistory) {
          consumeOverlayHistory("section-add-sheet");
        }

        setIsSectionAddSheetOpen(false);
        setClosingBottomSheet(null);
        setSectionName("");
        setSheetDragOffset(0);
        addSheetDragStartYRef.current = null;

        if (restoreFabFocus) {
          window.requestAnimationFrame(() => sectionAddFabRef.current?.focus());
        }
      },
    );
  }

  function openSectionAddSheet() {
    pushOverlayHistory("section-add-sheet");
    flushSync(() => {
      setIsSectionAddSheetOpen(true);
    });
    runHapticFeedback("light");
  }

  function closeFreezerEditSheet(syncHistory = true) {
    closeBottomSheetWithAnimation(
      "freezer-edit-sheet",
      freezerEditSheetRef.current,
      freezerEditSheetBackdropRef.current,
      () => {
        if (syncHistory) {
          consumeOverlayHistory("freezer-edit-sheet");
        }

        resetEditingFreezerItem();
        setClosingBottomSheet(null);
        setSheetDragOffset(0);
        addSheetDragStartYRef.current = null;
      },
    );
  }

  function closeActiveBottomSheet() {
    if (isAddSheetOpen) {
      closeAddSheet();
      return;
    }

    if (isFreezerAddSheetOpen) {
      closeFreezerAddSheet();
      return;
    }

    if (isTicketUploadSheetOpen) {
      closeTicketUploadSheet();
      return;
    }

    if (selectedPriceProductId !== null) {
      closePriceDetailSheet();
      return;
    }

    if (isSectionAddSheetOpen) {
      closeSectionAddSheet();
      return;
    }

    if (editingFreezerItem) {
      closeFreezerEditSheet();
    }
  }

  useEffect(() => {
    closeOverlayFromHistoryRef.current = (overlay) => {
      if (overlay === "edit-dialog") {
        resetEditing();
        return;
      }

      if (overlay === "freezer-edit-sheet") {
        closeFreezerEditSheet(false);
        return;
      }

      if (overlay === "clear-dialog") {
        setIsClearDialogOpen(false);
        return;
      }

      if (overlay === "freezer-add-sheet") {
        closeFreezerAddSheet(false, false);
        return;
      }

      if (overlay === "ticket-upload-sheet") {
        closeTicketUploadSheet(false, false);
        return;
      }

      if (overlay === "price-detail-sheet") {
        closePriceDetailSheet(false);
        return;
      }

      if (overlay === "section-add-sheet") {
        closeSectionAddSheet(false, false);
        return;
      }

      closeAddSheet(false, false);
    };
  });

  function addItemFromName(rawName: string, rawQuantity?: string) {
    const duplicateItem = findPendingShoppingItemByName(
      items,
      rawName,
      selectedSectionId,
      canonicalProductAliases,
      canonicalProducts,
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

    const reactivatedItems = reactivatePurchasedShoppingItem(
      items,
      rawName,
      selectedSectionId,
      rawQuantity,
      undefined,
      canonicalProductAliases,
      canonicalProducts,
    );

    if (reactivatedItems !== items) {
      const reactivatedItem = reactivatedItems.find((item) => {
        const previousItem = items.find(
          (currentItem) => currentItem.id === item.id,
        );

        return previousItem?.purchased && !item.purchased;
      });

      runHapticFeedback("success");

      if (reactivatedItem) {
        addHistoryEvent(reactivatedItem, "unpurchased");
      }

      setItems(reactivatedItems);
      setItemName("");
      setAddItemQuantity("1");
      setAddProductNotice({
        type: "success",
        message: "Producto devuelto a pendientes",
      });
      focusAddInputAtEnd();
      window.requestAnimationFrame(resizeAddInput);
      return true;
    }

    const nextItems = addShoppingItem(
      items,
      rawName,
      selectedSectionId,
      selectedUserId,
      undefined,
      undefined,
      rawQuantity,
      productCatalogEntries,
      canonicalProductAliases,
      canonicalProducts,
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
      setAddItemQuantity("1");
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
      closeActiveBottomSheet();
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
      closeActiveBottomSheet();
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

    markLocalDataChange();
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
    markLocalDataChange();
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
    pushOverlayHistory("edit-dialog");
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
    consumeOverlayHistory("edit-dialog");
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
      undefined,
      productCatalogEntries,
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

      markLocalDataChange();
      setItems(nextItems);
    }

    consumeOverlayHistory("edit-dialog");
    resetEditing();
  }

  function handleRemovePurchasedItems() {
    if (selectedPurchasedCount === 0) {
      return;
    }

    pushOverlayHistory("clear-dialog");
    runHapticFeedback("light");
    setIsClearDialogOpen(true);
  }

  function confirmRemovePurchasedItems() {
    if (selectedPurchasedCount === 0) {
      consumeOverlayHistory("clear-dialog");
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
    consumeOverlayHistory("clear-dialog");
    setIsClearDialogOpen(false);
  }

  function handleRemoveItem(itemId: string) {
    const removedItem = items.find((item) => item.id === itemId);

    if (!removedItem) {
      return;
    }

    const shouldRemove = window.confirm(
      `"${removedItem.name}" se borrará de la lista. Si no queda asociado a un producto canónico, se perderá su uso en el análisis de precios.`,
    );

    if (!shouldRemove) {
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

    const currentItemIds = new Set(items.map((item) => item.id));
    const restorableItems = lastRemovedItems.filter(
      (item) => !currentItemIds.has(item.id),
    );

    if (restorableItems.length > 0) {
      markLocalDataChange();
    }

    setItems((currentItems) => {
      const latestItemIds = new Set(currentItems.map((item) => item.id));
      const latestRestorableItems = lastRemovedItems.filter(
        (item) => !latestItemIds.has(item.id),
      );

      if (latestRestorableItems.length === 0) {
        return currentItems;
      }

      return [...currentItems, ...latestRestorableItems].sort(
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

    markLocalDataChange();
    setItems(nextItems);
    runAnimation(itemRefs.current[itemId] ?? [], {
      scale: [0.96, 1],
      duration: 240,
      ease: "outBack",
    });
    runHapticFeedback("medium");
  }

  function handleFreezerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextItems = addFreezerItem(
      freezerItems,
      freezerItemName,
      selectedFreezerDrawerId,
      parseDateInputValue(freezerItemFrozenAt),
      freezerItemQuantity,
    );

    if (nextItems === freezerItems) {
      runHapticFeedback("warning");
      return;
    }

    markLocalDataChange();
    setFreezerItems(nextItems);
    setLastUsedFreezerItem(null);
    setFreezerItemName("");
    setFreezerItemQuantity("");
    setFreezerItemFrozenAt(formatDateInputValue(Date.now()));
    window.requestAnimationFrame(() =>
      freezerItemNameInputRef.current?.focus(),
    );
    runHapticFeedback("success");
  }

  function startEditingFreezerItem(item: FreezerItem) {
    pushOverlayHistory("freezer-edit-sheet");
    runHapticFeedback("light");
    setEditingFreezerItemId(item.id);
    setEditingFreezerItemName(item.name);
    setEditingFreezerItemQuantity(item.quantity ?? "");
    setEditingFreezerDrawerId(item.drawerId);
    setEditingFreezerFrozenAt(formatDateInputValue(item.frozenAt));
  }

  function resetEditingFreezerItem() {
    setEditingFreezerItemId(null);
    setEditingFreezerItemName("");
    setEditingFreezerItemQuantity("");
    setEditingFreezerDrawerId("top");
    setEditingFreezerFrozenAt("");
  }

  function handleFreezerEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingFreezerItemId) {
      return;
    }

    const nextItems = updateFreezerItem(
      freezerItems,
      editingFreezerItemId,
      editingFreezerItemName,
      editingFreezerDrawerId,
      parseDateInputValue(editingFreezerFrozenAt),
      editingFreezerItemQuantity,
    );

    if (nextItems !== freezerItems) {
      markLocalDataChange();
      setFreezerItems(nextItems);
      runHapticFeedback("success");
    }

    closeFreezerEditSheet();
  }

  function handleMoveFreezerItem(itemId: string, drawerId: FreezerDrawerId) {
    const item = freezerItems.find((currentItem) => currentItem.id === itemId);

    if (!item || item.drawerId === drawerId) {
      return;
    }

    const nextItems = updateFreezerItem(
      freezerItems,
      itemId,
      item.name,
      drawerId,
      item.frozenAt,
      item.quantity,
    );

    if (nextItems !== freezerItems) {
      markLocalDataChange();
      setFreezerItems(nextItems);
      window.requestAnimationFrame(() => {
        const movedItemElement = freezerItemRefs.current[itemId];

        if (!movedItemElement) {
          return;
        }

        runAnimation(movedItemElement, {
          scale: [0.97, 1],
          y: [-6, 0],
          duration: 260,
          ease: "outBack",
        });
      });
    }
    runHapticFeedback("medium");
  }

  function handleUseFreezerItem(itemId: string) {
    const item = freezerItems.find((currentItem) => currentItem.id === itemId);

    if (!item) {
      return;
    }

    setLastUsedFreezerItem(item);
    markLocalDataChange();
    setFreezerItems(removeFreezerItem(freezerItems, itemId));
    runHapticFeedback("warning");
  }

  function handleUndoUseFreezerItem() {
    if (!lastUsedFreezerItem) {
      return;
    }

    if (!freezerItems.some((item) => item.id === lastUsedFreezerItem.id)) {
      markLocalDataChange();
    }

    setFreezerItems((currentItems) => {
      if (currentItems.some((item) => item.id === lastUsedFreezerItem.id)) {
        return currentItems;
      }

      return sortFreezerItemsByUseFirst([...currentItems, lastUsedFreezerItem]);
    });
    setLastUsedFreezerItem(null);
    runHapticFeedback("success");
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

  function getPullRefreshScrollContainer(target: EventTarget | null) {
    let element = target instanceof HTMLElement ? target : null;

    while (element && element !== document.body) {
      const computedStyle = window.getComputedStyle(element);
      const canScrollVertically =
        (computedStyle.overflowY === "auto" ||
          computedStyle.overflowY === "scroll") &&
        element.scrollHeight > element.clientHeight;

      if (canScrollVertically) {
        return element;
      }

      element = element.parentElement;
    }

    return document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : null;
  }

  function isPullRefreshExcludedTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          "button, input, select, textarea, [role=dialog], [data-pull-refresh-ignore]",
        ),
      )
    );
  }

  function handlePullRefreshPointerDown(event: PointerEvent<HTMLElement>) {
    if (
      event.pointerType === "mouse" ||
      event.button !== 0 ||
      !isLoaded ||
      isPullRefreshing ||
      isBottomSheetOpen ||
      isPullRefreshExcludedTarget(event.target)
    ) {
      return;
    }

    const scrollContainer = getPullRefreshScrollContainer(event.target);

    if (!scrollContainer || scrollContainer.scrollTop > 0) {
      return;
    }

    pullRefreshGestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollContainer,
    };
  }

  function handlePullRefreshPointerMove(event: PointerEvent<HTMLElement>) {
    const gesture = pullRefreshGestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    if (!gesture.scrollContainer || gesture.scrollContainer.scrollTop > 0) {
      pullRefreshGestureRef.current = null;
      setPullRefreshDistance(0);
      return;
    }

    const distance = Math.max(0, event.clientY - gesture.startY);

    if (distance === 0) {
      return;
    }

    event.preventDefault();
    setPullRefreshDistance(Math.min(96, distance * 0.48));
  }

  function finishPullRefreshGesture() {
    pullRefreshGestureRef.current = null;
    setPullRefreshDistance(0);
  }

  async function refreshLocalShoppingData() {
    const storedData = await getCachedShoppingData();

    skipNextStoreRef.current = true;
    setItems(storedData.items);
    setFreezerItems(storedData.freezerItems ?? []);
    setSections(storedData.sections);
    setCategories(storedData.categories ?? defaultShoppingCategories);
    setProductCatalogEntries(
      storedData.productCatalogEntries ?? defaultShoppingProductCatalogEntries,
    );
    setCanonicalProducts(storedData.canonicalProducts ?? []);
    setCanonicalProductAliases(storedData.canonicalProductAliases ?? []);
    setHistoryEvents(storedData.historyEvents);
    setRecategorizationRuns(storedData.recategorizationRuns ?? []);
    setRecategorizationChanges(storedData.recategorizationChanges ?? []);
    setProductNormalizationRuns(storedData.productNormalizationRuns ?? []);
    setProductNormalizationChanges(
      storedData.productNormalizationChanges ?? [],
    );
    setSelectedSectionId((currentSectionId) =>
      isShoppingSectionId(currentSectionId, storedData.sections)
        ? currentSectionId
        : storedData.sections[0]?.id || "general",
    );
    setStorageError(null);
    setSyncStatus(isSupabaseConfigured() ? "syncing" : "local");
  }

  async function refreshCurrentView() {
    if (!isLoaded || isPullRefreshing) {
      return;
    }

    setIsPullRefreshing(true);
    setPullRefreshMessage("Actualizando…");

    try {
      if (activeView === "tickets" && isSupabaseConfigured()) {
        await refreshTicketsAfterReviewAction();
      } else if (activeView === "developer" && isSupabaseConfigured()) {
        await refreshDeveloperBackupRun();
      } else if (isSupabaseConfigured()) {
        await refreshRemoteDataRef.current?.();
      } else {
        await refreshLocalShoppingData();
      }

      setPullRefreshMessage("Actualizado");
      runHapticFeedback("success");
    } catch {
      setPullRefreshMessage("No se pudo actualizar");
      runHapticFeedback("warning");
    } finally {
      setIsPullRefreshing(false);

      if (pullRefreshMessageTimeoutRef.current !== null) {
        window.clearTimeout(pullRefreshMessageTimeoutRef.current);
      }

      pullRefreshMessageTimeoutRef.current = window.setTimeout(() => {
        setPullRefreshMessage(null);
        pullRefreshMessageTimeoutRef.current = null;
      }, 1800);
    }
  }

  function handlePullRefreshPointerUp(event: PointerEvent<HTMLElement>) {
    const gesture = pullRefreshGestureRef.current;

    if (!gesture || gesture.pointerId !== event.pointerId) {
      return;
    }

    const shouldRefresh = pullRefreshDistance >= 30;
    finishPullRefreshGesture();

    if (shouldRefresh) {
      void refreshCurrentView();
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
      const { getLatestDeveloperBackupRun } =
        await import("./shoppingItemsSupabase");
      const latestBackupRun = await getLatestDeveloperBackupRun();
      setDeveloperBackupRun(latestBackupRun);
      setDeveloperBackupError(null);
    } catch {
      setDeveloperBackupError("No se pudo cargar el estado del backup.");
    }
  }

  async function handlePushNotificationAction() {
    setIsPushNotificationActionPending(true);
    setPushNotificationDiagnostic(null);
    window.localStorage.removeItem(pushInviteDismissedStorageKey);
    setIsPushInviteDismissed(false);
    setPushNotificationSnapshot({
      status: "syncing",
      message: "Sincronizando",
    });

    const nextSnapshot =
      pushNotificationSnapshot.status === "subscribed"
        ? await disablePushNotifications()
        : await enablePushNotifications(historyClientId);

    if (isMountedRef.current) {
      setPushNotificationSnapshot(nextSnapshot);
      setIsPushNotificationActionPending(false);
    }
  }

  function handleDismissPushNotificationInvite() {
    window.localStorage.setItem(pushInviteDismissedStorageKey, "true");
    setIsPushInviteDismissed(true);
  }

  async function handlePushNotificationDiagnostic() {
    setIsPushDiagnosticPending(true);
    setPushNotificationDiagnostic({
      details: ["Comprobando..."],
      message: "Comprobando",
      ok: false,
    });

    const diagnostic = await diagnosePushNotifications(historyClientId);

    if (isMountedRef.current) {
      setPushNotificationDiagnostic(diagnostic);
      setIsPushDiagnosticPending(false);
    }
  }

  function showSectionsView() {
    setActiveView("sections");
    setShowUnseenHistoryOnly(false);
    setHistoryTab("changes");
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
    runHapticFeedback("light");
  }

  function showShoppingView() {
    setActiveView("shopping");
    setShowUnseenHistoryOnly(false);
    setHistoryTab("changes");
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
    runHapticFeedback("light");
  }

  function showFreezerView() {
    setActiveView("freezer");
    setShowUnseenHistoryOnly(false);
    setHistoryTab("changes");
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
    runHapticFeedback("light");
  }

  function showTicketsView() {
    setActiveView("tickets");
    setShowUnseenHistoryOnly(false);
    setHistoryTab("changes");
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
    runHapticFeedback("light");
  }

  function showHistoryView() {
    setActiveView("history");
    setShowUnseenHistoryOnly(false);
    setHistoryTab("changes");
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
    if (recentHistoryEvents.length > 0) {
      setLastSeenHistoryEventAt(
        Math.max(
          ...recentHistoryEvents.map((event) => event.createdAt),
          lastSeenHistoryEventAt,
        ),
      );
    }
    runHapticFeedback("light");
  }

  function openTicketUploadSheet() {
    if (!isLoaded || isTicketUploadSheetOpen) {
      return;
    }

    setTicketUploadSectionId(selectedSectionId);
    setTicketUploadFiles([]);
    setTicketError(null);
    setTicketUploadNotice(null);
    setSheetDragOffset(0);
    setIsTicketUploadSheetOpen(true);
    pushOverlayHistory("ticket-upload-sheet");
    window.requestAnimationFrame(() =>
      ticketFileInputRef.current?.focus({ preventScroll: true }),
    );
    runHapticFeedback("light");
  }

  function closeTicketUploadSheet(restoreFabFocus = true, syncHistory = true) {
    if (!isTicketUploadSheetOpen) {
      return;
    }

    closeBottomSheetWithAnimation(
      "ticket-upload-sheet",
      ticketUploadSheetRef.current,
      ticketUploadSheetBackdropRef.current,
      () => {
        if (syncHistory) {
          consumeOverlayHistory("ticket-upload-sheet");
        }

        setIsTicketUploadSheetOpen(false);
        setClosingBottomSheet(null);
        setTicketUploadFiles([]);
        setSheetDragOffset(0);

        if (restoreFabFocus) {
          window.requestAnimationFrame(() =>
            ticketUploadFabRef.current?.focus(),
          );
        }
      },
    );
  }

  function handleTicketFilesChange(event: ChangeEvent<HTMLInputElement>) {
    setTicketUploadFiles(Array.from(event.target.files ?? []));
    setTicketError(null);
  }

  async function handleTicketUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ticketUploadFiles.length === 0 || isTicketUploadPending) {
      setTicketError("Selecciona al menos un PDF o foto.");
      return;
    }

    setIsTicketUploadPending(true);
    setTicketError(null);

    try {
      const { uploadSupabaseShoppingTicket, getSupabaseShoppingTickets } =
        await import("./shoppingItemsSupabase");
      await uploadSupabaseShoppingTicket({
        files: ticketUploadFiles,
        sectionId: ticketUploadSectionId,
        uploadedBy: selectedUserId,
      });
      const nextTickets = await getSupabaseShoppingTickets();

      setTickets(nextTickets ?? []);
      setTicketUploadNotice("Ticket subido. Queda pendiente de procesar.");
      closeTicketUploadSheet();
      setActiveView("tickets");
      runHapticFeedback("success");
    } catch {
      setTicketError(
        "No se pudo subir el ticket. Reintenta la subida completa.",
      );
      runHapticFeedback("warning");
    } finally {
      setIsTicketUploadPending(false);
    }
  }

  async function refreshTicketsAfterReviewAction() {
    const { getSupabasePriceObservations, getSupabaseShoppingTickets } =
      await import("./shoppingItemsSupabase");
    const [nextTickets, nextPriceObservations] = await Promise.all([
      getSupabaseShoppingTickets(),
      getSupabasePriceObservations(),
    ]);

    setTickets(nextTickets ?? []);
    setPriceObservations(nextPriceObservations ?? []);
  }

  function handleTicketReviewProductChange(lineId: string, productId: string) {
    setTicketReviewProductIds((currentProductIds) => ({
      ...currentProductIds,
      [lineId]: productId,
    }));
  }

  function handleTicketFilterChange(filter: TicketFilter) {
    setTicketFilter(filter);
    setSelectedTicketId(null);
    setVisibleTicketCount(ticketPageSize);
  }

  function showMoreTickets() {
    setVisibleTicketCount((currentCount) => currentCount + ticketPageSize);
  }

  function showMorePriceObservations() {
    setVisiblePriceObservationCount(
      (currentCount) => currentCount + priceObservationPageSize,
    );
  }

  function handleTicketCorrectionProductChange(
    line: ShoppingTicket["lines"][number],
    productId: string,
  ) {
    setTicketCorrectionProductIds((currentProductIds) => ({
      ...currentProductIds,
      [line.id]: productId,
    }));
  }

  async function handleResolveTicketLine(
    ticket: ShoppingTicket,
    line: ShoppingTicket["lines"][number],
    createAlias: boolean,
  ) {
    const canonicalProductId = ticketReviewProductIds[line.id];
    const canonicalProduct = canonicalProducts.find(
      (product) => product.id === canonicalProductId,
    );

    if (!canonicalProduct || pendingTicketReviewLineId) {
      return;
    }

    setPendingTicketReviewLineId(line.id);
    setTicketError(null);

    try {
      const { resolveSupabaseTicketLine } =
        await import("./shoppingItemsSupabase");
      await resolveSupabaseTicketLine({
        ticket,
        line,
        canonicalProduct,
        createAlias,
        alias: line.productName ?? line.rawText ?? "",
      });
      await refreshTicketsAfterReviewAction();
      setTicketReviewProductIds((currentProductIds) => {
        const nextProductIds = { ...currentProductIds };
        delete nextProductIds[line.id];

        return nextProductIds;
      });
      setTicketUploadNotice(
        createAlias ? "Línea asociada y alias creado." : "Línea asociada.",
      );
      runHapticFeedback("success");
    } catch {
      setTicketError("No se pudo resolver la línea del ticket.");
      runHapticFeedback("warning");
    } finally {
      setPendingTicketReviewLineId(null);
    }
  }

  async function handleCorrectTicketLine(
    ticket: ShoppingTicket,
    line: ShoppingTicket["lines"][number],
    createAlias: boolean,
  ) {
    const canonicalProductId =
      ticketCorrectionProductIds[line.id] ?? line.canonicalProductId ?? "";
    const canonicalProduct = canonicalProducts.find(
      (product) => product.id === canonicalProductId,
    );

    if (!canonicalProduct || pendingTicketReviewLineId) {
      return;
    }

    setPendingTicketReviewLineId(line.id);
    setTicketError(null);

    try {
      const { resolveSupabaseTicketLine } =
        await import("./shoppingItemsSupabase");
      await resolveSupabaseTicketLine({
        ticket,
        line,
        canonicalProduct,
        createAlias,
        alias: line.productName ?? line.rawText ?? "",
        removeExistingAlias: true,
        replaceProductName: true,
      });
      await refreshTicketsAfterReviewAction();
      setTicketCorrectionProductIds((currentProductIds) => {
        const nextProductIds = { ...currentProductIds };
        delete nextProductIds[line.id];

        return nextProductIds;
      });
      setTicketUploadNotice(
        createAlias
          ? "Asociación corregida y alias actualizado."
          : "Asociación corregida.",
      );
      runHapticFeedback("success");
    } catch {
      setTicketError("No se pudo corregir la línea del ticket.");
      runHapticFeedback("warning");
    } finally {
      setPendingTicketReviewLineId(null);
    }
  }

  async function handleExcludeTicketLine(
    ticket: ShoppingTicket,
    line: ShoppingTicket["lines"][number],
  ) {
    if (pendingTicketReviewLineId) {
      return;
    }

    setPendingTicketReviewLineId(line.id);
    setTicketError(null);

    try {
      const { excludeSupabaseTicketLine } =
        await import("./shoppingItemsSupabase");
      await excludeSupabaseTicketLine(ticket, line);
      await refreshTicketsAfterReviewAction();
      setTicketReviewProductIds((currentProductIds) => {
        const nextProductIds = { ...currentProductIds };
        delete nextProductIds[line.id];

        return nextProductIds;
      });
      setTicketUploadNotice("Línea excluida del análisis.");
      runHapticFeedback("success");
    } catch {
      setTicketError("No se pudo excluir la línea del ticket.");
      runHapticFeedback("warning");
    } finally {
      setPendingTicketReviewLineId(null);
    }
  }

  async function handleOpenTicketFile(file: ShoppingTicketFile) {
    try {
      const { createSupabaseTicketFileUrl } =
        await import("./shoppingItemsSupabase");
      const signedUrl = await createSupabaseTicketFileUrl(file);

      if (signedUrl) {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setTicketError("No se pudo abrir el archivo privado.");
    }
  }

  function showDeveloperView() {
    setActiveView("developer");
    setShowUnseenHistoryOnly(false);
    setHistoryTab("changes");
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
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
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView([]);
    setShowUnseenHistoryOnly(true);
    setHistoryTab("changes");
    setActiveView("history");
    runHapticFeedback("light");
  }

  function showUnseenRecategorizationView() {
    const latestUnseenEventAt = Math.max(
      ...unseenRecategorizationChanges.map((change) => change.createdAt),
      lastSeenRecategorizationChangeAt,
    );

    setLastSeenRecategorizationChangeAt(latestUnseenEventAt);
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView(unseenRecategorizationChanges);
    setUnseenProductNormalizationChangesForView([]);
    setShowUnseenHistoryOnly(true);
    setHistoryTab("categories");
    setActiveView("history");
    runHapticFeedback("light");
  }

  function showUnseenProductNormalizationView() {
    const latestUnseenEventAt = Math.max(
      ...unseenProductNormalizationChanges.map((change) => change.createdAt),
      lastSeenProductNormalizationChangeAt,
    );

    setLastSeenProductNormalizationChangeAt(latestUnseenEventAt);
    setUnseenHistoryEventsForView([]);
    setUnseenRecategorizationChangesForView([]);
    setUnseenProductNormalizationChangesForView(
      unseenProductNormalizationChanges,
    );
    setShowUnseenHistoryOnly(true);
    setHistoryTab("normalizations");
    setActiveView("history");
    runHapticFeedback("light");
  }

  function handleHistoryTabClick(nextTab: HistoryTab) {
    setHistoryTab(nextTab);

    if (nextTab === "changes" && recentHistoryEvents.length > 0) {
      setLastSeenHistoryEventAt(
        Math.max(
          ...recentHistoryEvents.map((event) => event.createdAt),
          lastSeenHistoryEventAt,
        ),
      );
    }

    if (nextTab === "categories" && recentRecategorizationChanges.length > 0) {
      setLastSeenRecategorizationChangeAt(
        Math.max(
          ...recentRecategorizationChanges.map((change) => change.createdAt),
          lastSeenRecategorizationChangeAt,
        ),
      );
    }

    if (
      nextTab === "normalizations" &&
      recentProductNormalizationChanges.length > 0
    ) {
      setLastSeenProductNormalizationChangeAt(
        Math.max(
          ...recentProductNormalizationChanges.map(
            (change) => change.createdAt,
          ),
          lastSeenProductNormalizationChangeAt,
        ),
      );
    }
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
      markLocalDataChange();
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
    markLocalDataChange();
    setSections(nextSections);
    setSelectedSectionId(nextSections[nextSections.length - 1].id);
    setSectionActionMessage(null);
    closeSectionAddSheet();
  }

  function handleMoveSection(sectionId: ShoppingSectionId, direction: -1 | 1) {
    const nextSections = moveShoppingSection(sections, sectionId, direction);

    if (nextSections === sections) {
      return;
    }

    runHapticFeedback("medium");
    setSectionActionMessage(null);
    markLocalDataChange();
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
    markLocalDataChange();
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
    markLocalDataChange();
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

  function renderFreezerUseUndoItem() {
    if (!lastUsedFreezerItem) {
      return null;
    }

    return (
      <div ref={freezerUndoRef} className={styles.freezerUndo} role="status">
        <span>{lastUsedFreezerItem.name} usado.</span>
        <button
          className={styles.undoButton}
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={handleUndoUseFreezerItem}
        >
          Deshacer
        </button>
      </div>
    );
  }

  function renderFreezerItemCard(item: FreezerItem) {
    const availableDrawers = freezerDrawers.filter(
      (drawer) => drawer.id !== item.drawerId,
    );

    return (
      <li
        ref={(itemElement) => {
          if (itemElement) {
            freezerItemRefs.current[item.id] = itemElement;
          } else {
            delete freezerItemRefs.current[item.id];
          }
        }}
        className={styles.freezerItem}
        key={item.id}
      >
        <div className={styles.freezerItemBody}>
          <p className={styles.freezerItemName}>{item.name}</p>
          <p className={styles.freezerItemMeta}>
            <span>{getFreezerDrawerName(item.drawerId)}</span>
            <span>{formatFreezerDate(item.frozenAt)}</span>
            <span>{getFreezerAgeText(item.frozenAt)}</span>
            {item.quantity ? <span>{item.quantity}</span> : null}
          </p>
        </div>
        <div className={styles.freezerItemActions}>
          <button
            className={styles.iconButton}
            type="button"
            aria-label={`Editar ${item.name}`}
            title="Editar"
            onPointerDown={handleButtonPointerDown}
            onClick={() => startEditingFreezerItem(item)}
          >
            <Icon name="edit" />
          </button>
          {availableDrawers.map((drawer) => (
            <button
              className={styles.freezerMoveButton}
              type="button"
              key={drawer.id}
              onPointerDown={handleButtonPointerDown}
              onClick={() => handleMoveFreezerItem(item.id, drawer.id)}
            >
              {drawer.name}
            </button>
          ))}
          <button
            className={styles.dangerButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={() => handleUseFreezerItem(item.id)}
          >
            Usado
          </button>
        </div>
      </li>
    );
  }

  function renderFreezerItemList(itemsToRender: FreezerItem[]) {
    if (itemsToRender.length === 0) {
      return (
        <div className={styles.freezerEmpty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="freezer" />
          </span>
          <p className={styles.emptyTitle}>Sin productos</p>
          <p className={styles.emptyDescription}>
            Añade algo cuando guardes comida en el congelador.
          </p>
        </div>
      );
    }

    return (
      <ol className={styles.freezerList}>
        {itemsToRender.map((item) => renderFreezerItemCard(item))}
      </ol>
    );
  }

  function renderItems(
    sectionItems: ShoppingItem[],
    removedSectionItems: ShoppingItem[],
    hiddenPurchasedItem: ShoppingItem | null,
    sectionColor: ShoppingSectionColor,
  ) {
    const renderedSectionItems = (
      showPurchasedItems
        ? sectionItems
        : sectionItems.filter((item) => !item.purchased)
    ).filter((item) =>
      isShoppingSearchActive
        ? normalizeShoppingSearchQuery(item.name).includes(
            normalizedShoppingSearchQuery,
          )
        : true,
    );

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
          <p className={styles.emptyTitle}>
            {isShoppingSearchActive
              ? "No hay coincidencias"
              : "No hay productos"}
          </p>
          <p className={styles.emptyDescription}>
            {isShoppingSearchActive
              ? "No hay coincidencias con la búsqueda."
              : sectionItems.length === 0
                ? "Añade el primero usando el formulario superior."
                : "Los productos comprados están ocultos."}
          </p>
        </div>
      );
    }

    const visibleItems = sortShoppingItemsForShopping(
      renderedSectionItems,
      categories,
      productCatalogEntries,
    );
    const sortedRemovedItems = [...removedSectionItems].sort(
      (firstItem, secondItem) =>
        compareShoppingItemsForVisibleOrder(
          firstItem,
          secondItem,
          categories,
          productCatalogEntries,
        ),
    );
    const hasPendingItems = sectionItems.some((item) => !item.purchased);
    const hasPurchasedItems = sectionItems.some((item) => item.purchased);
    const shouldShowPurchasedDivider = hasPendingItems && hasPurchasedItems;
    let hasRenderedUndoItem = false;
    let hasRenderedHiddenPurchasedUndoItem = false;
    const listItems = visibleItems.flatMap((item, index) => {
      const itemCategoryId = getShoppingItemCategoryId(
        item,
        productCatalogEntries,
      );
      const previousItem = visibleItems[index - 1];
      const shouldRenderCategoryDivider =
        !previousItem ||
        previousItem.purchased !== item.purchased ||
        getShoppingItemCategoryId(previousItem, productCatalogEntries) !==
          itemCategoryId;
      const shouldRenderPurchasedDivider =
        shouldShowPurchasedDivider &&
        item.purchased &&
        !visibleItems[index - 1]?.purchased;
      const itemPriceSummary = item.canonicalProductId
        ? productPriceCardSummaries.get(item.canonicalProductId)
        : null;
      const itemTicketPriceSummary = itemPriceSummary?.ticketSummary ?? null;
      const itemBestExternalPrice =
        itemPriceSummary?.bestExternalObservation ?? null;
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
          {itemTicketPriceSummary || itemBestExternalPrice ? (
            <span
              className={styles.itemPriceSummary}
              aria-label={[
                itemTicketPriceSummary
                  ? `Último precio real ${formatPriceSummaryValue(
                      itemTicketPriceSummary.latestPrice,
                      itemTicketPriceSummary.comparisonUnit,
                    )}, media real ${formatPriceSummaryValue(
                      itemTicketPriceSummary.averagePrice,
                      itemTicketPriceSummary.comparisonUnit,
                    )}`
                  : null,
                itemBestExternalPrice
                  ? `Mejor precio externo ${formatPriceSummaryValue(
                      itemBestExternalPrice.observedPrice,
                      itemBestExternalPrice.comparisonUnit,
                    )}`
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
              title={
                itemTicketPriceSummary
                  ? `${itemTicketPriceSummary.observationCount} ${
                      itemTicketPriceSummary.observationCount === 1
                        ? "observación real"
                        : "observaciones reales"
                    }`
                  : "Solo precio externo"
              }
            >
              {itemTicketPriceSummary ? (
                <>
                  <span>
                    Últ.{" "}
                    {formatPriceSummaryValue(
                      itemTicketPriceSummary.latestPrice,
                      itemTicketPriceSummary.comparisonUnit,
                    )}
                  </span>
                  <span>
                    Media{" "}
                    {formatPriceSummaryValue(
                      itemTicketPriceSummary.averagePrice,
                      itemTicketPriceSummary.comparisonUnit,
                    )}
                  </span>
                </>
              ) : null}
              {itemBestExternalPrice ? (
                <span className={styles.itemExternalPrice}>
                  Ext.{" "}
                  {formatPriceSummaryValue(
                    itemBestExternalPrice.observedPrice,
                    itemBestExternalPrice.comparisonUnit,
                  )}
                </span>
              ) : null}
              <button
                className={styles.itemPriceDetailButton}
                type="button"
                aria-label={`Ver precios de ${item.name}`}
                title="Ver precios"
                onPointerDown={handleButtonPointerDown}
                onClick={(event) => {
                  event.stopPropagation();
                  openPriceDetailSheet(item);
                }}
              >
                <Icon name="history" />
              </button>
            </span>
          ) : null}
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
          {getShoppingCategoryName(itemCategoryId, categories)}
        </li>
      ) : null;
      const shouldRenderUndoItem =
        !hasRenderedUndoItem &&
        sortedRemovedItems.length > 0 &&
        compareShoppingItemsForVisibleOrder(
          sortedRemovedItems[0],
          item,
          categories,
          productCatalogEntries,
        ) < 0;
      const shouldRenderHiddenPurchasedUndoItem =
        !hasRenderedHiddenPurchasedUndoItem &&
        hiddenPurchasedItem &&
        compareShoppingItemsForVisibleOrder(
          hiddenPurchasedItem,
          item,
          categories,
          productCatalogEntries,
        ) < 0;

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

  function renderRecategorizationChanges() {
    if (displayedRecategorizationChanges.length === 0) {
      return (
        <div className={styles.historyEmpty}>
          <p className={styles.emptyTitle}>
            {showUnseenHistoryOnly
              ? "No hay recategorizaciones pendientes"
              : "No hay recategorizaciones"}
          </p>
          <p className={styles.emptyDescription}>
            {showUnseenHistoryOnly
              ? "Las recategorizaciones ya están revisadas."
              : "Los cambios automáticos de categoría aparecerán aquí."}
          </p>
        </div>
      );
    }

    return (
      <ol className={styles.historyList}>
        {displayedRecategorizationChanges.map((change) => {
          const run = recategorizationRunsById.get(change.runId);
          const runSummary = getRecategorizationRunSummary(run);

          return (
            <li className={styles.historyItem} key={change.id}>
              <div className={styles.historyItemHeader}>
                <span className={styles.historyAction}>
                  Categoría actualizada
                </span>
                <time dateTime={new Date(change.createdAt).toISOString()}>
                  {formatHistoryEventDate(change.createdAt)}
                </time>
              </div>
              <p className={styles.historyProduct}>{change.itemName}</p>
              <p className={styles.historyMeta}>
                {getRecategorizationChangeMeta(change, categories)}
              </p>
              {change.reason ? (
                <p className={styles.historyMeta}>{change.reason}</p>
              ) : null}
              {runSummary ? (
                <p className={styles.historyMeta}>{runSummary}</p>
              ) : null}
              {change.catalogEntryId ? (
                <p className={styles.historyMeta}>
                  Catálogo: {change.catalogEntryId}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  function renderProductNormalizationChanges() {
    if (displayedProductNormalizationChanges.length === 0) {
      return (
        <div className={styles.historyEmpty}>
          <p className={styles.emptyTitle}>
            {showUnseenHistoryOnly
              ? "No hay normalizaciones pendientes"
              : "No hay normalizaciones"}
          </p>
          <p className={styles.emptyDescription}>
            {showUnseenHistoryOnly
              ? "Las normalizaciones ya están revisadas."
              : "Las fusiones, renombres y aliases de Codex aparecerán aquí."}
          </p>
        </div>
      );
    }

    return (
      <ol className={styles.historyList}>
        {displayedProductNormalizationChanges.map((change) => {
          const run = productNormalizationRunsById.get(change.runId);
          const runSummary = getProductNormalizationRunSummary(run);
          const changeMeta = getProductNormalizationChangeMeta(change);

          return (
            <li className={styles.historyItem} key={change.id}>
              <div className={styles.historyItemHeader}>
                <span className={styles.historyAction}>
                  {getProductNormalizationActionText(change)}
                </span>
                <time dateTime={new Date(change.createdAt).toISOString()}>
                  {formatHistoryEventDate(change.createdAt)}
                </time>
              </div>
              <p className={styles.historyProduct}>
                {getProductNormalizationProductText(change)}
              </p>
              {changeMeta ? (
                <p className={styles.historyMeta}>{changeMeta}</p>
              ) : null}
              {change.reason ? (
                <p className={styles.historyMeta}>{change.reason}</p>
              ) : null}
              {runSummary ? (
                <p className={styles.historyMeta}>{runSummary}</p>
              ) : null}
            </li>
          );
        })}
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

  function renderDeveloperPushNotificationCard() {
    const isSupabaseAvailable = isSupabaseConfigured();
    const isSubscribed = pushNotificationSnapshot.status === "subscribed";
    const isActionDisabled =
      isPushNotificationActionPending ||
      isPushNotificationActionDisabled(
        pushNotificationSnapshot,
        isSupabaseAvailable,
      );

    return (
      <section
        className={styles.developerPanel}
        aria-label="Notificaciones push"
      >
        <div className={styles.developerPanelHeader}>
          <h3>Notificaciones push</h3>
          <span
            className={
              isSubscribed
                ? styles.developerStatusSuccess
                : styles.developerStatusFailed
            }
          >
            {pushNotificationSnapshot.message}
          </span>
        </div>
        <dl className={styles.developerMetrics}>
          <div>
            <dt>Permiso</dt>
            <dd>{pushNotificationSnapshot.message}</dd>
          </div>
          <div>
            <dt>Supabase</dt>
            <dd>{isSupabaseAvailable ? "Configurado" : "No configurado"}</dd>
          </div>
        </dl>
        {pushNotificationDiagnostic ? (
          <div
            className={
              pushNotificationDiagnostic.ok
                ? styles.developerDiagnosticSuccess
                : styles.developerDiagnosticFailed
            }
            role="status"
          >
            <p>{pushNotificationDiagnostic.message}</p>
            <ul>
              {pushNotificationDiagnostic.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={styles.developerActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={handlePushNotificationDiagnostic}
            disabled={!isSupabaseAvailable || isPushDiagnosticPending}
          >
            Probar registro
          </button>
          <button
            className={
              isSubscribed ? styles.secondaryButton : styles.primaryButton
            }
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={handlePushNotificationAction}
            disabled={isActionDisabled}
          >
            {getPushNotificationActionText(
              pushNotificationSnapshot,
              isSupabaseAvailable,
            )}
          </button>
        </div>
      </section>
    );
  }

  function renderPushNotificationInvite() {
    if (!isPushInviteVisible) {
      return null;
    }

    return (
      <section className={styles.pushInvite} aria-label="Avisos de cambios">
        <span className={styles.pushInviteIcon} aria-hidden="true">
          <Icon name="bell" />
        </span>
        <div className={styles.pushInviteText}>
          <h2>Avisos de cambios</h2>
          <p>
            Recibe una notificación cuando otro dispositivo cambie la lista.
          </p>
        </div>
        <div className={styles.pushInviteActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={handleDismissPushNotificationInvite}
            disabled={isPushNotificationActionPending}
          >
            Ahora no
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={handlePushNotificationAction}
            disabled={isPushNotificationActionPending}
          >
            {pushNotificationSnapshot.status === "error"
              ? "Reintentar"
              : "Activar"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <main
      onPointerDown={handlePullRefreshPointerDown}
      onPointerMove={handlePullRefreshPointerMove}
      onPointerUp={handlePullRefreshPointerUp}
      onPointerCancel={finishPullRefreshGesture}
      className={
        activeView === "shopping"
          ? `${styles.app} ${styles.appShopping} ${
              isPushInviteVisible ? styles.appPushInviteVisible : ""
            }`
          : styles.app
      }
    >
      {pullRefreshDistance > 0 || isPullRefreshing || pullRefreshMessage ? (
        <div
          className={styles.pullRefreshIndicator}
          style={{
            transform: `translate(-50%, ${isPullRefreshing ? 0 : pullRefreshDistance - 3}px)`,
          }}
          role="status"
          aria-live="polite"
          aria-busy={isPullRefreshing}
        >
          <Icon name="sync" />
          <span>
            {pullRefreshMessage ??
              (pullRefreshDistance >= 30
                ? "Suelta para actualizar"
                : "Desliza para actualizar")}
          </span>
        </div>
      ) : null}
      {isSplashVisible ? (
        <div
          ref={splashScreenRef}
          className={styles.splashScreen}
          aria-live="polite"
        >
          <span className={styles.splashLogo} aria-hidden="true">
            <HeaderLogo />
          </span>
          <p className={styles.splashKicker}>Lista de la compra</p>
          <p className={styles.splashTitle}>Jucart</p>
          <p className={styles.splashStatus} role="status">
            {getLoadingStatusText()}
          </p>
        </div>
      ) : null}
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
            ref={syncStatusRef}
            className={`${styles.syncStatus} ${styles[`syncStatus${syncStatus}`]}`}
            aria-live="polite"
          >
            {syncStatus === "syncing" ? (
              <span className={styles.syncStatusIndicator} aria-hidden="true" />
            ) : null}
            {getSyncStatusText(syncStatus)}
          </p>
          <button
            className={styles.syncRefreshButton}
            type="button"
            aria-label="Actualizar datos"
            title="Actualizar datos"
            onClick={() => void refreshCurrentView()}
            disabled={!isLoaded || isPullRefreshing}
          >
            <Icon name="sync" />
          </button>
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
          ref={commandPanelRef}
          className={styles.commandPanel}
          aria-label="Controles de lista"
        >
          <div className={styles.form}>
            <label className={styles.searchField}>
              <span className={styles.visuallyHidden}>Buscar productos</span>
              <span className={styles.searchIcon} aria-hidden="true">
                <Icon name="search" />
              </span>
              <input
                value={shoppingSearchQuery}
                onChange={(event) => setShoppingSearchQuery(event.target.value)}
                type="search"
                placeholder="Buscar productos"
                disabled={!isLoaded}
              />
              {shoppingSearchQuery ? (
                <button
                  className={styles.searchClearButton}
                  type="button"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                  onPointerDown={handleButtonPointerDown}
                  onClick={() => setShoppingSearchQuery("")}
                >
                  <Icon name="close" />
                </button>
              ) : null}
            </label>
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

      {activeView === "shopping" ? renderPushNotificationInvite() : null}

      {!isLoaded && !isSplashVisible ? (
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

      {activeView === "tickets" && !isTicketUploadSheetOpen ? (
        <button
          ref={ticketUploadFabRef}
          className={styles.floatingAddButton}
          type="button"
          aria-label="Subir ticket"
          title="Subir ticket"
          onPointerDown={handleButtonPointerDown}
          onClick={openTicketUploadSheet}
          disabled={!isLoaded}
        >
          <Icon name="upload" />
        </button>
      ) : null}

      {activeView === "freezer" &&
      !isFreezerAddSheetOpen &&
      !editingFreezerItem ? (
        <button
          ref={freezerAddFabRef}
          className={styles.floatingAddButton}
          type="button"
          aria-label="Añadir producto congelado"
          title="Añadir producto congelado"
          onPointerDown={handleButtonPointerDown}
          onClick={openFreezerAddSheet}
          disabled={!isLoaded}
        >
          <Icon name="plus" />
        </button>
      ) : null}

      {activeView === "sections" && !isSectionAddSheetOpen ? (
        <button
          ref={sectionAddFabRef}
          className={styles.floatingAddButton}
          type="button"
          aria-label="Crear lista"
          title="Crear lista"
          onPointerDown={handleButtonPointerDown}
          onClick={openSectionAddSheet}
          disabled={!isLoaded}
        >
          <Icon name="plus" />
        </button>
      ) : null}

      {activeView === "shopping" && isAddSheetOpen ? (
        <div
          ref={addSheetBackdropRef}
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closeAddSheet()}
        >
          <form
            ref={addSheetRef}
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
                    onFocus={selectTextOnFocus}
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
                  title={getShoppingCategoryName(
                    suggestion.categoryId,
                    categories,
                  )}
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

      {activeView === "shopping" && selectedPriceProductId ? (
        <div
          ref={priceDetailSheetBackdropRef}
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closePriceDetailSheet()}
        >
          <section
            ref={priceDetailSheetRef}
            className={`${styles.addSheet} ${styles.priceDetailSheet}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby="price-detail-title"
            tabIndex={-1}
            style={
              {
                "--sheet-drag-offset": `${sheetDragOffset}px`,
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closePriceDetailSheet();
              }
            }}
          >
            <div
              className={styles.addSheetHandle}
              aria-label="Cerrar detalle de precios"
              role="button"
              tabIndex={0}
              onPointerDown={handleAddSheetDragStart}
              onPointerMove={handleAddSheetDragMove}
              onPointerUp={handleAddSheetDragEnd}
              onPointerCancel={handleAddSheetDragEnd}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  closePriceDetailSheet();
                }
              }}
            >
              <span />
            </div>
            <header className={styles.priceDetailHeader}>
              <div>
                <h2 id="price-detail-title">{selectedPriceProductName}</h2>
                <p>Histórico de precios</p>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Cerrar precios"
                title="Cerrar"
                onPointerDown={handleButtonPointerDown}
                onClick={() => closePriceDetailSheet()}
              >
                <Icon name="close" />
              </button>
            </header>
            {selectedPriceSummary ? (
              <dl className={styles.priceDetailMetrics}>
                <div>
                  <dt>Último</dt>
                  <dd>
                    {formatPriceSummaryValue(
                      selectedPriceSummary.latestPrice,
                      selectedPriceSummary.comparisonUnit,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Media</dt>
                  <dd>
                    {formatPriceSummaryValue(
                      selectedPriceSummary.averagePrice,
                      selectedPriceSummary.comparisonUnit,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Observaciones</dt>
                  <dd>{selectedPriceSummary.observationCount}</dd>
                </div>
              </dl>
            ) : null}
            <div className={styles.priceDetailContent}>
              {selectedLatestPriceObservation ? (
                <section
                  className={styles.priceDetailPanel}
                  aria-labelledby="price-latest-title"
                >
                  <h3 id="price-latest-title">Último precio</h3>
                  <div className={styles.priceLatestGrid}>
                    <strong>
                      {formatPriceSummaryValue(
                        selectedLatestPriceObservation.observedPrice,
                        selectedLatestPriceObservation.comparisonUnit,
                      )}
                    </strong>
                    <span>
                      {sections.find(
                        (section) =>
                          section.id ===
                          selectedLatestPriceObservation.sectionId,
                      )?.name ?? selectedLatestPriceObservation.sectionId}
                    </span>
                    <span>
                      {formatTicketDate(
                        selectedLatestPriceObservation.observedAt,
                      )}
                    </span>
                    <span className={selectedPriceDifferenceClassName}>
                      {selectedPriceDifference === null
                        ? "Sin anterior"
                        : formatPriceDifference(
                            selectedPriceDifference,
                            selectedLatestPriceObservation.comparisonUnit,
                          )}
                    </span>
                  </div>
                </section>
              ) : null}
              {selectedPriceSectionSummaries.length > 0 ? (
                <section
                  className={styles.priceDetailPanel}
                  aria-labelledby="price-sections-title"
                >
                  <h3 id="price-sections-title">Por lista</h3>
                  <ol className={styles.priceSectionList}>
                    {selectedPriceSectionSummaries.map((summary) => (
                      <li key={summary.sectionId}>
                        <span>
                          {sections.find(
                            (section) => section.id === summary.sectionId,
                          )?.name ?? summary.sectionId}
                        </span>
                        <strong>
                          {formatPriceSummaryValue(
                            summary.latestPrice,
                            summary.comparisonUnit,
                          )}
                        </strong>
                        <small>
                          Media{" "}
                          {formatPriceSummaryValue(
                            summary.averagePrice,
                            summary.comparisonUnit,
                          )}{" "}
                          · {summary.observationCount}
                        </small>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}
              {selectedPriceObservations.length > 0 ? (
                <section
                  className={styles.priceDetailPanel}
                  aria-labelledby="price-observations-title"
                >
                  <h3 id="price-observations-title">Observaciones</h3>
                  <ol className={styles.priceObservationList}>
                    {visibleSelectedPriceObservations.map((observation) => (
                      <li key={observation.id}>
                        <span>
                          {formatTicketDate(observation.observedAt)} ·{" "}
                          {sections.find(
                            (section) => section.id === observation.sectionId,
                          )?.name ?? observation.sectionId}
                          {observation.source === "external"
                            ? ` · Externo${
                                observation.externalProvider
                                  ? `: ${observation.externalProvider}`
                                  : ""
                              }`
                            : ""}
                        </span>
                        <strong>
                          {formatPriceSummaryValue(
                            observation.observedPrice,
                            observation.comparisonUnit,
                          )}
                        </strong>
                        {observation.quantity ? (
                          <small>{observation.quantity}</small>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  {hiddenSelectedPriceObservationCount > 0 ? (
                    <button
                      className={styles.paginationButton}
                      type="button"
                      onPointerDown={handleButtonPointerDown}
                      onClick={showMorePriceObservations}
                    >
                      Ver{" "}
                      {Math.min(
                        hiddenSelectedPriceObservationCount,
                        priceObservationPageSize,
                      )}{" "}
                      observaciones más
                    </button>
                  ) : null}
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {activeView === "tickets" && isTicketUploadSheetOpen ? (
        <div
          ref={ticketUploadSheetBackdropRef}
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closeTicketUploadSheet()}
        >
          <form
            ref={ticketUploadSheetRef}
            className={`${styles.addSheet} ${styles.ticketUploadSheet}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby="ticket-upload-title"
            style={
              {
                "--sheet-drag-offset": `${sheetDragOffset}px`,
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleTicketUploadSubmit}
          >
            <div
              className={styles.addSheetHandle}
              onPointerDown={handleAddSheetDragStart}
              onPointerMove={handleAddSheetDragMove}
              onPointerUp={handleAddSheetDragEnd}
              onPointerCancel={handleAddSheetDragEnd}
            >
              <span aria-hidden="true" />
            </div>
            <div className={styles.addSheetHeader}>
              <div>
                <p className={styles.sheetKicker}>Ticket de compra</p>
                <h2 id="ticket-upload-title">Subir ticket</h2>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                aria-label="Cerrar subida de ticket"
                onPointerDown={handleButtonPointerDown}
                onClick={() => closeTicketUploadSheet()}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className={styles.ticketUploadFields}>
              <label className={styles.label} htmlFor="ticket-section-id">
                Supermercado
              </label>
              <select
                id="ticket-section-id"
                value={ticketUploadSectionId}
                onChange={(event) =>
                  setTicketUploadSectionId(event.target.value)
                }
                disabled={isTicketUploadPending}
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              <label className={styles.label} htmlFor="ticket-files">
                Archivos
              </label>
              <input
                id="ticket-files"
                ref={ticketFileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleTicketFilesChange}
                disabled={isTicketUploadPending}
              />
              {ticketUploadFiles.length > 0 ? (
                <ul className={styles.ticketFileList}>
                  {ticketUploadFiles.map((file, index) => (
                    <li key={`${file.name}-${file.size}-${index}`}>
                      <Icon name="file" />
                      <span>{file.name}</span>
                      <small>{formatFileSize(file.size)}</small>
                    </li>
                  ))}
                </ul>
              ) : null}
              {ticketError ? (
                <p className={styles.error} role="alert">
                  {ticketError}
                </p>
              ) : null}
            </div>
            <div className={styles.addSheetActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={() => closeTicketUploadSheet()}
                disabled={isTicketUploadPending}
              >
                Cancelar
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                onPointerDown={handleButtonPointerDown}
                disabled={
                  isTicketUploadPending || ticketUploadFiles.length === 0
                }
              >
                <Icon name="upload" />
                {isTicketUploadPending ? "Subiendo" : "Subir"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activeView === "freezer" && isFreezerAddSheetOpen ? (
        <div
          ref={freezerAddSheetBackdropRef}
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closeFreezerAddSheet()}
        >
          <form
            ref={freezerAddSheetRef}
            className={`${styles.addSheet} ${styles.addSheetCompact}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby="freezer-add-sheet-title"
            style={
              {
                "--sheet-drag-offset": `${sheetDragOffset}px`,
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleAddSheetKeyDown}
            onSubmit={handleFreezerSubmit}
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
                  closeFreezerAddSheet();
                }
              }}
            >
              <span />
            </div>
            <h2 id="freezer-add-sheet-title" className={styles.visuallyHidden}>
              Añadir producto congelado
            </h2>
            <div className={styles.addSheetFields}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="freezer-item-name">
                  Producto
                </label>
                <input
                  id="freezer-item-name"
                  ref={freezerItemNameInputRef}
                  className={styles.addSheetInput}
                  autoComplete="off"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  value={freezerItemName}
                  onChange={(event) => setFreezerItemName(event.target.value)}
                  placeholder="Lentejas, caldo, croquetas..."
                  type="text"
                  disabled={!isLoaded}
                />
              </div>
              <div className={styles.addSheetSelectors}>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor="freezer-quantity">
                    Cantidad
                  </label>
                  <input
                    id="freezer-quantity"
                    className={styles.select}
                    autoComplete="off"
                    value={freezerItemQuantity}
                    onChange={(event) =>
                      setFreezerItemQuantity(event.target.value)
                    }
                    onFocus={selectTextOnFocus}
                    placeholder="2 raciones"
                    type="text"
                    disabled={!isLoaded}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor="freezer-drawer-id">
                    Cajón
                  </label>
                  <select
                    id="freezer-drawer-id"
                    className={styles.select}
                    value={selectedFreezerDrawerId}
                    onChange={(event) => {
                      const drawerId = event.target.value;

                      if (isFreezerDrawerId(drawerId)) {
                        setSelectedFreezerDrawerId(drawerId);
                      }
                    }}
                    disabled={!isLoaded}
                  >
                    {freezerDrawers.map((drawer) => (
                      <option key={drawer.id} value={drawer.id}>
                        {drawer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="freezer-frozen-at">
                  Congelado
                </label>
                <input
                  id="freezer-frozen-at"
                  className={styles.select}
                  value={freezerItemFrozenAt}
                  onChange={(event) =>
                    setFreezerItemFrozenAt(event.target.value)
                  }
                  type="date"
                  disabled={!isLoaded}
                />
              </div>
            </div>
            <div className={styles.addSheetFooter}>
              <p className={styles.addSheetNotice} aria-live="polite" />
              <button
                className={styles.secondaryButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={() => closeFreezerAddSheet()}
              >
                Cerrar
              </button>
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

      {activeView === "sections" && isSectionAddSheetOpen ? (
        <div
          ref={sectionAddSheetBackdropRef}
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closeSectionAddSheet()}
        >
          <form
            ref={sectionAddSheetRef}
            className={`${styles.addSheet} ${styles.addSheetCompact}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby="section-add-sheet-title"
            style={
              {
                "--sheet-drag-offset": `${sheetDragOffset}px`,
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleAddSheetKeyDown}
            onSubmit={handleSectionSubmit}
          >
            <div
              className={styles.addSheetHandle}
              aria-label="Cerrar panel de lista"
              role="button"
              tabIndex={0}
              onPointerDown={handleAddSheetDragStart}
              onPointerMove={handleAddSheetDragMove}
              onPointerUp={handleAddSheetDragEnd}
              onPointerCancel={handleAddSheetDragEnd}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  closeSectionAddSheet();
                }
              }}
            >
              <span />
            </div>
            <h2 id="section-add-sheet-title" className={styles.visuallyHidden}>
              Crear lista
            </h2>
            <div className={styles.addSheetFields}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="section-name">
                  Nueva lista
                </label>
                <input
                  id="section-name"
                  ref={sectionNameInputRef}
                  className={styles.addSheetInput}
                  autoComplete="off"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  enterKeyHint="done"
                  value={sectionName}
                  onChange={(event) => setSectionName(event.target.value)}
                  placeholder="Carrefour, frutería..."
                  type="text"
                  disabled={!isLoaded}
                />
              </div>
            </div>
            <div className={styles.addSheetFooter}>
              <p className={styles.addSheetNotice} aria-live="polite" />
              <button
                className={styles.secondaryButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={() => closeSectionAddSheet()}
              >
                Cerrar
              </button>
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

      {unseenRecategorizationChanges.length > 0 && activeView !== "history" ? (
        <section className={styles.remoteChangesBanner} role="status">
          <span>
            {unseenRecategorizationChanges.length === 1
              ? "Hay 1 recategorización nueva."
              : `Hay ${unseenRecategorizationChanges.length} recategorizaciones nuevas.`}
          </span>
          <button
            className={styles.undoButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={showUnseenRecategorizationView}
          >
            Ver categorías
          </button>
        </section>
      ) : null}

      {unseenProductNormalizationChanges.length > 0 &&
      activeView !== "history" ? (
        <section className={styles.remoteChangesBanner} role="status">
          <span>
            {unseenProductNormalizationChanges.length === 1
              ? "Hay 1 normalización nueva."
              : `Hay ${unseenProductNormalizationChanges.length} normalizaciones nuevas.`}
          </span>
          <button
            className={styles.undoButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={showUnseenProductNormalizationView}
          >
            Ver normalización
          </button>
        </section>
      ) : null}

      {activeView === "shopping" ? (
        <>
          <section
            id="shopping-board"
            ref={(boardElement) => {
              shoppingBoardElementRef.current = boardElement;
              boardRef(boardElement);
            }}
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
                  ref={(indicator) => {
                    if (indicator) {
                      sectionIndicatorRefs.current[section.id] = indicator;
                    } else {
                      delete sectionIndicatorRefs.current[section.id];
                    }
                  }}
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
              <span
                ref={activeSectionIndicatorRef}
                className={styles.sectionIndicatorThumb}
                aria-hidden="true"
              />
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

      {activeView === "freezer" ? (
        <section
          ref={freezerScreenRef}
          className={styles.freezerScreen}
          aria-labelledby="freezer-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="freezer-title">Congelador</h2>
            <span className={styles.count}>{freezerItems.length}</span>
          </div>
          {renderFreezerUseUndoItem()}
          <section
            className={styles.freezerPanel}
            aria-labelledby="freezer-use-first-title"
          >
            <div className={styles.freezerPanelHeader}>
              <h3 id="freezer-use-first-title">Usar primero</h3>
              <span>{useFirstFreezerItems.length}</span>
            </div>
            {renderFreezerItemList(useFirstFreezerItems)}
          </section>
          <div className={styles.freezerDrawers}>
            {freezerDrawers.map((drawer) => {
              const drawerItems = getFreezerItemsByDrawer(
                freezerItems,
                drawer.id,
              );

              return (
                <section
                  className={styles.freezerPanel}
                  aria-labelledby={`freezer-drawer-${drawer.id}-title`}
                  key={drawer.id}
                >
                  <div className={styles.freezerPanelHeader}>
                    <h3 id={`freezer-drawer-${drawer.id}-title`}>
                      {drawer.name}
                    </h3>
                    <span>{drawerItems.length}</span>
                  </div>
                  {renderFreezerItemList(drawerItems)}
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeView === "tickets" ? (
        <section
          ref={ticketsScreenRef}
          className={styles.ticketsScreen}
          aria-labelledby="tickets-title"
        >
          <div className={styles.screenTitle}>
            <h2 id="tickets-title">Tickets</h2>
            <span className={styles.count}>{tickets.length}</span>
          </div>
          {ticketUploadNotice ? (
            <p className={styles.ticketNotice} role="status">
              {ticketUploadNotice}
            </p>
          ) : null}
          {ticketError ? (
            <p className={styles.error} role="alert">
              {ticketError}
            </p>
          ) : null}
          {ticketReviewEntries.length > 0 ? (
            <section
              className={styles.ticketReviewQueue}
              aria-labelledby="ticket-review-queue-title"
            >
              <div className={styles.ticketReviewQueueHeader}>
                <h3 id="ticket-review-queue-title">Cola de revisión</h3>
                <span>{ticketReviewEntries.length}</span>
              </div>
              <ol className={styles.ticketReviewList}>
                {ticketReviewEntries.map(({ ticket, line }) => {
                  const sectionName =
                    sections.find((section) => section.id === ticket.sectionId)
                      ?.name ?? ticket.sectionId;
                  const linePriceText = getTicketLinePriceText(line);

                  return (
                    <li key={line.id}>
                      <div>
                        <strong>{getTicketLineName(line)}</strong>
                        <span>
                          {sectionName} · {formatTicketDate(ticket.uploadedAt)}
                        </span>
                        {linePriceText ? <small>{linePriceText}</small> : null}
                        <small>
                          {line.reviewReason ?? "Necesita revisión"}
                        </small>
                      </div>
                      <div className={styles.ticketReviewActions}>
                        <label
                          className={styles.visuallyHidden}
                          htmlFor={`ticket-line-product-${line.id}`}
                        >
                          Producto canónico
                        </label>
                        <select
                          id={`ticket-line-product-${line.id}`}
                          className={styles.select}
                          value={ticketReviewProductIds[line.id] ?? ""}
                          onChange={(event) =>
                            handleTicketReviewProductChange(
                              line.id,
                              event.target.value,
                            )
                          }
                          disabled={
                            pendingTicketReviewLineId === line.id ||
                            canonicalProducts.length === 0
                          }
                        >
                          <option value="">Producto</option>
                          {canonicalProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        <div className={styles.ticketReviewActionButtons}>
                          <button
                            className={styles.iconButton}
                            type="button"
                            aria-label="Ver"
                            title="Ver ticket"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() => {
                              setTicketFilter("all");
                              setSelectedTicketId(ticket.id);
                            }}
                          >
                            <Icon name="file" />
                          </button>
                          <button
                            className={styles.iconButton}
                            type="button"
                            aria-label="Asociar"
                            title="Asociar producto"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() =>
                              void handleResolveTicketLine(ticket, line, false)
                            }
                            disabled={
                              pendingTicketReviewLineId === line.id ||
                              !ticketReviewProductIds[line.id]
                            }
                          >
                            <Icon name="check" />
                          </button>
                          <button
                            className={styles.iconButton}
                            type="button"
                            aria-label="Alias"
                            title="Crear alias"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() =>
                              void handleResolveTicketLine(ticket, line, true)
                            }
                            disabled={
                              pendingTicketReviewLineId === line.id ||
                              !ticketReviewProductIds[line.id] ||
                              !(line.productName ?? line.rawText)?.trim()
                            }
                          >
                            <Icon name="plus" />
                          </button>
                          <button
                            className={styles.iconButtonDanger}
                            type="button"
                            aria-label="Excluir"
                            title="Excluir línea"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() =>
                              void handleExcludeTicketLine(ticket, line)
                            }
                            disabled={pendingTicketReviewLineId === line.id}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
          <div className={styles.ticketFilters} role="tablist">
            {(
              [
                "all",
                "pending",
                "processed",
                "failed",
                "needs_review",
              ] as TicketFilter[]
            ).map((filter) => (
              <button
                key={filter}
                className={
                  ticketFilter === filter
                    ? styles.ticketFilterButtonActive
                    : styles.ticketFilterButton
                }
                type="button"
                role="tab"
                aria-selected={ticketFilter === filter}
                aria-label={getTicketFilterText(filter)}
                title={getTicketFilterText(filter)}
                onPointerDown={handleButtonPointerDown}
                onClick={() => handleTicketFilterChange(filter)}
              >
                <Icon name={getTicketFilterIcon(filter)} />
                <span>{getTicketFilterShortText(filter)}</span>
              </button>
            ))}
          </div>
          {isTicketsLoading && tickets.length === 0 ? (
            <p className={styles.loadingStatus} role="status">
              Cargando tickets...
            </p>
          ) : filteredTickets.length === 0 ? (
            <div className={styles.historyEmpty}>
              <p>
                {ticketFilter === "all"
                  ? "No hay tickets subidos."
                  : "No hay tickets con este estado."}
              </p>
            </div>
          ) : (
            <>
              <ol className={styles.ticketList}>
                {visibleTickets.map((ticket) => {
                  const sectionName =
                    sections.find((section) => section.id === ticket.sectionId)
                      ?.name ?? ticket.sectionId;
                  const isSelected = selectedTicketId === ticket.id;

                  return (
                    <li className={styles.ticketItem} key={ticket.id}>
                      <button
                        className={styles.ticketItemButton}
                        type="button"
                        onPointerDown={handleButtonPointerDown}
                        onClick={() =>
                          setSelectedTicketId(isSelected ? null : ticket.id)
                        }
                        aria-expanded={isSelected}
                      >
                        <span className={styles.ticketStatus}>
                          {getTicketStatusText(ticket.status)}
                        </span>
                        <strong>{sectionName}</strong>
                        <span>
                          {formatTicketDate(ticket.uploadedAt)} ·{" "}
                          {getShoppingUserName(ticket.uploadedBy)} ·{" "}
                          {ticket.fileCount}{" "}
                          {ticket.fileCount === 1 ? "archivo" : "archivos"}
                        </span>
                      </button>
                      {isSelected ? (
                        <div className={styles.ticketDetail}>
                          {ticket.files.length > 0 ? (
                            <ol
                              className={styles.ticketFileActions}
                              aria-label="Archivos del ticket"
                            >
                              {ticket.files.map((file) => (
                                <li key={file.id}>
                                  <button
                                    className={styles.ticketFileButton}
                                    type="button"
                                    onPointerDown={handleButtonPointerDown}
                                    onClick={() =>
                                      void handleOpenTicketFile(file)
                                    }
                                  >
                                    <Icon name="file" />
                                    <span>{file.fileName}</span>
                                    <small>
                                      {formatFileSize(file.sizeBytes)}
                                    </small>
                                  </button>
                                </li>
                              ))}
                            </ol>
                          ) : null}
                          {ticket.errorMessage ? (
                            <p className={styles.historyMeta}>
                              {ticket.errorMessage}
                            </p>
                          ) : null}
                          {ticket.lines.length > 0 ? (
                            <ol className={styles.ticketLines}>
                              {ticket.lines.map((line) => {
                                const selectedCorrectionProductId =
                                  ticketCorrectionProductIds[line.id] ??
                                  line.canonicalProductId ??
                                  "";
                                const canCorrectLine = !line.needsReview;
                                const canCreateCorrectionAlias =
                                  canCorrectLine &&
                                  Boolean(selectedCorrectionProductId) &&
                                  Boolean(
                                    (line.productName ?? line.rawText)?.trim(),
                                  );

                                return (
                                  <li
                                    key={line.id}
                                    className={
                                      line.needsReview
                                        ? styles.ticketLineNeedsReview
                                        : line.status === "excluded"
                                          ? styles.ticketLineExcluded
                                          : styles.ticketLine
                                    }
                                  >
                                    <strong>{getTicketLineName(line)}</strong>
                                    <span>{getTicketLinePriceText(line)}</span>
                                    {line.needsReview ? (
                                      <small>
                                        {line.reviewReason ??
                                          "Necesita revisión"}
                                      </small>
                                    ) : null}
                                    {line.status === "excluded" ? (
                                      <small>Excluida</small>
                                    ) : null}
                                    {canCorrectLine ? (
                                      <div
                                        className={styles.ticketLineCorrection}
                                      >
                                        <label
                                          className={styles.visuallyHidden}
                                          htmlFor={`ticket-line-correction-${line.id}`}
                                        >
                                          Corregir producto canónico
                                        </label>
                                        <select
                                          id={`ticket-line-correction-${line.id}`}
                                          className={styles.select}
                                          value={selectedCorrectionProductId}
                                          onChange={(event) =>
                                            handleTicketCorrectionProductChange(
                                              line,
                                              event.target.value,
                                            )
                                          }
                                          disabled={
                                            pendingTicketReviewLineId ===
                                              line.id ||
                                            canonicalProducts.length === 0
                                          }
                                        >
                                          <option value="">Producto</option>
                                          {canonicalProducts.map((product) => (
                                            <option
                                              key={product.id}
                                              value={product.id}
                                            >
                                              {product.name}
                                            </option>
                                          ))}
                                        </select>
                                        <div
                                          className={
                                            styles.ticketLineCorrectionButtons
                                          }
                                        >
                                          <button
                                            className={styles.iconButton}
                                            type="button"
                                            aria-label="Corregir asociación"
                                            title="Corregir asociación"
                                            onPointerDown={
                                              handleButtonPointerDown
                                            }
                                            onClick={() =>
                                              void handleCorrectTicketLine(
                                                ticket,
                                                line,
                                                false,
                                              )
                                            }
                                            disabled={
                                              pendingTicketReviewLineId ===
                                                line.id ||
                                              !selectedCorrectionProductId
                                            }
                                          >
                                            <Icon name="check" />
                                          </button>
                                          <button
                                            className={styles.iconButton}
                                            type="button"
                                            aria-label="Corregir alias"
                                            title="Corregir y crear alias"
                                            onPointerDown={
                                              handleButtonPointerDown
                                            }
                                            onClick={() =>
                                              void handleCorrectTicketLine(
                                                ticket,
                                                line,
                                                true,
                                              )
                                            }
                                            disabled={
                                              pendingTicketReviewLineId ===
                                                line.id ||
                                              !canCreateCorrectionAlias
                                            }
                                          >
                                            <Icon name="plus" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p className={styles.historyMeta}>
                              Las líneas aparecerán tras el procesamiento
                              nocturno.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
              {hiddenTicketCount > 0 ? (
                <button
                  className={styles.paginationButton}
                  type="button"
                  onPointerDown={handleButtonPointerDown}
                  onClick={showMoreTickets}
                >
                  Ver {Math.min(hiddenTicketCount, ticketPageSize)} tickets más
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {activeView === "sections" ? (
        <section
          ref={sectionsScreenRef}
          className={styles.sectionsScreen}
          aria-labelledby="sections-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="sections-title">Listas</h2>
            <span className={styles.count}>{sections.length}</span>
          </div>
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
          ref={historyScreenRef}
          className={styles.historyScreen}
          aria-labelledby="history-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="history-title">
              {showUnseenHistoryOnly ? "Cambios nuevos" : "Historial"}
            </h2>
            <span className={styles.count}>{displayedHistoryCount}</span>
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
          {!showUnseenHistoryOnly ? (
            <div className={styles.historyTabs} role="tablist">
              <button
                className={
                  historyTab === "changes"
                    ? styles.historyTabActive
                    : styles.historyTab
                }
                type="button"
                role="tab"
                aria-selected={historyTab === "changes"}
                onPointerDown={handleButtonPointerDown}
                onClick={() => handleHistoryTabClick("changes")}
              >
                Cambios
              </button>
              <button
                className={
                  historyTab === "categories"
                    ? styles.historyTabActive
                    : styles.historyTab
                }
                type="button"
                role="tab"
                aria-selected={historyTab === "categories"}
                onPointerDown={handleButtonPointerDown}
                onClick={() => handleHistoryTabClick("categories")}
              >
                Categorías
              </button>
              <button
                className={
                  historyTab === "normalizations"
                    ? styles.historyTabActive
                    : styles.historyTab
                }
                type="button"
                role="tab"
                aria-selected={historyTab === "normalizations"}
                onPointerDown={handleButtonPointerDown}
                onClick={() => handleHistoryTabClick("normalizations")}
              >
                Normalización
              </button>
            </div>
          ) : null}
          {historyTab === "normalizations"
            ? renderProductNormalizationChanges()
            : historyTab === "categories"
              ? renderRecategorizationChanges()
              : renderHistoryEvents()}
        </section>
      ) : null}

      {activeView === "developer" && selectedUserId === "rafa" ? (
        <section
          ref={developerScreenRef}
          className={styles.developerScreen}
          aria-labelledby="developer-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="developer-title">Dev</h2>
            <span className={styles.count}>Rafa</span>
          </div>
          {renderDeveloperBackupCard()}
          {renderDeveloperPushNotificationCard()}
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
            activeView === "tickets"
              ? styles.bottomNavItemActive
              : styles.bottomNavItem
          }
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={showTicketsView}
          disabled={!isLoaded}
        >
          <Icon name="ticket" />
          <span>Tickets</span>
        </button>
        <button
          className={
            activeView === "freezer"
              ? styles.bottomNavItemActive
              : styles.bottomNavItem
          }
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={showFreezerView}
          disabled={!isLoaded}
        >
          <Icon name="freezer" />
          <span>Congelador</span>
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
            consumeOverlayHistory("clear-dialog");
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
                consumeOverlayHistory("clear-dialog");
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
                  consumeOverlayHistory("clear-dialog");
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
                  onFocus={selectTextOnFocus}
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

      {editingFreezerItem ? (
        <div
          ref={freezerEditSheetBackdropRef}
          className={styles.addSheetBackdrop}
          style={
            {
              "--sheet-keyboard-inset": `${sheetKeyboardInset}px`,
            } as CSSProperties
          }
          onClick={() => closeFreezerEditSheet()}
        >
          <form
            ref={freezerEditSheetRef}
            className={`${styles.addSheet} ${styles.addSheetCompact}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby="edit-freezer-title"
            style={
              {
                "--sheet-drag-offset": `${sheetDragOffset}px`,
              } as CSSProperties
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleAddSheetKeyDown}
            onSubmit={handleFreezerEditSubmit}
          >
            <div
              className={styles.addSheetHandle}
              aria-label="Cerrar panel de edición"
              role="button"
              tabIndex={0}
              onPointerDown={handleAddSheetDragStart}
              onPointerMove={handleAddSheetDragMove}
              onPointerUp={handleAddSheetDragEnd}
              onPointerCancel={handleAddSheetDragEnd}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  closeFreezerEditSheet();
                }
              }}
            >
              <span />
            </div>
            <h2 id="edit-freezer-title" className={styles.visuallyHidden}>
              Editar {editingFreezerItem.name}
            </h2>
            <div className={styles.addSheetFields}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="edit-freezer-name">
                  Producto
                </label>
                <input
                  id="edit-freezer-name"
                  ref={editingFreezerItemNameInputRef}
                  className={styles.addSheetInput}
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  value={editingFreezerItemName}
                  onChange={(event) =>
                    setEditingFreezerItemName(event.target.value)
                  }
                  type="text"
                />
              </div>
              <div className={styles.addSheetSelectors}>
                <div className={styles.formField}>
                  <label
                    className={styles.label}
                    htmlFor="edit-freezer-quantity"
                  >
                    Cantidad
                  </label>
                  <input
                    id="edit-freezer-quantity"
                    className={styles.select}
                    autoComplete="off"
                    value={editingFreezerItemQuantity}
                    onChange={(event) =>
                      setEditingFreezerItemQuantity(event.target.value)
                    }
                    onFocus={selectTextOnFocus}
                    placeholder="2 raciones"
                    type="text"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor="edit-freezer-drawer">
                    Cajón
                  </label>
                  <select
                    id="edit-freezer-drawer"
                    className={styles.select}
                    value={editingFreezerDrawerId}
                    onChange={(event) => {
                      const drawerId = event.target.value;

                      if (isFreezerDrawerId(drawerId)) {
                        setEditingFreezerDrawerId(drawerId);
                      }
                    }}
                  >
                    {freezerDrawers.map((drawer) => (
                      <option key={drawer.id} value={drawer.id}>
                        {drawer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="edit-freezer-date">
                  Congelado
                </label>
                <input
                  id="edit-freezer-date"
                  className={styles.select}
                  value={editingFreezerFrozenAt}
                  onChange={(event) =>
                    setEditingFreezerFrozenAt(event.target.value)
                  }
                  type="date"
                />
              </div>
            </div>
            <div className={styles.addSheetFooter}>
              <p className={styles.addSheetNotice} aria-live="polite" />
              <button
                className={styles.secondaryButton}
                type="button"
                onPointerDown={handleButtonPointerDown}
                onClick={() => closeFreezerEditSheet()}
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
