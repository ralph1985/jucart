import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import {
  shoppingSectionColors,
  type ShoppingItem,
  type ShoppingSection,
  type ShoppingSectionColor,
} from "../../shoppingItems";
import { Icon } from "../ui/Icon";

type LocalSectionsManagerProps = {
  actionMessage: string | null;
  expandedSectionIds: string[];
  isLoaded: boolean;
  items: ShoppingItem[];
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onColorChange: (sectionId: string, color: ShoppingSectionColor) => void;
  onEdit: (section: ShoppingSection) => void;
  onMove: (sectionId: string, direction: -1 | 1) => void;
  onOpen: (sectionId: string) => void;
  onRemove: (sectionId: string) => void;
  onToggle: (sectionId: string) => void;
  sections: ShoppingSection[];
};

export function LocalSectionsManager({
  actionMessage,
  expandedSectionIds,
  isLoaded,
  items,
  onButtonPointerDown,
  onColorChange,
  onEdit,
  onMove,
  onOpen,
  onRemove,
  onToggle,
  sections,
}: LocalSectionsManagerProps) {
  return (
    <>
      {actionMessage ? (
        <p className={styles.sectionActionMessage} role="status">
          {actionMessage}
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
          const isExpanded = expandedSectionIds.includes(section.id);

          return (
            <li
              className={`${styles.shoppingListManagerItem} ${styles[`shoppingListCardColor${section.color}`]}`}
              key={section.id}
            >
              <div className={styles.shoppingListCardHeader}>
                <strong>{section.name}</strong>
                <div className={styles.shoppingListStats}>
                  <span>{sectionPendingCount} pendientes</span>
                  <span>{sectionProductCount} productos</span>
                </div>
              </div>
              <div className={styles.shoppingListCardActions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onPointerDown={onButtonPointerDown}
                  onClick={() => onToggle(section.id)}
                >
                  {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onPointerDown={onButtonPointerDown}
                  onClick={() => onOpen(section.id)}
                >
                  Abrir lista
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onPointerDown={onButtonPointerDown}
                  onClick={() => onEdit(section)}
                  disabled={!isLoaded}
                >
                  Editar
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
                        className={`${styles.sectionColorButton} ${styles[`sectionColorSwatch${color}`]}${section.color === color ? ` ${styles.sectionColorButtonSelected}` : ""}`}
                        type="button"
                        aria-label={`Poner ${section.name} en color ${color}`}
                        aria-pressed={section.color === color}
                        key={color}
                        onPointerDown={onButtonPointerDown}
                        onClick={() => onColorChange(section.id, color)}
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
                      onPointerDown={onButtonPointerDown}
                      onClick={() => onMove(section.id, -1)}
                      disabled={!isLoaded || index === 0}
                    >
                      <Icon name="arrowUp" />
                    </button>
                    <button
                      className={styles.iconButton}
                      type="button"
                      aria-label={`Bajar ${section.name}`}
                      title="Bajar"
                      onPointerDown={onButtonPointerDown}
                      onClick={() => onMove(section.id, 1)}
                      disabled={!isLoaded || index === sections.length - 1}
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
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onRemove(section.id)}
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
  );
}
