import type { Page, Route } from "@playwright/test";

const supabaseUrl = "http://127.0.0.1:54321";
const listId = "10000000-0000-4000-8000-000000000001";
const now = "2026-10-28T00:00:00.000Z";

type Row = Record<string, unknown>;
type TestDatabase = {
  history: Row[];
  items: Row[];
  lists: Row[];
  sections: Row[];
  nextListId: number;
};

const user = {
  id: "e2e-user-0001",
  aud: "authenticated",
  role: "authenticated",
  email: "e2e@example.invalid",
  created_at: now,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
};

function createDatabase(): TestDatabase {
  const sectionNames = [
    ["mercadona", "Mercadona", "mint"],
    ["farmacia", "Farmacia", "violet"],
    ["alcampo", "Alcampo", "blue"],
    ["dia", "Día", "rose"],
    ["general", "General", "slate"],
  ];

  return {
    history: [],
    items: [],
    lists: [
      {
        id: listId,
        name: "General",
        owner_id: user.id,
        join_code: "E2E0000",
        owner_email: user.email,
        member_count: 1,
        product_count: 0,
        membership_role: "owner",
        created_at: now,
        updated_at: now,
      },
    ],
    sections: sectionNames.map(([id, name, color], position) => ({
      id,
      list_id: listId,
      name,
      color,
      position,
      created_at: now,
      updated_at: now,
    })),
    nextListId: 1,
  };
}

function jsonResponse(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function requestBody(route: Route): Row {
  const body: unknown = route.request().postDataJSON();
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Row)
    : {};
}

function matchesFilters(row: Row, searchParams: URLSearchParams) {
  for (const [key, value] of searchParams) {
    if (["select", "order", "limit", "offset"].includes(key)) {
      continue;
    }

    if (value.startsWith("eq.") && String(row[key]) !== value.slice(3)) {
      return false;
    }
  }

  return true;
}

function orderRows(rows: Row[], searchParams: URLSearchParams) {
  const order = searchParams.get("order");

  if (!order) {
    return rows;
  }

  const [field, direction] = order.split(".");
  const sign = direction === "desc" ? -1 : 1;

  return [...rows].sort((first, second) => {
    const firstValue = first[field];
    const secondValue = second[field];

    if (firstValue === secondValue) {
      return 0;
    }

    return (
      String(firstValue ?? "").localeCompare(String(secondValue ?? "")) * sign
    );
  });
}

function updateListName(database: TestDatabase, listId: string, name: string) {
  const list = database.lists.find((entry) => entry.id === listId);

  if (list) {
    list.name = name;
    list.updated_at = now;
  }

  const section = database.sections.find(
    (entry) => entry.list_id === listId && entry.id === "general",
  );

  if (section) {
    section.name = name;
    section.updated_at = now;
  }
}

async function handleRpc(
  route: Route,
  database: TestDatabase,
  functionName: string,
) {
  const body = requestBody(route);

  switch (functionName) {
    case "get_shopping_lists_for_user":
      return jsonResponse(route, 200, database.lists);
    case "get_shopping_list_members":
      return jsonResponse(route, 200, []);
    case "create_shopping_list": {
      const newId = `00000000-0000-4000-8000-${String(database.nextListId).padStart(12, "0")}`;
      database.nextListId += 1;
      const name = String(body.p_name ?? "Nueva lista");
      const list = {
        id: newId,
        name,
        owner_id: user.id,
        join_code: `E2E${String(database.nextListId).padStart(4, "0")}`,
        owner_email: user.email,
        member_count: 1,
        product_count: 0,
        membership_role: "owner",
        created_at: now,
        updated_at: now,
      };
      database.lists.push(list);
      return jsonResponse(route, 200, list);
    }
    case "rename_shopping_list":
      updateListName(
        database,
        String(body.p_list_id),
        String(body.p_name ?? ""),
      );
      return route.fulfill({ status: 204, body: "" });
    case "move_shopping_list": {
      const from = database.lists.findIndex(
        (entry) => entry.id === body.p_list_id,
      );
      const direction = Number(body.p_direction);
      const to = from + direction;

      if (from >= 0 && to >= 0 && to < database.lists.length) {
        const [list] = database.lists.splice(from, 1);
        if (list) {
          database.lists.splice(to, 0, list);
        }
      }

      return route.fulfill({ status: 204, body: "" });
    }
    case "apply_shopping_item_mutations": {
      const mutations = Array.isArray(body.p_mutations)
        ? (body.p_mutations as Row[])
        : [];

      for (const mutation of mutations) {
        const item = mutation.item;
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          continue;
        }

        const itemRow = item as Row;
        const index = database.items.findIndex(
          (entry) => entry.id === itemRow.id,
        );

        if (mutation.action === "delete") {
          if (index >= 0) {
            database.items.splice(index, 1);
          }
        } else if (index >= 0) {
          database.items[index] = itemRow;
        } else {
          database.items.push(itemRow);
        }

        const historyEvent = mutation.history_event;
        if (typeof historyEvent === "object" && historyEvent !== null) {
          const eventRow = historyEvent as Row;
          if (!database.history.some((entry) => entry.id === eventRow.id)) {
            database.history.push(eventRow);
          }
        }
      }

      return route.fulfill({ status: 204, body: "" });
    }
    default:
      return jsonResponse(route, 404, {
        message: `RPC no configurada: ${functionName}`,
      });
  }
}

