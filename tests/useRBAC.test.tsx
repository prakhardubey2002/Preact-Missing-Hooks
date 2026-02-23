/** @jsx h */
import { h } from "preact";
import { useRef } from "preact/hooks";
import { render, fireEvent, waitFor } from "@testing-library/preact";
import { useRBAC } from "../src/useRBAC";
import { vi } from "vitest";

const STORAGE_KEY = "rbac-test-user";
const ROLE_DEFS = [
  { role: "admin", condition: (u: Record<string, unknown> | null) => u?.role === "admin" },
  { role: "editor", condition: (u: Record<string, unknown> | null) => u?.role === "editor" || u?.role === "admin" },
  { role: "viewer", condition: (u: Record<string, unknown> | null) => !!u?.id },
];
const ROLE_CAPS: Record<string, string[]> = {
  admin: ["*"],
  editor: ["posts:edit", "posts:create", "posts:read"],
  viewer: ["posts:read"],
};

describe("useRBAC", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("returns isReady, user, roles, capabilities, hasRole, can, refetch", async () => {
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "localStorage", key: STORAGE_KEY },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "ready" }, String(rbac.isReady)),
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
        h("span", { "data-testid": "caps" }, rbac.capabilities.join(",")),
        h("button", { onClick: rbac.refetch }, "Refetch"),
      );
    }
    const { getByTestId, getByText } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
    expect(getByTestId("roles").textContent).toBe("");
    expect(getByTestId("caps").textContent).toBe("");
    fireEvent.click(getByText("Refetch"));
    await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  });

  it("derives roles and capabilities from localStorage user", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: "editor" }));
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "localStorage", key: STORAGE_KEY },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
        h("span", { "data-testid": "caps" }, rbac.capabilities.sort().join(",")),
        h("span", { "data-testid": "has-editor" }, String(rbac.hasRole("editor"))),
        h("span", { "data-testid": "can-edit" }, String(rbac.can("posts:edit"))),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("roles").textContent).toContain("editor"));
    expect(getByTestId("roles").textContent).toContain("viewer");
    expect(getByTestId("caps").textContent).toContain("posts:edit");
    expect(getByTestId("has-editor").textContent).toBe("true");
    expect(getByTestId("can-edit").textContent).toBe("true");
  });

  it("admin gets wildcard capability", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: "admin" }));
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "localStorage", key: STORAGE_KEY },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "can-any" }, String(rbac.can("anything:foo"))),
        h("span", { "data-testid": "has-admin" }, String(rbac.hasRole("admin"))),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("has-admin").textContent).toBe("true"));
    expect(getByTestId("can-any").textContent).toBe("true");
  });

  it("sessionStorage source works", async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 2, role: "viewer" }));
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "sessionStorage", key: STORAGE_KEY },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
        h("span", { "data-testid": "can-read" }, String(rbac.can("posts:read"))),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("roles").textContent).toContain("viewer"));
    expect(getByTestId("can-read").textContent).toBe("true");
  });

  it("memory source works", async () => {
    const user = { id: 3, role: "editor" };
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "memory", getUser: () => user },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
        h("span", { "data-testid": "can-create" }, String(rbac.can("posts:create"))),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("roles").textContent).toContain("editor"));
    expect(getByTestId("can-create").textContent).toBe("true");
  });

  it("custom source with explicit roles and capabilities", async () => {
    function TestComponent() {
      const rbac = useRBAC({
        userSource: {
          type: "custom",
          getAuth: () => ({
            user: { id: 1 },
            roles: ["custom-role"],
            capabilities: ["custom:read", "custom:write"],
          }),
        },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
        h("span", { "data-testid": "caps" }, rbac.capabilities.join(",")),
        h("span", { "data-testid": "can-write" }, String(rbac.can("custom:write"))),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("roles").textContent).toBe("custom-role"));
    expect(getByTestId("caps").textContent).toContain("custom:write");
    expect(getByTestId("can-write").textContent).toBe("true");
  });

  it("setUserInStorage updates localStorage and refetches when key matches", async () => {
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "localStorage", key: STORAGE_KEY },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
        h("button", {
          onClick: () => rbac.setUserInStorage({ id: 1, role: "editor" }, "localStorage", STORAGE_KEY),
        }, "Login as editor"),
        h("button", { onClick: () => rbac.setUserInStorage(null, "localStorage", STORAGE_KEY) }, "Logout"),
      );
    }
    const { getByTestId, getByText } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("roles").textContent).toBe(""));
    fireEvent.click(getByText("Login as editor"));
    await waitFor(() => expect(getByTestId("roles").textContent).toContain("editor"));
    fireEvent.click(getByText("Logout"));
    await waitFor(() => expect(getByTestId("roles").textContent).toBe(""));
  });

  it("api source and error handling", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "api", fetch: fetchMock },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
      });
      return h("div", {},
        h("span", { "data-testid": "ready" }, String(rbac.isReady)),
        h("span", { "data-testid": "error" }, rbac.error?.message ?? ""),
        h("span", { "data-testid": "roles" }, rbac.roles.join(",")),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
    expect(getByTestId("error").textContent).toBe("Network error");
    expect(getByTestId("roles").textContent).toBe("");
  });

  it("capabilitiesOverride from localStorage overrides role-derived capabilities", async () => {
    const capsKey = "rbac-caps";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 1, role: "viewer" }));
    localStorage.setItem(capsKey, JSON.stringify(["posts:read", "posts:edit"]));
    function TestComponent() {
      const rbac = useRBAC({
        userSource: { type: "localStorage", key: STORAGE_KEY },
        roleDefinitions: ROLE_DEFS,
        roleCapabilities: ROLE_CAPS,
        capabilitiesOverride: { type: "localStorage", key: capsKey },
      });
      return h("div", {},
        h("span", { "data-testid": "can-edit" }, String(rbac.can("posts:edit"))),
      );
    }
    const { getByTestId } = render(h(TestComponent));
    await waitFor(() => expect(getByTestId("can-edit").textContent).toBe("true"));
  });
});
