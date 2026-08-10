import type { PointerEventHandler } from "react";

import styles from "../../App.module.scss";
import { Icon } from "../ui/Icon";

export type AppView =
  | "shopping"
  | "menu"
  | "freezer"
  | "tickets"
  | "sections"
  | "history"
  | "developer";

type AppBottomNavProps = {
  activeView: AppView;
  isLoaded: boolean;
  freezerViewEnabled: boolean;
  canOpenMenu: boolean;
  canOpenDeveloper: boolean;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
  onShopping: () => void;
  onMenu: () => void;
  onTickets: () => void;
  onFreezer: () => void;
  onSections: () => void;
  onHistory: () => void;
  onDeveloper: () => void;
};

export function AppBottomNav({
  activeView,
  isLoaded,
  freezerViewEnabled,
  canOpenMenu,
  canOpenDeveloper,
  onButtonPointerDown,
  onShopping,
  onMenu,
  onTickets,
  onFreezer,
  onSections,
  onHistory,
  onDeveloper,
}: AppBottomNavProps) {
  const getItemClassName = (view: AppView) =>
    activeView === view ? styles.bottomNavItemActive : styles.bottomNavItem;

  return (
    <nav className={styles.bottomNav} aria-label="Navegación principal">
      <button
        className={getItemClassName("shopping")}
        type="button"
        onPointerDown={onButtonPointerDown}
        onClick={onShopping}
        disabled={!isLoaded}
      >
        <Icon name="utensils" />
        <span>Lista</span>
      </button>
      <button
        className={getItemClassName("menu")}
        type="button"
        onPointerDown={onButtonPointerDown}
        onClick={onMenu}
        disabled={!isLoaded || !canOpenMenu}
      >
        <Icon name="list" />
        <span>Platos</span>
      </button>
      <button
        className={getItemClassName("tickets")}
        type="button"
        onPointerDown={onButtonPointerDown}
        onClick={onTickets}
        disabled={!isLoaded}
      >
        <Icon name="ticket" />
        <span>Tickets</span>
      </button>
      {freezerViewEnabled ? (
        <button
          className={getItemClassName("freezer")}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onFreezer}
          disabled={!isLoaded}
        >
          <Icon name="freezer" />
          <span>Congelador</span>
        </button>
      ) : null}
      <button
        className={getItemClassName("sections")}
        type="button"
        aria-label="Gestionar listas"
        onPointerDown={onButtonPointerDown}
        onClick={onSections}
        disabled={!isLoaded}
      >
        <Icon name="settings" />
        <span>Listas</span>
      </button>
      <button
        className={getItemClassName("history")}
        type="button"
        onPointerDown={onButtonPointerDown}
        onClick={onHistory}
        disabled={!isLoaded}
      >
        <Icon name="history" />
        <span>Historial</span>
      </button>
      {canOpenDeveloper ? (
        <button
          className={getItemClassName("developer")}
          type="button"
          aria-label="Vista de desarrollador"
          onPointerDown={onButtonPointerDown}
          onClick={onDeveloper}
          disabled={!isLoaded}
        >
          <Icon name="database" />
          <span>Dev</span>
        </button>
      ) : null}
    </nav>
  );
}