export async function installSupabaseMock(page: Page) {
  const database = createDatabase();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const session = {
    access_token: "e2e-access-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: "e2e-refresh-token",
    user,
  };

  for (const apiPath of ["auth/v1", "rest/v1"]) {
    await page.route(`**/${apiPath}/**`, async (route) => {
      const url = new URL(route.request().url());

      if (url.origin === supabaseUrl) {
        return route.fallback();
      }

      return route.fulfill({
        status: 403,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          message: "E2E bloqueó una petición Supabase fuera del mock local.",
        }),
      });
    });
  }

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === "/auth/v1/token" && method === "POST") {
      return jsonResponse(route, 200, session);
    }

    if (url.pathname === "/auth/v1/user" && method === "GET") {
      return jsonResponse(route, 200, user);
    }

    if (url.pathname.startsWith("/auth/v1/")) {
      return route.fulfill({ status: 204, body: "" });
    }

    if (!url.pathname.startsWith("/rest/v1/")) {
      return jsonResponse(route, 404, { message: "Ruta E2E no configurada" });
    }

    const resource = url.pathname.slice("/rest/v1/".length);
    if (resource.startsWith("rpc/")) {
      return handleRpc(route, database, resource.slice("rpc/".length));
    }

    const table = resource.split("/")[0] ?? "";
    const tableRows =
      table === "shopping_items"
        ? database.items
        : table === "shopping_sections"
          ? database.sections
          : table === "shopping_history_events"
            ? database.history
            : [];

    if (method === "GET") {
      let rows = orderRows(
        tableRows.filter((row) => matchesFilters(row, url.searchParams)),
        url.searchParams,
      );
      const limit = Number(url.searchParams.get("limit"));
      if (Number.isInteger(limit) && limit > 0) {
        rows = rows.slice(0, limit);
      }

      return jsonResponse(route, 200, rows);
    }

    if (method === "POST") {
      const body: unknown = request.postDataJSON();
      const rows = Array.isArray(body) ? (body as Row[]) : [body as Row];
      tableRows.push(...rows);
      return route.fulfill({ status: 201, body: "" });
    }

    if (method === "PATCH") {
      const updates = requestBody(route);
      const matchingRows = tableRows.filter((row) =>
        matchesFilters(row, url.searchParams),
      );
      for (const row of matchingRows) {
        Object.assign(row, updates);
      }
      return route.fulfill({ status: 204, body: "" });
    }

    if (method === "DELETE") {
      const retainedRows = tableRows.filter(
        (row) => !matchesFilters(row, url.searchParams),
      );
      tableRows.splice(0, tableRows.length, ...retainedRows);
      return route.fulfill({ status: 204, body: "" });
    }

    return jsonResponse(route, 405, {
      message: `Método no admitido: ${method}`,
    });
  });
}
