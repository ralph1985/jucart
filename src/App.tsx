import {
  FormEvent,
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
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
import { MenuPlanningView } from "./MenuPlanningView";
import { getCurrentAppRelease } from "./appVersion";
import {
  getAuthSnapshot,
  signInWithPassword,
  signOut,
  subscribeToAuthState,
} from "./auth";
import type { AuthSnapshot } from "./auth";
import {
  addFreezerItem,
  freezerDrawers,
  FreezerDrawerId,
  FreezerItem,
  getFreezerDrawerName,
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
  synchronizeCachedShoppingData,
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
import {
  createRemoteAction,
  getLatestRemoteAction,
  subscribeToRemoteActions,
} from "./remoteActions";
import type { RemoteAction, RemoteActionName } from "./remoteActions";
import {
  createShoppingList,
  deleteShoppingList,
  getShoppingListMembers,
  getShoppingLists,
  leaveShoppingList,
  moveShoppingList,
  removeShoppingListMember,
  renameShoppingList,
  regenerateShoppingListCode,
  transferShoppingListOwnership,
} from "./shoppingLists";
import type { ShoppingList, ShoppingListMember } from "./shoppingLists";
import {
  pwaUpdateApplyEvent,
  pwaUpdateAvailableEvent,
} from "./pwaUpdateEvents";
import { updateBadge } from "./services/badgeService";
import { AppHeader } from "./components/app/AppHeader";
import type { SyncStatus } from "./components/app/AppHeader";
import { AppBottomNav } from "./components/app/AppBottomNav";
import type { AppView } from "./components/app/AppBottomNav";
import { PwaUpdateBanner } from "./components/app/PwaUpdateBanner";
import { FloatingActionButton } from "./components/app/FloatingActionButton";
import { ShoppingControls } from "./components/shopping/ShoppingControls";
import { ShoppingBoard } from "./components/shopping/ShoppingBoard";
import { EditProductDialog } from "./components/shopping/EditProductDialog";
import { AddProductSheet } from "./components/shopping/AddProductSheet";
import { CreateSectionSheet } from "./components/shopping/CreateSectionSheet";
import { ClearPurchasedDialog } from "./components/shopping/ClearPurchasedDialog";
import { useThemePreference } from "./hooks/useThemePreference";
import { LoginScreen } from "./components/auth/LoginScreen";
import { PushNotificationInvite } from "./components/push/PushNotificationInvite";
import { DeveloperDisclosure } from "./components/developer/DeveloperDisclosure";
import { DeveloperAppContext } from "./components/developer/DeveloperAppContext";
import { FreezerView } from "./components/freezer/FreezerView";
import { FreezerAddSheet } from "./components/freezer/FreezerAddSheet";
import type { HistoryTab } from "./components/history/HistoryTabs";
import { HistoryView } from "./components/history/HistoryView";
import { TicketUploadSheet } from "./components/tickets/TicketUploadSheet";
import { HeaderLogo, Icon } from "./components/ui/Icon";
import type { IconName } from "./components/ui/Icon";

const selectedSectionStorageKey = "jucart:selected-section-id";
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

const remoteActionDefinitions: ReadonlyArray<{
  name: RemoteActionName;
  label: string;
}> = [
  { name: "recategorize_products", label: "Recategorizar productos" },
  { name: "normalize_products", label: "Normalizar productos" },
  { name: "process_tickets", label: "Procesar tickets" },
  { name: "update_external_prices", label: "Actualizar precios externos" },
  { name: "supabase_backup", label: "Ejecutar backup" },
];

function getRemoteActionLabel(action: string | null | undefined) {
  return (
    remoteActionDefinitions.find((definition) => definition.name === action)
      ?.label ?? "Acción del servidor"
  );
}

function orderSectionsByShoppingLists(
  sections: ShoppingSection[],
  lists: ShoppingList[],
) {
  if (lists.length === 0) {
    return sections;
  }

  const orderedSections = lists.flatMap((list) =>
    sections.filter((section) => section.id.startsWith(`${list.id}::`)),
  );
  const orderedSectionIds = new Set(
    orderedSections.map((section) => section.id),
  );
  const nextSections = [
    ...orderedSections,
    ...sections.filter((section) => !orderedSectionIds.has(section.id)),
  ];

  return nextSections.every(
    (section, index) => section.id === sections[index]?.id,
  )
    ? sections
    : nextSections;
}
const backupStaleThresholdMs = 6 * 60 * 60 * 1000;
const initialPushNotificationSnapshot: PushNotificationSnapshot = {
  status: "syncing",
  message: "Comprobando",
};
// Keep the freezer UI covered by unit tests while it remains hidden in builds.
const freezerViewEnabled = import.meta.env.MODE === "test";

type TicketFilter = "all" | ShoppingTicketStatus;

type PullRefreshGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollContainer: HTMLElement | null;
};

type TimestampedItem = {
  id: string;
  updatedAt: number;
};
type HapticFeedback = "light" | "medium" | "success" | "warning";
type DeveloperBackupStatus = "empty" | "success" | "failed" | "stale";
type DeveloperSectionId = "auth" | "backup" | "actions" | "push";
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

function getInitialShowPurchasedItems() {
  try {
    return (
      window.localStorage.getItem(showPurchasedItemsStorageKey) !== "false"
    );
  } catch {
    return true;
  }
}

function getAuthenticatedShoppingUserId(
  user: AuthSnapshot["user"],
): "rafa" | "begona" {
  return user?.email?.trim().toLowerCase() === "bego15val@gmail.com"
    ? "begona"
    : "rafa";
}

function isAdministrator(user: AuthSnapshot["user"]) {
  return user?.email?.trim().toLowerCase() === "rafaelgarcia1985@hotmail.com";
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
    timeZone: "Europe/Madrid",
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
  const appRelease = useState(getCurrentAppRelease)[0];
  const [activeView, setActiveView] = useState<AppView>("shopping");
  const { themePreference, resolvedTheme, cycleThemePreference } =
    useThemePreference();
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
  const [newSectionColor, setNewSectionColor] =
    useState<ShoppingSectionColor>("mint");
  const [sectionActionMessage, setSectionActionMessage] = useState<
    string | null
  >(null);
  const [selectedSectionId, setSelectedSectionId] = useState<ShoppingSectionId>(
    getInitialSelectedSectionId,
  );
  const [showPurchasedItems, setShowPurchasedItems] = useState(
    getInitialShowPurchasedItems,
  );
  const [shoppingSearchQuery, setShoppingSearchQuery] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemNotes, setEditingItemNotes] = useState("");
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
  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>({
    status: isSupabaseConfigured() ? "loading" : "unconfigured",
    user: null,
    error: null,
  });
  const currentShoppingUserId = getAuthenticatedShoppingUserId(
    authSnapshot.user,
  );
  const isCurrentUserAdministrator =
    !isSupabaseConfigured() || isAdministrator(authSnapshot.user);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [shoppingListMessage, setShoppingListMessage] = useState<string | null>(
    null,
  );
  const [isShoppingListActionPending, setIsShoppingListActionPending] =
    useState(false);
  const [expandedShoppingListIds, setExpandedShoppingListIds] = useState<
    string[]
  >([]);
  const [shoppingListMembers, setShoppingListMembers] = useState<
    Record<string, ShoppingListMember[]>
  >({});
  const [isPwaUpdateAvailable, setIsPwaUpdateAvailable] = useState(false);
  const [isPwaUpdateApplying, setIsPwaUpdateApplying] = useState(false);
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
  const [remoteAction, setRemoteAction] = useState<RemoteAction | null>(null);
  const [remoteActionError, setRemoteActionError] = useState<string | null>(
    null,
  );
  const [isRemoteActionPending, setIsRemoteActionPending] = useState(false);
  const [openDeveloperSection, setOpenDeveloperSection] =
    useState<DeveloperSectionId | null>(null);
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
  const [addItemNotes, setAddItemNotes] = useState("");
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
  const pullRefreshRawDistanceRef = useRef(0);
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

    if (authSnapshot.status !== "signed_in") {
      return () => {
        isActive = false;
      };
    }

    void getShoppingLists()
      .then((lists) => {
        if (isActive) {
          setShoppingLists(lists);
          setSections((currentSections) =>
            orderSectionsByShoppingLists(currentSections, lists),
          );
          setShoppingListMessage(null);
        }
      })
      .catch(() => {
        if (isActive) {
          setShoppingListMessage("No se pudieron cargar tus listas.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [authSnapshot.status, authSnapshot.user?.id]);

  useEffect(() => {
    let isActive = true;

    if (!isSupabaseConfigured()) {
      return () => {
        isActive = false;
      };
    }

    function applyAuthSnapshot(snapshot: AuthSnapshot) {
      if (isActive) {
        setAuthSnapshot(snapshot);
        if (!isAdministrator(snapshot.user)) {
          setActiveView((currentView) =>
            currentView === "developer" ? "shopping" : currentView,
          );
        }
      }
    }

    void getAuthSnapshot().then(applyAuthSnapshot);

    const unsubscribe = subscribeToAuthState((snapshot) => {
      applyAuthSnapshot(snapshot);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleUpdateAvailable = () => setIsPwaUpdateAvailable(true);

    window.addEventListener(pwaUpdateAvailableEvent, handleUpdateAvailable);

    return () => {
      window.removeEventListener(
        pwaUpdateAvailableEvent,
        handleUpdateAvailable,
      );
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
        setSections(
          orderSectionsByShoppingLists(nextStoredData.sections, shoppingLists),
        );
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
  }, [beginRemoteRequest, isLoaded, shoppingLists]);

  useEffect(() => {
    if (!isLoaded || !isSupabaseConfigured()) {
      return;
    }

    let isActive = true;

    function synchronizeWhenOnline() {
      const finishRemoteRequest = beginRemoteRequest();
      setSyncStatus("syncing");

      void synchronizeCachedShoppingData()
        .then(() => refreshRemoteDataRef.current?.())
        .catch(() => {
          if (isActive) {
            setStorageError("No se pudo sincronizar la lista recuperada.");
            setSyncStatus("offline");
          }
        })
        .finally(finishRemoteRequest);
    }

    window.addEventListener("online", synchronizeWhenOnline);

    return () => {
      isActive = false;
      window.removeEventListener("online", synchronizeWhenOnline);
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
    if (!isLoaded || currentShoppingUserId !== "rafa") {
      return;
    }

    void refreshDeveloperBackupRun();
    void refreshRemoteAction();
  }, [currentShoppingUserId, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoaded || !isCurrentUserAdministrator || !isSupabaseConfigured()) {
      return;
    }

    return subscribeToRemoteActions(() => {
      void refreshRemoteAction();
    });
  }, [isCurrentUserAdministrator, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (
      !remoteAction ||
      (remoteAction.status !== "pending" && remoteAction.status !== "running")
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshRemoteAction();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [remoteAction?.id, remoteAction?.status]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!isLoaded) {
      return;
    }

    const splashScreen = splashScreenRef.current;
    const hideSplash = () => setIsSplashVisible(false);

    if (!splashScreen || document.visibilityState !== "visible") {
      hideSplash();
      return;
    }

    const fallbackTimeout = window.setTimeout(hideSplash, 1000);
    const completeSplash = () => {
      window.clearTimeout(fallbackTimeout);
      hideSplash();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        completeSplash();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    runAnimationWithCompletion(
      splashScreen,
      {
        opacity: [1, 0],
        scale: [1, 0.985],
        duration: 260,
        ease: "outCubic",
      },
      completeSplash,
    );

    return () => {
      window.clearTimeout(fallbackTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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

  function handleThemePreferenceChange() {
    cycleThemePreference();
    runHapticFeedback("light");
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
        setNewSectionColor("mint");
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

  function addItemFromName(
    rawName: string,
    rawQuantity?: string,
    rawNotes?: string,
  ) {
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
      rawNotes,
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
      setAddItemNotes("");
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
      currentShoppingUserId,
      undefined,
      undefined,
      rawQuantity,
      productCatalogEntries,
      canonicalProductAliases,
      canonicalProducts,
      rawNotes,
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
      setAddItemNotes("");
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
    addItemFromName(itemName, addItemQuantity || "1", addItemNotes);
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
    addItemFromName(itemName, addItemQuantity || "1", addItemNotes);
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
        currentShoppingUserId,
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
          currentShoppingUserId,
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
    setEditingItemNotes(item.notes ?? "");
    setEditingItemQuantity(item.quantity ?? "");
    setEditingSectionId(item.sectionId);
  }

  function resetEditing() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemNotes("");
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
      editingItemNotes,
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

  function startPullRefreshGesture(
    pointerId: number,
    startX: number,
    startY: number,
    target: EventTarget | null,
  ) {
    if (
      !isLoaded ||
      isPullRefreshing ||
      isBottomSheetOpen ||
      isPullRefreshExcludedTarget(target)
    ) {
      return;
    }

    const scrollContainer = getPullRefreshScrollContainer(target);

    if (!scrollContainer || scrollContainer.scrollTop > 0) {
      return;
    }

    pullRefreshGestureRef.current = {
      pointerId,
      startX,
      startY,
      scrollContainer,
    };
  }

  function updatePullRefreshGesture(
    pointerId: number,
    clientX: number,
    clientY: number,
    event: { preventDefault: () => void },
  ) {
    const gesture = pullRefreshGestureRef.current;

    if (!gesture || gesture.pointerId !== pointerId) {
      return;
    }

    if (!gesture.scrollContainer || gesture.scrollContainer.scrollTop > 0) {
      pullRefreshGestureRef.current = null;
      setPullRefreshDistance(0);
      return;
    }

    const distance = Math.max(0, clientY - gesture.startY);
    const horizontalDistance = Math.abs(clientX - gesture.startX);

    if (distance < 12) {
      return;
    }

    if (horizontalDistance > distance) {
      finishPullRefreshGesture();
      return;
    }

    event.preventDefault();
    pullRefreshRawDistanceRef.current = distance;
    setPullRefreshDistance(Math.min(96, distance * 0.48));
  }

  function handlePullRefreshTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    startPullRefreshGesture(
      touch.identifier,
      touch.clientX,
      touch.clientY,
      event.target,
    );
  }

  function handlePullRefreshTouchMove(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    updatePullRefreshGesture(
      touch.identifier,
      touch.clientX,
      touch.clientY,
      event,
    );
  }

  function finishPullRefreshGesture() {
    pullRefreshGestureRef.current = null;
    pullRefreshRawDistanceRef.current = 0;
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

  function finishPullRefresh(pointerId: number) {
    const gesture = pullRefreshGestureRef.current;

    if (!gesture || gesture.pointerId !== pointerId) {
      return;
    }

    const shouldRefresh = pullRefreshRawDistanceRef.current >= 72;
    finishPullRefreshGesture();

    if (shouldRefresh) {
      void refreshCurrentView();
    }
  }

  function handlePullRefreshTouchEnd(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];

    if (touch) {
      finishPullRefresh(touch.identifier);
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
    if (!isCurrentUserAdministrator) {
      return;
    }

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

  async function refreshRemoteAction() {
    if (!isCurrentUserAdministrator) {
      return;
    }

    try {
      const latestAction = await getLatestRemoteAction();
      setRemoteAction(latestAction);
      setRemoteActionError(null);
    } catch {
      setRemoteActionError("No se pudo cargar el estado de la acción remota.");
    }
  }

  async function handleRemoteAction(action: RemoteActionName) {
    const label = getRemoteActionLabel(action);
    if (!window.confirm(`¿Quieres ejecutar «${label}» ahora?`)) {
      return;
    }

    setIsRemoteActionPending(true);
    setRemoteActionError(null);

    try {
      const actionId = await createRemoteAction(
        action,
        `${action}-${createLocalId()}`,
      );
      await refreshRemoteAction();
      setRemoteAction((currentAction) =>
        currentAction?.id === actionId
          ? currentAction
          : {
              id: actionId,
              action,
              status: "pending",
              resultSummary: null,
              errorMessage: null,
              createdAt: Date.now(),
              startedAt: null,
              finishedAt: null,
            },
      );
    } catch {
      setRemoteActionError(`No se pudo solicitar «${label}».`);
    } finally {
      setIsRemoteActionPending(false);
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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthActionPending(true);
    setAuthMessage(null);

    const result = await signInWithPassword(authEmail, authPassword);

    if (result.ok) {
      setAuthMessage(result.message);
    } else {
      setAuthMessage(result.message);
    }

    setIsAuthActionPending(false);
  }

  async function handleSignOut() {
    setIsAuthActionPending(true);
    setAuthMessage(null);
    const result = await signOut();
    setAuthMessage(result.message);
    setIsAuthActionPending(false);
  }

  async function handleRegenerateShoppingListCode(listId: string) {
    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      const list = await regenerateShoppingListCode(listId);
      setShoppingLists((currentLists) =>
        currentLists.map((currentList) =>
          currentList.id === list.id ? list : currentList,
        ),
      );
      setShoppingListMessage(`Nuevo código: ${list.joinCode}`);
    } catch {
      setShoppingListMessage("No se pudo regenerar el código.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  async function handleRenameShoppingList(listId: string, rawName: string) {
    const name = rawName.trim();

    if (!name) {
      setShoppingListMessage("El nombre de la lista no puede estar vacío.");
      return;
    }

    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      await renameShoppingList(listId, name);
      setShoppingLists((currentLists) =>
        currentLists.map((list) =>
          list.id === listId ? { ...list, name } : list,
        ),
      );
    } catch {
      setShoppingListMessage("No se pudo renombrar la lista.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  async function handleMoveShoppingList(listId: string, direction: -1 | 1) {
    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      await moveShoppingList(listId, direction);
      setShoppingLists(await getShoppingLists());
    } catch {
      setShoppingListMessage("No se pudo cambiar el orden de las listas.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  async function handleToggleShoppingListMembers(listId: string) {
    if (expandedShoppingListIds.includes(listId)) {
      setExpandedShoppingListIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== listId),
      );
      return;
    }

    setExpandedShoppingListIds((currentIds) => [...currentIds, listId]);
    setShoppingListMessage(null);

    if (shoppingListMembers[listId]) {
      return;
    }

    setIsShoppingListActionPending(true);

    try {
      const members = await getShoppingListMembers(listId);
      setShoppingListMembers((currentMembers) => ({
        ...currentMembers,
        [listId]: members,
      }));
    } catch {
      setShoppingListMessage("No se pudieron cargar los miembros de la lista.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  function handleOpenShoppingList(sectionId?: ShoppingSectionId) {
    if (sectionId) {
      setSelectedSectionId(sectionId);
    }
    showShoppingView();
  }

  async function handleCreateShoppingList() {
    if (isSupabaseConfigured()) {
      setIsShoppingListActionPending(true);
      setShoppingListMessage(null);

      try {
        await createShoppingList(sectionName, newSectionColor);
        setShoppingLists(await getShoppingLists());
        await refreshRemoteDataRef.current?.();
        closeSectionAddSheet();
      } catch {
        setShoppingListMessage("No se pudo crear la lista.");
      } finally {
        setIsShoppingListActionPending(false);
      }
      return;
    }

    const nextSections = addShoppingSection(sections, sectionName);

    if (nextSections === sections) {
      return;
    }

    const nextSection = nextSections[nextSections.length - 1];
    const coloredSections = updateShoppingSectionColor(
      nextSections,
      nextSection.id,
      newSectionColor,
    );

    runHapticFeedback("success");
    markLocalDataChange();
    setSections(coloredSections);
    setSelectedSectionId(nextSection.id);
    setSectionActionMessage(null);
    closeSectionAddSheet();
  }

  async function handleRemoveShoppingListMember(
    list: ShoppingList,
    member: ShoppingListMember,
  ) {
    if (!window.confirm(`¿Expulsar a ${member.email} de ${list.name}?`)) {
      return;
    }

    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      await removeShoppingListMember(list.id, member.userId);
      setShoppingListMembers((currentMembers) => ({
        ...currentMembers,
        [list.id]: (currentMembers[list.id] ?? []).filter(
          (currentMember) => currentMember.userId !== member.userId,
        ),
      }));
      setShoppingLists((currentLists) =>
        currentLists.map((currentList) =>
          currentList.id === list.id
            ? {
                ...currentList,
                memberCount: Math.max(currentList.memberCount - 1, 0),
              }
            : currentList,
        ),
      );
      setShoppingListMessage(`Miembro expulsado de ${list.name}.`);
    } catch {
      setShoppingListMessage("No se pudo expulsar al miembro.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  async function handleTransferShoppingListOwnership(
    list: ShoppingList,
    member: ShoppingListMember,
  ) {
    if (
      !window.confirm(
        `¿Transferir la propiedad de ${list.name} a ${member.email}? Dejarás de poder administrarla.`,
      )
    ) {
      return;
    }

    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      await transferShoppingListOwnership(list.id, member.userId);
      const lists = await getShoppingLists();
      setShoppingLists(lists);
      setShoppingListMembers((currentMembers) => ({
        ...currentMembers,
        [list.id]: (currentMembers[list.id] ?? []).map((currentMember) =>
          currentMember.userId === member.userId
            ? { ...currentMember, role: "owner" }
            : currentMember.userId === list.ownerId
              ? { ...currentMember, role: "member" }
              : currentMember,
        ),
      }));
      setShoppingListMessage(`Propiedad transferida a ${member.email}.`);
    } catch {
      setShoppingListMessage("No se pudo transferir la propiedad.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  async function handleLeaveShoppingList(listId: string) {
    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      await leaveShoppingList(listId);
      setShoppingLists((currentLists) =>
        currentLists.filter((list) => list.id !== listId),
      );
    } catch {
      setShoppingListMessage("No se pudo abandonar la lista.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  async function handleDeleteShoppingList(list: ShoppingList) {
    if (list.productCount > 0 || list.memberCount > 0) {
      setShoppingListMessage(
        `No se puede borrar ${list.name} porque tiene productos o usuarios suscritos.`,
      );
      return;
    }

    if (!window.confirm(`¿Borrar la lista ${list.name}?`)) {
      return;
    }

    setIsShoppingListActionPending(true);
    setShoppingListMessage(null);

    try {
      await deleteShoppingList(list.id);
      setShoppingLists((currentLists) =>
        currentLists.filter((currentList) => currentList.id !== list.id),
      );
    } catch {
      setShoppingListMessage("No se pudo borrar la lista.");
    } finally {
      setIsShoppingListActionPending(false);
    }
  }

  function handlePwaUpdate() {
    setIsPwaUpdateApplying(true);
    window.dispatchEvent(new Event(pwaUpdateApplyEvent));
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
        uploadedBy: currentShoppingUserId,
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
    if (!isCurrentUserAdministrator) {
      return;
    }

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
    void handleCreateShoppingList();
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
            {item.notes ? (
              <span className={styles.itemNotes}>{item.notes}</span>
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

  function renderDeveloperRemoteActionsCard() {
    const status = remoteAction?.status;
    const statusText =
      status === "running"
        ? "Ejecutando"
        : status === "completed"
          ? "Completada"
          : status === "failed"
            ? "Fallida"
            : status === "pending"
              ? "Pendiente"
              : "Sin órdenes";
    const hasError = status === "failed" || Boolean(remoteActionError);
    const isActionRunning = status === "pending" || status === "running";

    return (
      <section className={styles.developerPanel} aria-label="Acciones remotas">
        <div className={styles.developerPanelHeader}>
          <h3>Acciones del servidor</h3>
          <span
            className={
              hasError
                ? styles.developerStatusFailed
                : styles.developerStatusSuccess
            }
          >
            {statusText}
          </span>
        </div>
        <p className={styles.developerNote}>
          El servidor ejecuta tareas autorizadas sin exponer puertos públicos.
        </p>
        {remoteActionError ? (
          <p className={styles.error} role="alert">
            {remoteActionError}
          </p>
        ) : null}
        {remoteAction?.resultSummary ? (
          <p className={styles.developerNote}>{remoteAction.resultSummary}</p>
        ) : null}
        {remoteAction?.errorMessage ? (
          <p className={styles.developerNote} role="alert">
            {remoteAction.errorMessage}
          </p>
        ) : null}
        <div className={styles.developerActions}>
          {remoteActionDefinitions.map((definition) => (
            <button
              key={definition.name}
              className={
                definition.name === "supabase_backup"
                  ? styles.primaryButton
                  : styles.secondaryButton
              }
              type="button"
              onPointerDown={handleButtonPointerDown}
              onClick={() => void handleRemoteAction(definition.name)}
              disabled={isRemoteActionPending || isActionRunning}
            >
              {isRemoteActionPending && remoteAction?.action === definition.name
                ? "Solicitando…"
                : definition.label}
            </button>
          ))}
        </div>
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

  function renderDeveloperOverviewCard() {
    const backupStatus = getDeveloperBackupStatus(developerBackupRun);
    const backupStatusText = getDeveloperBackupStatusText(backupStatus);
    const hasBackupProblem =
      backupStatus === "failed" || backupStatus === "stale";
    const pushStatus = pushNotificationSnapshot.message;
    const hasPushProblem =
      pushNotificationSnapshot.status === "error" ||
      pushNotificationSnapshot.status === "denied";
    const hasOperationalProblem =
      hasBackupProblem || hasPushProblem || syncStatus === "offline";

    return (
      <section
        className={styles.developerOverview}
        aria-label="Resumen operativo"
      >
        <div className={styles.developerOverviewHeader}>
          <div>
            <p className={styles.developerEyebrow}>Estado general</p>
            <h3>
              {hasOperationalProblem ? "Revisar la app" : "Todo en orden"}
            </h3>
          </div>
          <span
            className={
              hasOperationalProblem
                ? styles.developerStatusFailed
                : styles.developerStatusSuccess
            }
          >
            {hasOperationalProblem ? "Atención" : "Operativa"}
          </span>
        </div>
        <div className={styles.developerOverviewMetrics}>
          <div>
            <span>Backup</span>
            <strong
              className={hasBackupProblem ? styles.developerMetricWarning : ""}
            >
              {backupStatusText}
            </strong>
          </div>
          <div>
            <span>Sincronización</span>
            <strong>{getSyncStatusText(syncStatus)}</strong>
          </div>
          <div>
            <span>Push</span>
            <strong
              className={hasPushProblem ? styles.developerMetricWarning : ""}
            >
              {pushStatus}
            </strong>
          </div>
        </div>
      </section>
    );
  }

  function toggleDeveloperSection(id: DeveloperSectionId) {
    setOpenDeveloperSection((currentId) => (currentId === id ? null : id));
  }

  function renderDeveloperAuthCard() {
    if (authSnapshot.status !== "signed_in" || !authSnapshot.user) {
      return null;
    }

    return (
      <section className={styles.developerPanel} aria-label="Autenticación">
        <div className={styles.developerPanelHeader}>
          <h3>Autenticación</h3>
          <span className={styles.developerStatusSuccess}>Sesión activa</span>
        </div>
        <div className={styles.developerAuthRow}>
          <span className={styles.authStatus}>
            {authSnapshot.user.email ?? "Sesión iniciada"}
          </span>
          <button
            className={styles.authButton}
            type="button"
            onPointerDown={handleButtonPointerDown}
            onClick={handleSignOut}
            disabled={isAuthActionPending}
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    );
  }

  function renderShoppingListsCard() {
    if (authSnapshot.status !== "signed_in" || !authSnapshot.user) {
      return null;
    }

    return (
      <section
        className={styles.developerPanel}
        aria-label="Listas disponibles"
      >
        <div className={styles.developerPanelHeader}>
          <h3>Listas</h3>
          <span className={styles.developerStatusSuccess}>
            {shoppingLists.length}
          </span>
        </div>
        {shoppingLists.length > 0 ? (
          <ul className={styles.shoppingListManager}>
            {shoppingLists.map((list) => {
              const isOwner = list.currentRole === "owner";
              const listIndex = shoppingLists.findIndex(
                (currentList) => currentList.id === list.id,
              );
              const listSections = sections.filter((section) =>
                section.id.startsWith(`${list.id}::`),
              );
              const listItems = items.filter((item) =>
                listSections.some((section) => section.id === item.sectionId),
              );
              const hasLoadedSections = listSections.length > 0;
              const productCount = hasLoadedSections
                ? listItems.length
                : (list.productCount ?? 0);
              const purchasedCount = hasLoadedSections
                ? listItems.filter((item) => item.purchased).length
                : 0;
              const pendingCount = productCount - purchasedCount;
              const listSection = listSections[0];

              const isExpanded = expandedShoppingListIds.includes(list.id);

              return (
                <li
                  key={list.id}
                  className={`${styles.shoppingListManagerItem} ${listSection ? styles[`shoppingListCardColor${listSection.color}`] : ""}`}
                >
                  <div className={styles.shoppingListCardHeader}>
                    {isOwner ? (
                      <input
                        className={styles.input}
                        aria-label={`Nombre de ${list.name}`}
                        defaultValue={list.name}
                        type="text"
                        onBlur={(event) =>
                          void handleRenameShoppingList(
                            list.id,
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }
                        }}
                        disabled={isShoppingListActionPending}
                      />
                    ) : (
                      <strong>{list.name}</strong>
                    )}
                    <div className={styles.shoppingListStats}>
                      <span>{pendingCount} pendientes</span>
                      <span>{productCount} productos</span>
                    </div>
                  </div>
                  <div className={styles.shoppingListCardActions}>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      onPointerDown={handleButtonPointerDown}
                      onClick={() =>
                        void handleToggleShoppingListMembers(list.id)
                      }
                      disabled={isShoppingListActionPending}
                    >
                      {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                    </button>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onPointerDown={handleButtonPointerDown}
                      onClick={() => handleOpenShoppingList(listSection?.id)}
                    >
                      Abrir lista
                    </button>
                  </div>
                  {isExpanded ? (
                    <div className={styles.shoppingListDetails}>
                      <div
                        className={styles.shoppingListMembers}
                        aria-label={`Miembros de ${list.name}`}
                        role="region"
                      >
                        <strong>Miembros de la lista</strong>
                        {(shoppingListMembers[list.id] ?? []).map((member) => (
                          <div
                            className={styles.shoppingListMember}
                            key={member.userId}
                          >
                            <div>
                              <strong>
                                {member.displayName || member.email}
                              </strong>
                              <small>{member.email}</small>
                            </div>
                            <span className={styles.shoppingListMemberRole}>
                              {member.role === "owner"
                                ? "Propietario"
                                : "Miembro"}
                            </span>
                            {isOwner && member.role === "member" ? (
                              <div className={styles.shoppingListMemberActions}>
                                <button
                                  className={styles.authButton}
                                  type="button"
                                  onPointerDown={handleButtonPointerDown}
                                  onClick={() =>
                                    void handleTransferShoppingListOwnership(
                                      list,
                                      member,
                                    )
                                  }
                                  disabled={isShoppingListActionPending}
                                >
                                  Transferir
                                </button>
                                <button
                                  className={styles.authButton}
                                  type="button"
                                  onPointerDown={handleButtonPointerDown}
                                  onClick={() =>
                                    void handleRemoveShoppingListMember(
                                      list,
                                      member,
                                    )
                                  }
                                  disabled={isShoppingListActionPending}
                                >
                                  Expulsar
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className={styles.shoppingListAdvanced}>
                        <div className={styles.shoppingListManagerActions}>
                          <button
                            className={styles.iconButton}
                            type="button"
                            aria-label={`Subir ${list.name}`}
                            title="Subir"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() =>
                              void handleMoveShoppingList(list.id, -1)
                            }
                            disabled={
                              isShoppingListActionPending || listIndex === 0
                            }
                          >
                            <Icon name="arrowUp" />
                          </button>
                          <button
                            className={styles.iconButton}
                            type="button"
                            aria-label={`Bajar ${list.name}`}
                            title="Bajar"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() =>
                              void handleMoveShoppingList(list.id, 1)
                            }
                            disabled={
                              isShoppingListActionPending ||
                              listIndex === shoppingLists.length - 1
                            }
                          >
                            <Icon name="arrowDown" />
                          </button>
                        </div>
                        {listSection ? (
                          <div
                            className={styles.sectionColorPicker}
                            aria-label={`Color de ${list.name}`}
                            role="group"
                          >
                            {shoppingSectionColors.map((color) => (
                              <button
                                className={`${styles.sectionColorButton} ${styles[`sectionColorSwatch${color}`]}${listSection.color === color ? ` ${styles.sectionColorButtonSelected}` : ""}`}
                                type="button"
                                aria-label={`Poner ${list.name} en color ${color}`}
                                aria-pressed={listSection.color === color}
                                key={color}
                                onPointerDown={handleButtonPointerDown}
                                onClick={() =>
                                  handleSectionColorChange(
                                    listSection.id,
                                    color,
                                  )
                                }
                                disabled={isShoppingListActionPending}
                              />
                            ))}
                          </div>
                        ) : null}
                        <div className={styles.shoppingListCodeBlock}>
                          {isOwner ? (
                            <>
                              <span>
                                Código: <code>{list.joinCode}</code>
                              </span>
                              <button
                                className={styles.authButton}
                                type="button"
                                onPointerDown={handleButtonPointerDown}
                                onClick={() =>
                                  void handleRegenerateShoppingListCode(list.id)
                                }
                                disabled={isShoppingListActionPending}
                              >
                                Regenerar
                              </button>
                            </>
                          ) : null}
                        </div>
                        {isOwner ? (
                          <button
                            className={styles.dangerButton}
                            type="button"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() => void handleDeleteShoppingList(list)}
                            disabled={isShoppingListActionPending}
                          >
                            <Icon name="trash" /> Borrar lista
                          </button>
                        ) : (
                          <button
                            className={styles.dangerButton}
                            type="button"
                            onPointerDown={handleButtonPointerDown}
                            onClick={() =>
                              void handleLeaveShoppingList(list.id)
                            }
                            disabled={isShoppingListActionPending}
                          >
                            Abandonar lista
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.shoppingListEmpty}>
            <p className={styles.authMessage}>No tienes listas compartidas.</p>
            <button
              className={styles.primaryButton}
              type="button"
              onPointerDown={handleButtonPointerDown}
              onClick={openSectionAddSheet}
            >
              Nueva lista
            </button>
          </div>
        )}
        {shoppingListMessage ? (
          <p className={styles.authMessage} role="status">
            {shoppingListMessage}
          </p>
        ) : null}
      </section>
    );
  }

  if (isSupabaseConfigured() && authSnapshot.status !== "signed_in") {
    return (
      <LoginScreen
        authSnapshot={authSnapshot}
        email={authEmail}
        password={authPassword}
        message={authMessage}
        isPending={isAuthActionPending}
        onEmailChange={(event) => setAuthEmail(event.target.value)}
        onPasswordChange={(event) => setAuthPassword(event.target.value)}
        onSubmit={handlePasswordSubmit}
        onButtonPointerDown={handleButtonPointerDown}
      />
    );
  }

  return (
    <main
      onTouchStart={handlePullRefreshTouchStart}
      onTouchMove={handlePullRefreshTouchMove}
      onTouchEnd={handlePullRefreshTouchEnd}
      onTouchCancel={finishPullRefreshGesture}
      className={`${styles.app} ${resolvedTheme === "dark" ? styles.appThemeDark : ""} ${
        activeView === "shopping" ? styles.appShopping : ""
      } ${isPushInviteVisible ? styles.appPushInviteVisible : ""}`}
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
      <PwaUpdateBanner
        isAvailable={isPwaUpdateAvailable}
        isApplying={isPwaUpdateApplying}
        onButtonPointerDown={handleButtonPointerDown}
        onUpdate={handlePwaUpdate}
      />
      <AppHeader
        appRelease={appRelease}
        isLoaded={isLoaded}
        pendingCount={pendingCount}
        purchasedCount={purchasedCount}
        syncStatus={syncStatus}
        syncStatusRef={syncStatusRef}
        themePreference={themePreference}
        onThemePreferenceChange={handleThemePreferenceChange}
        onButtonPointerDown={handleButtonPointerDown}
        getSyncStatusText={getSyncStatusText}
      />

      {activeView === "shopping" ? (
        <ShoppingControls
          controlsRef={commandPanelRef}
          isLoaded={isLoaded}
          query={shoppingSearchQuery}
          showPurchasedItems={showPurchasedItems}
          canClearPurchasedItems={selectedPurchasedCount > 0}
          onQueryChange={(event) => setShoppingSearchQuery(event.target.value)}
          onClearQuery={() => setShoppingSearchQuery("")}
          onShowPurchasedItemsChange={(event) =>
            handleShowPurchasedItemsChange(event.target.checked)
          }
          onClearPurchasedItems={handleRemovePurchasedItems}
          onButtonPointerDown={handleButtonPointerDown}
        />
      ) : null}

      {activeView === "shopping" ? (
        <PushNotificationInvite
          isVisible={isPushInviteVisible}
          snapshot={pushNotificationSnapshot}
          isPending={isPushNotificationActionPending}
          onDismiss={handleDismissPushNotificationInvite}
          onActivate={handlePushNotificationAction}
          onButtonPointerDown={handleButtonPointerDown}
        />
      ) : null}

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
        <FloatingActionButton
          buttonRef={addFabRef}
          label="Añadir producto"
          icon="plus"
          disabled={!isLoaded}
          onButtonPointerDown={handleButtonPointerDown}
          onClick={openAddSheet}
        />
      ) : null}

      {activeView === "tickets" && !isTicketUploadSheetOpen ? (
        <FloatingActionButton
          buttonRef={ticketUploadFabRef}
          label="Subir ticket"
          icon="upload"
          disabled={!isLoaded}
          onButtonPointerDown={handleButtonPointerDown}
          onClick={openTicketUploadSheet}
        />
      ) : null}

      {freezerViewEnabled &&
      activeView === "freezer" &&
      !isFreezerAddSheetOpen &&
      !editingFreezerItem ? (
        <FloatingActionButton
          buttonRef={freezerAddFabRef}
          label="Añadir producto congelado"
          icon="plus"
          disabled={!isLoaded}
          onButtonPointerDown={handleButtonPointerDown}
          onClick={openFreezerAddSheet}
        />
      ) : null}

      {activeView === "sections" && !isSectionAddSheetOpen ? (
        <FloatingActionButton
          buttonRef={sectionAddFabRef}
          label="Crear lista"
          icon="plus"
          disabled={!isLoaded}
          onButtonPointerDown={handleButtonPointerDown}
          onClick={openSectionAddSheet}
        />
      ) : null}

      {activeView === "shopping" && isAddSheetOpen ? (
        <AddProductSheet
          backdropRef={addSheetBackdropRef}
          categories={categories}
          getCategoryName={getShoppingCategoryName}
          isLoaded={isLoaded}
          itemName={itemName}
          itemNameInputRef={itemNameInputRef}
          keyboardInset={sheetKeyboardInset}
          notice={addProductNotice}
          notes={addItemNotes}
          onButtonPointerDown={handleButtonPointerDown}
          onClose={closeAddSheet}
          onDragEnd={handleAddSheetDragEnd}
          onDragMove={handleAddSheetDragMove}
          onDragStart={handleAddSheetDragStart}
          onItemNameChange={handleItemNameChange}
          onItemNameKeyDown={handleAddInputKeyDown}
          onNotesChange={setAddItemNotes}
          onQuantityChange={handleAddItemQuantityChange}
          onQuantityFocus={selectTextOnFocus}
          onQuickSuggestion={handleQuickSuggestionClick}
          onSectionChange={selectSection}
          onSheetKeyDown={handleAddSheetKeyDown}
          onSubmit={handleSubmit}
          onViewDuplicate={handleViewDuplicateItem}
          quantity={addItemQuantity}
          quickSuggestions={quickItemSuggestions}
          sections={sections}
          selectedSectionId={selectedSectionId}
          sheetDragOffset={sheetDragOffset}
          sheetRef={addSheetRef}
        />
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
        <TicketUploadSheet
          backdropRef={ticketUploadSheetBackdropRef}
          error={ticketError}
          files={ticketUploadFiles}
          fileInputRef={ticketFileInputRef}
          formatFileSize={formatFileSize}
          isPending={isTicketUploadPending}
          keyboardInset={sheetKeyboardInset}
          onButtonPointerDown={handleButtonPointerDown}
          onClose={closeTicketUploadSheet}
          onDragEnd={handleAddSheetDragEnd}
          onDragMove={handleAddSheetDragMove}
          onDragStart={handleAddSheetDragStart}
          onFilesChange={handleTicketFilesChange}
          onSectionChange={setTicketUploadSectionId}
          onSubmit={handleTicketUploadSubmit}
          sectionId={ticketUploadSectionId}
          sections={sections}
          sheetDragOffset={sheetDragOffset}
          sheetRef={ticketUploadSheetRef}
        />
      ) : null}

      {freezerViewEnabled &&
      activeView === "freezer" &&
      isFreezerAddSheetOpen ? (
        <FreezerAddSheet
          backdropRef={freezerAddSheetBackdropRef}
          drawerId={selectedFreezerDrawerId}
          frozenAt={freezerItemFrozenAt}
          isLoaded={isLoaded}
          keyboardInset={sheetKeyboardInset}
          name={freezerItemName}
          nameInputRef={freezerItemNameInputRef}
          onButtonPointerDown={handleButtonPointerDown}
          onClose={closeFreezerAddSheet}
          onDrawerChange={(drawerId) => {
            if (isFreezerDrawerId(drawerId)) {
              setSelectedFreezerDrawerId(drawerId);
            }
          }}
          onDragEnd={handleAddSheetDragEnd}
          onDragMove={handleAddSheetDragMove}
          onDragStart={handleAddSheetDragStart}
          onFrozenAtChange={setFreezerItemFrozenAt}
          onNameChange={setFreezerItemName}
          onQuantityChange={setFreezerItemQuantity}
          onQuantityFocus={selectTextOnFocus}
          onSheetKeyDown={handleAddSheetKeyDown}
          onSubmit={handleFreezerSubmit}
          quantity={freezerItemQuantity}
          sheetDragOffset={sheetDragOffset}
          sheetRef={freezerAddSheetRef}
        />
      ) : null}

      {activeView === "sections" && isSectionAddSheetOpen ? (
        <CreateSectionSheet
          backdropRef={sectionAddSheetBackdropRef}
          isLoaded={isLoaded}
          keyboardInset={sheetKeyboardInset}
          name={sectionName}
          nameInputRef={sectionNameInputRef}
          onButtonPointerDown={handleButtonPointerDown}
          onClose={closeSectionAddSheet}
          onColorChange={setNewSectionColor}
          onDragEnd={handleAddSheetDragEnd}
          onDragMove={handleAddSheetDragMove}
          onDragStart={handleAddSheetDragStart}
          onNameChange={setSectionName}
          onSheetKeyDown={handleAddSheetKeyDown}
          onSubmit={handleSectionSubmit}
          selectedColor={newSectionColor}
          sheetDragOffset={sheetDragOffset}
          sheetRef={sectionAddSheetRef}
        />
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
        <ShoppingBoard
          activeSectionIndicatorRef={activeSectionIndicatorRef}
          boardRef={boardRef}
          isLoaded={isLoaded}
          items={items}
          lastHiddenPurchasedItem={lastHiddenPurchasedItem}
          lastRemovedItems={lastRemovedItems}
          onButtonPointerDown={handleButtonPointerDown}
          onColumnKeyDown={handleColumnKeyDown}
          onSelectSection={selectSection}
          renderItems={renderItems}
          renderLoadingBoard={renderLoadingBoard}
          sectionColumnRefs={sectionColumnRefs}
          sectionIndicatorRefs={sectionIndicatorRefs}
          sections={sections}
          selectedSectionId={selectedSectionId}
          shoppingBoardElementRef={shoppingBoardElementRef}
        />
      ) : null}

      {freezerViewEnabled && activeView === "freezer" ? (
        <FreezerView
          screenRef={freezerScreenRef}
          items={freezerItems}
          useFirstItems={useFirstFreezerItems}
          undo={renderFreezerUseUndoItem()}
          renderItems={renderFreezerItemList}
        />
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
            <span className={styles.count}>
              {isSupabaseConfigured() ? shoppingLists.length : sections.length}
            </span>
          </div>
          {isSupabaseConfigured() ? renderShoppingListsCard() : null}
          {!isSupabaseConfigured() ? (
            <>
              {sectionActionMessage ? (
                <p className={styles.sectionActionMessage} role="status">
                  {sectionActionMessage}
                </p>
              ) : null}
              <ol className={styles.shoppingListManager}>
                {sections.map((section, index) => {
                  const sectionProductCount = items.filter(
                    (item) => item.sectionId === section.id,
                  ).length;
                  const sectionPendingCount = items.filter(
                    (item) => item.sectionId === section.id && !item.purchased,
                  ).length;
                  const isExpanded = expandedShoppingListIds.includes(
                    section.id,
                  );

                  return (
                    <li
                      className={
                        styles.shoppingListManagerItem +
                        " " +
                        styles["shoppingListCardColor" + section.color]
                      }
                      key={section.id}
                    >
                      <div className={styles.shoppingListCardHeader}>
                        <input
                          className={styles.input}
                          aria-label={`Nombre de ${section.name}`}
                          value={section.name}
                          onChange={(event) =>
                            isExpanded
                              ? handleSectionNameChange(section.id, event)
                              : undefined
                          }
                          disabled={!isLoaded || !isExpanded}
                          type="text"
                        />
                        <div className={styles.shoppingListStats}>
                          <span>{sectionPendingCount} pendientes</span>
                          <span>{sectionProductCount} productos</span>
                        </div>
                      </div>
                      <div className={styles.shoppingListCardActions}>
                        <button
                          className={styles.primaryButton}
                          type="button"
                          onPointerDown={handleButtonPointerDown}
                          onClick={() =>
                            setExpandedShoppingListIds((currentIds) =>
                              currentIds.includes(section.id)
                                ? currentIds.filter((id) => id !== section.id)
                                : [...currentIds, section.id],
                            )
                          }
                        >
                          {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                        </button>
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          onPointerDown={handleButtonPointerDown}
                          onClick={() => handleOpenShoppingList(section.id)}
                        >
                          Abrir lista
                        </button>
                      </div>
                      {isExpanded ? (
                        <div className={styles.shoppingListAdvanced}>
                          <div
                            className={styles.sectionColorPicker}
                            aria-label={`Color de ${section.name}`}
                            role="group"
                          >
                            {shoppingSectionColors.map((color) => (
                              <button
                                className={
                                  styles.sectionColorButton +
                                  " " +
                                  styles["sectionColorSwatch" + color] +
                                  (section.color === color
                                    ? " " + styles.sectionColorButtonSelected
                                    : "")
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
                          <div className={styles.shoppingListManagerActions}>
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
                              disabled={
                                !isLoaded || index === sections.length - 1
                              }
                            >
                              <Icon name="arrowDown" />
                            </button>
                          </div>
                          <button
                            className={styles.dangerButton}
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
                            <Icon name="trash" /> Borrar lista
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}
        </section>
      ) : null}

      {activeView === "history" ? (
        <HistoryView
          count={displayedHistoryCount}
          historyTab={historyTab}
          onButtonPointerDown={handleButtonPointerDown}
          onHistoryTabChange={handleHistoryTabClick}
          onShowFullHistory={showHistoryView}
          screenRef={historyScreenRef}
          showUnseenOnly={showUnseenHistoryOnly}
        >
          {historyTab === "normalizations"
            ? renderProductNormalizationChanges()
            : historyTab === "categories"
              ? renderRecategorizationChanges()
              : renderHistoryEvents()}
        </HistoryView>
      ) : null}

      {activeView === "menu" ? <MenuPlanningView /> : null}

      {activeView === "developer" &&
      isCurrentUserAdministrator &&
      (!isSupabaseConfigured() || authSnapshot.status === "signed_in") ? (
        <section
          ref={developerScreenRef}
          className={styles.developerScreen}
          aria-labelledby="developer-title"
        >
          <div className={styles.sectionsHeader}>
            <h2 id="developer-title">Dev</h2>
            <span className={styles.count}>Panel operativo</span>
          </div>
          {renderDeveloperOverviewCard()}
          <DeveloperDisclosure
            id="auth"
            title="Sesión y contexto"
            summary={authSnapshot.user?.email ?? "Sesión local"}
            expanded={openDeveloperSection === "auth"}
            onToggle={toggleDeveloperSection}
          >
            {renderDeveloperAuthCard()}
            <DeveloperAppContext
              historyCount={recentHistoryEvents.length}
              pendingCount={pendingCount}
              purchasedCount={purchasedCount}
              sectionCount={sections.length}
              storageMode={getShoppingItemsStorageMode()}
              supabaseConfigured={isSupabaseConfigured()}
              syncStatusText={getSyncStatusText(syncStatus)}
            />
          </DeveloperDisclosure>
          <DeveloperDisclosure
            id="backup"
            title="Backup Supabase"
            summary={getDeveloperBackupStatusText(
              getDeveloperBackupStatus(developerBackupRun),
            )}
            expanded={openDeveloperSection === "backup"}
            onToggle={toggleDeveloperSection}
          >
            {renderDeveloperBackupCard()}
          </DeveloperDisclosure>
          <DeveloperDisclosure
            id="actions"
            title="Acciones remotas"
            summary={
              remoteAction?.resultSummary ?? "Tareas autorizadas del servidor"
            }
            expanded={openDeveloperSection === "actions"}
            onToggle={toggleDeveloperSection}
          >
            {renderDeveloperRemoteActionsCard()}
          </DeveloperDisclosure>
          <DeveloperDisclosure
            id="push"
            title="Notificaciones push"
            summary={pushNotificationSnapshot.message}
            expanded={openDeveloperSection === "push"}
            onToggle={toggleDeveloperSection}
          >
            {renderDeveloperPushNotificationCard()}
          </DeveloperDisclosure>
        </section>
      ) : null}

      <AppBottomNav
        activeView={activeView}
        isLoaded={isLoaded}
        freezerViewEnabled={freezerViewEnabled}
        canOpenMenu={isSupabaseConfigured()}
        canOpenDeveloper={
          isCurrentUserAdministrator &&
          (!isSupabaseConfigured() || authSnapshot.status === "signed_in")
        }
        onButtonPointerDown={handleButtonPointerDown}
        onShopping={showShoppingView}
        onMenu={() => setActiveView("menu")}
        onTickets={showTicketsView}
        onFreezer={() => setActiveView("freezer")}
        onSections={showSectionsView}
        onHistory={showHistoryView}
        onDeveloper={showDeveloperView}
      />

      <ClearPurchasedDialog
        isOpen={isClearDialogOpen}
        dialogRef={clearDialogRef}
        description={clearPurchasedDescription}
        items={selectedPurchasedItems}
        confirmLabel={removePurchasedButtonText}
        getUserName={(item) => getShoppingUserName(item.addedBy)}
        onCancel={() => {
          runHapticFeedback("light");
          consumeOverlayHistory("clear-dialog");
          setIsClearDialogOpen(false);
        }}
        onConfirm={confirmRemovePurchasedItems}
        onButtonPointerDown={handleButtonPointerDown}
      />

      {editingItem ? (
        <EditProductDialog
          item={editingItem}
          name={editingItemName}
          notes={editingItemNotes}
          onButtonPointerDown={handleButtonPointerDown}
          onCancel={cancelEditing}
          onNameChange={(event) => setEditingItemName(event.target.value)}
          onNotesChange={(event) => setEditingItemNotes(event.target.value)}
          onQuantityChange={(event) =>
            setEditingItemQuantity(event.target.value)
          }
          onQuantityFocus={selectTextOnFocus}
          onSectionChange={setEditingSectionId}
          onSubmit={handleEditSubmit}
          quantity={editingItemQuantity}
          sectionId={editingSectionId}
          sections={sections}
        />
      ) : null}

      {freezerViewEnabled && editingFreezerItem ? (
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
