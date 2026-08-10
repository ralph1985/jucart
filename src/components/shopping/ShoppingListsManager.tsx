import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type {
  ShoppingItem,
  ShoppingSection,
  ShoppingSectionColor,
} from "../../shoppingItems";
import { shoppingSectionColors } from "../../shoppingItems";
import type { ShoppingList, ShoppingListMember } from "../../shoppingLists";
import { Icon } from "../ui/Icon";

type ShoppingListsManagerProps = {
  expandedListIds: string[];
  isActionPending: boolean;
  items: ShoppingItem[];
  lists: ShoppingList[];
  membersByListId: Record<string, ShoppingListMember[]>;
  message: string | null;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onColorChange: (sectionId: string, color: ShoppingSectionColor) => void;
  onCreate: () => void;
  onDelete: (list: ShoppingList) => void;
  onLeave: (listId: string) => void;
  onMove: (listId: string, direction: -1 | 1) => void;
  onOpen: (sectionId: string | undefined) => void;
  onRegenerateCode: (listId: string) => void;
  onRemoveMember: (list: ShoppingList, member: ShoppingListMember) => void;
  onRename: (listId: string, name: string) => void;
  onToggleDetails: (listId: string) => void;
  onTransferOwnership: (list: ShoppingList, member: ShoppingListMember) => void;
  sections: ShoppingSection[];
};

export function ShoppingListsManager({
  expandedListIds,
  isActionPending,
  items,
  lists,
  membersByListId,
  message,
  onButtonPointerDown,
  onColorChange,
  onCreate,
  onDelete,
  onLeave,
  onMove,
  onOpen,
  onRegenerateCode,
  onRemoveMember,
  onRename,
  onToggleDetails,
  onTransferOwnership,
  sections,
}: ShoppingListsManagerProps) {
  return (
    <section className={styles.developerPanel} aria-label="Listas disponibles">
      <div className={styles.developerPanelHeader}>
        <h3>Listas</h3>
        <span className={styles.developerStatusSuccess}>{lists.length}</span>
      </div>
      {lists.length > 0 ? (
        <ul className={styles.shoppingListManager}>
          {lists.map((list, listIndex) => {
            const isOwner = list.currentRole === "owner";
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
            const isExpanded = expandedListIds.includes(list.id);

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
                      onBlur={(event) => onRename(list.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      disabled={isActionPending}
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
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onToggleDetails(list.id)}
                    disabled={isActionPending}
                  >
                    {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onOpen(listSection?.id)}
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
                      {(membersByListId[list.id] ?? []).map((member) => (
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
                                onPointerDown={onButtonPointerDown}
                                onClick={() =>
                                  onTransferOwnership(list, member)
                                }
                                disabled={isActionPending}
                              >
                                Transferir
                              </button>
                              <button
                                className={styles.authButton}
                                type="button"
                                onPointerDown={onButtonPointerDown}
                                onClick={() => onRemoveMember(list, member)}
                                disabled={isActionPending}
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
                          onPointerDown={onButtonPointerDown}
                          onClick={() => onMove(list.id, -1)}
                          disabled={isActionPending || listIndex === 0}
                        >
                          <Icon name="arrowUp" />
                        </button>
                        <button
                          className={styles.iconButton}
                          type="button"
                          aria-label={`Bajar ${list.name}`}
                          title="Bajar"
                          onPointerDown={onButtonPointerDown}
                          onClick={() => onMove(list.id, 1)}
                          disabled={
                            isActionPending || listIndex === lists.length - 1
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
                              onPointerDown={onButtonPointerDown}
                              onClick={() =>
                                onColorChange(listSection.id, color)
                              }
                              disabled={isActionPending}
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
                              onPointerDown={onButtonPointerDown}
                              onClick={() => onRegenerateCode(list.id)}
                              disabled={isActionPending}
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
                          onPointerDown={onButtonPointerDown}
                          onClick={() => onDelete(list)}
                          disabled={isActionPending}
                        >
                          <Icon name="trash" /> Borrar lista
                        </button>
                      ) : (
                        <button
                          className={styles.dangerButton}
                          type="button"
                          onPointerDown={onButtonPointerDown}
                          onClick={() => onLeave(list.id)}
                          disabled={isActionPending}
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
            onPointerDown={onButtonPointerDown}
            onClick={onCreate}
          >
            Nueva lista
          </button>
        </div>
      )}
      {message ? (
        <p className={styles.authMessage} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
