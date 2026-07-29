import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rows = [
    {
      id: "list-1",
      name: "Casa",
      owner_id: "user-1",
      join_code: "AB12CD34",
      owner_email: "rafa@example.com",
      created_at: "2026-07-27T12:00:00.000Z",
      updated_at: "2026-07-27T12:00:00.000Z",
      member_count: 0,
      product_count: 0,
      membership_role: "owner",
    },
  ];
  const single = vi.fn();
  const order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const client = { from, rpc };

  return {
    client,
    createClient: vi.fn(() => client),
    from,
    order,
    rpc,
    select,
    single,
    rows,
    reset() {
      from.mockClear();
      order.mockClear();
      rpc.mockReset();
      select.mockClear();
      single.mockReset();
      order.mockImplementation(() =>
        Promise.resolve({ data: rows, error: null }),
      );
    },
  };
});

const configMock = vi.hoisted(() => ({
  getSupabaseConfig: vi.fn(() => ({
    anonKey: "anon-key",
    listId: "list-1",
    url: "https://example.supabase.co",
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("./supabaseConfig", () => configMock);

import {
  createShoppingList,
  deleteShoppingList,
  getShoppingListMembers,
  getShoppingLists,
  joinShoppingList,
  leaveShoppingList,
  moveShoppingList,
  removeShoppingListMember,
  renameShoppingList,
  regenerateShoppingListCode,
  transferShoppingListOwnership,
} from "./shoppingLists";

describe("shoppingLists", () => {
  beforeEach(() => {
    mocks.reset();
    configMock.getSupabaseConfig.mockReturnValue({
      anonKey: "anon-key",
      listId: "list-1",
      url: "https://example.supabase.co",
    });
  });

  it("loads and maps the authenticated user's lists", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: mocks.rows, error: null });

    await expect(getShoppingLists()).resolves.toEqual([
      {
        createdAt: "2026-07-27T12:00:00.000Z",
        id: "list-1",
        joinCode: "AB12CD34",
        name: "Casa",
        ownerId: "user-1",
        ownerEmail: "rafa@example.com",
        memberCount: 0,
        productCount: 0,
        currentRole: "owner",
        updatedAt: "2026-07-27T12:00:00.000Z",
      },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_shopping_lists_for_user");
  });

  it("uses the list RPCs for create, join, regenerate, and leave", async () => {
    mocks.single
      .mockResolvedValueOnce({ data: mocks.rows[0], error: null })
      .mockResolvedValueOnce({ data: mocks.rows[0], error: null })
      .mockResolvedValueOnce({ data: mocks.rows[0], error: null });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "leave_shopping_list") {
        return Promise.resolve({ error: null });
      }

      if (name === "get_shopping_lists_for_user") {
        return Promise.resolve({ data: mocks.rows, error: null });
      }

      return { single: mocks.single };
    });

    await expect(createShoppingList(" Casa ")).resolves.toMatchObject({
      id: "list-1",
      name: "Casa",
    });
    await expect(joinShoppingList(" ab12cd34 ")).resolves.toMatchObject({
      joinCode: "AB12CD34",
    });
    await expect(regenerateShoppingListCode("list-1")).resolves.toMatchObject({
      id: "list-1",
    });
    await expect(
      renameShoppingList("list-1", "Nueva casa"),
    ).resolves.toBeUndefined();
    await expect(moveShoppingList("list-1", 1)).resolves.toBeUndefined();
    await expect(leaveShoppingList("list-1")).resolves.toBeUndefined();
    await expect(deleteShoppingList("list-1")).resolves.toBeUndefined();

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "create_shopping_list", {
      p_name: "Casa",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "join_shopping_list_by_code", {
      p_join_code: "ab12cd34",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      3,
      "regenerate_shopping_list_code",
      {
        p_list_id: "list-1",
      },
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(4, "get_shopping_lists_for_user");
    expect(mocks.rpc).toHaveBeenNthCalledWith(5, "rename_shopping_list", {
      p_list_id: "list-1",
      p_name: "Nueva casa",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(6, "move_shopping_list", {
      p_list_id: "list-1",
      p_direction: 1,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(7, "leave_shopping_list", {
      p_list_id: "list-1",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(8, "delete_shopping_list", {
      p_list_id: "list-1",
    });
  });

  it("loads and manages list members through protected RPCs", async () => {
    const memberRows = [
      {
        user_id: "user-1",
        email: "rafa@example.com",
        display_name: "Rafa",
        role: "owner",
        joined_at: "2026-07-27T12:00:00.000Z",
      },
      {
        user_id: "user-2",
        email: "bego@example.com",
        display_name: "Begoña",
        role: "member",
        joined_at: "2026-07-27T12:01:00.000Z",
      },
    ];
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "get_shopping_list_members") {
        return Promise.resolve({ data: memberRows, error: null });
      }

      return Promise.resolve({ error: null });
    });

    await expect(getShoppingListMembers("list-1")).resolves.toEqual([
      {
        userId: "user-1",
        email: "rafa@example.com",
        displayName: "Rafa",
        role: "owner",
        joinedAt: "2026-07-27T12:00:00.000Z",
      },
      {
        userId: "user-2",
        email: "bego@example.com",
        displayName: "Begoña",
        role: "member",
        joinedAt: "2026-07-27T12:01:00.000Z",
      },
    ]);
    await expect(
      removeShoppingListMember("list-1", "user-2"),
    ).resolves.toBeUndefined();
    await expect(
      transferShoppingListOwnership("list-1", "user-2"),
    ).resolves.toBeUndefined();

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "get_shopping_list_members", {
      p_list_id: "list-1",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "remove_shopping_list_member",
      {
        p_list_id: "list-1",
        p_user_id: "user-2",
      },
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      3,
      "transfer_shopping_list_ownership",
      {
        p_list_id: "list-1",
        p_new_owner_id: "user-2",
      },
    );
  });

  it("reports when list management is not configured", async () => {
    configMock.getSupabaseConfig.mockReturnValue(null as never);

    await expect(getShoppingLists()).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(createShoppingList("Casa")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(joinShoppingList("AB12CD34")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(regenerateShoppingListCode("list-1")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(getShoppingListMembers("list-1")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(moveShoppingList("list-1", 1)).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(deleteShoppingList("list-1")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(removeShoppingListMember("list-1", "user-2")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );
    await expect(
      transferShoppingListOwnership("list-1", "user-2"),
    ).rejects.toThrow("La gestión de listas no está configurada.");
    await expect(leaveShoppingList("list-1")).rejects.toThrow(
      "La gestión de listas no está configurada.",
    );

    configMock.getSupabaseConfig.mockReturnValue({
      anonKey: "anon-key",
      listId: "list-1",
      url: "https://example.supabase.co",
    });
  });

  it("propagates list query and RPC errors", async () => {
    const error = new Error("remote error");
    mocks.rpc.mockResolvedValueOnce({
      data: null as never,
      error: error as never,
    });
    await expect(getShoppingLists()).rejects.toThrow("remote error");

    mocks.single
      .mockResolvedValueOnce({ data: null as never, error: error as never })
      .mockResolvedValueOnce({ data: null as never, error: error as never })
      .mockResolvedValueOnce({ data: null as never, error: error as never });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "leave_shopping_list") {
        return Promise.resolve({ error });
      }

      if (name === "get_shopping_lists_for_user") {
        return Promise.resolve({ data: null as never, error });
      }

      return { single: mocks.single };
    });

    await expect(createShoppingList("Casa")).rejects.toThrow("remote error");
    await expect(joinShoppingList("AB12CD34")).rejects.toThrow("remote error");
    await expect(regenerateShoppingListCode("list-1")).rejects.toThrow(
      "remote error",
    );
    await expect(leaveShoppingList("list-1")).rejects.toThrow("remote error");

    mocks.rpc.mockImplementation((name: string) => {
      if (name === "get_shopping_list_members") {
        return Promise.resolve({ data: null as never, error });
      }

      return Promise.resolve({ error });
    });
    await expect(moveShoppingList("list-1", 1)).rejects.toThrow("remote error");
    await expect(deleteShoppingList("list-1")).rejects.toThrow("remote error");
    await expect(getShoppingListMembers("list-1")).rejects.toThrow(
      "remote error",
    );
    await expect(removeShoppingListMember("list-1", "user-2")).rejects.toThrow(
      "remote error",
    );
    await expect(
      transferShoppingListOwnership("list-1", "user-2"),
    ).rejects.toThrow("remote error");
  });
});
