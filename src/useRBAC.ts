import { useCallback, useEffect, useRef, useState } from "preact/hooks";

/** Flexible user object; your app can use any shape. */
export type RBACUser = Record<string, unknown>;

/** Get auth state (user + optional roles/capabilities). Used by custom source. */
export interface RBACAuthState {
  user?: RBACUser | null;
  roles?: string[];
  capabilities?: string[];
}

/** Pluggable source for current user (and optionally roles/capabilities). */
export type RBACUserSource =
  | { type: "localStorage"; key: string }
  | { type: "sessionStorage"; key: string }
  | { type: "api"; fetch: () => Promise<RBACUser> }
  | { type: "memory"; getUser: () => RBACUser | null }
  | { type: "custom"; getAuth: () => RBACAuthState | Promise<RBACAuthState> };

/** Role definition: name + condition to grant this role based on user. */
export interface RBACRoleDefinition {
  role: string;
  condition: (user: RBACUser | null) => boolean;
}

/** Role name -> list of capability strings. Use '*' for full access. */
export type RBACRoleCapabilities = Record<string, string[]>;

/** Optional override: get capabilities directly (e.g. from API) instead of deriving from roles. */
export type RBACCapabilitiesOverride =
  | { type: "localStorage"; key: string }
  | { type: "sessionStorage"; key: string }
  | { type: "api"; fetch: () => Promise<string[]> };

export interface UseRBACOptions {
  /** Where to get the current user (and optionally roles/capabilities if type is 'custom'). */
  userSource: RBACUserSource;
  /** Role definitions: each role has a condition(user) to determine if the user has that role. */
  roleDefinitions: RBACRoleDefinition[];
  /** Capabilities per role. User gets union of capabilities for all their roles. Use '*' for admin. */
  roleCapabilities: RBACRoleCapabilities;
  /** Optional: fetch capabilities directly (overrides role-derived capabilities when provided). */
  capabilitiesOverride?: RBACCapabilitiesOverride;
}

export interface UseRBACReturn {
  /** Current user from source, or null. */
  user: RBACUser | null;
  /** Resolved roles for the current user. */
  roles: string[];
  /** Resolved capabilities (union of role capabilities, or from override). */
  capabilities: string[];
  /** True when user/roles/capabilities have been resolved (or failed). */
  isReady: boolean;
  /** Error from source (e.g. API or parse). */
  error: Error | null;
  /** Check if the user has the given role. */
  hasRole: (role: string) => boolean;
  /** Check if the user has the given capability (or '*' ). */
  hasCapability: (capability: string) => boolean;
  /** Alias for hasCapability. */
  can: (capability: string) => boolean;
  /** Re-fetch user/roles/capabilities from source. */
  refetch: () => Promise<void>;
  /** Helpers to persist auth to storage (for frontend-only flows). */
  setUserInStorage: (user: RBACUser | null, storage: "localStorage" | "sessionStorage", key: string) => void;
  setRolesInStorage: (roles: string[], storage: "localStorage" | "sessionStorage", key: string) => void;
  setCapabilitiesInStorage: (capabilities: string[], storage: "localStorage" | "sessionStorage", key: string) => void;
}

const WILDCARD = "*";

function parseUserFromStorage(
  type: "localStorage" | "sessionStorage",
  key: string
): RBACUser | null {
  if (typeof window === "undefined") return null;
  const storage = type === "localStorage" ? window.localStorage : window.sessionStorage;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return null;
    const data = JSON.parse(raw) as unknown;
    return data && typeof data === "object" ? (data as RBACUser) : null;
  } catch {
    return null;
  }
}

function parseCapabilitiesFromStorage(
  type: "localStorage" | "sessionStorage",
  key: string
): string[] {
  if (typeof window === "undefined") return [];
  const storage = type === "localStorage" ? window.localStorage : window.sessionStorage;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return [];
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function computeRoles(
  user: RBACUser | null,
  roleDefinitions: RBACRoleDefinition[]
): string[] {
  return roleDefinitions
    .filter((def) => def.condition(user))
    .map((def) => def.role);
}

function computeCapabilitiesFromRoles(
  roles: string[],
  roleCapabilities: RBACRoleCapabilities
): string[] {
  const set = new Set<string>();
  for (const role of roles) {
    const caps = roleCapabilities[role];
    if (Array.isArray(caps)) {
      for (const c of caps) set.add(c);
    }
  }
  return Array.from(set);
}

function hasCapabilityImpl(capabilities: string[], capability: string): boolean {
  if (capabilities.includes(WILDCARD)) return true;
  return capabilities.includes(capability);
}

/**
 * Frontend-only role-based access control hook. Define roles with conditions,
 * assign capabilities per role, and plug in user source (localStorage, sessionStorage, API, or custom).
 * Supports full flexibility: frontend-only with storage or pluggable API.
 *
 * @param options - userSource, roleDefinitions, roleCapabilities, optional capabilitiesOverride
 * @returns user, roles, capabilities, hasRole, hasCapability, can, isReady, error, refetch, and storage helpers
 *
 * @example
 * ```tsx
 * const { hasRole, can, roles, setUserInStorage } = useRBAC({
 *   userSource: { type: 'localStorage', key: 'user' },
 *   roleDefinitions: [
 *     { role: 'admin', condition: (u) => u?.role === 'admin' },
 *     { role: 'editor', condition: (u) => u?.role === 'editor' || u?.role === 'admin' },
 *   ],
 *   roleCapabilities: {
 *     admin: ['*'],
 *     editor: ['posts:edit', 'posts:create'],
 *   },
 * });
 * if (can('posts:edit')) { ... }
 * ```
 */
export function useRBAC(options: UseRBACOptions): UseRBACReturn {
  const { userSource } = options;

  const optsRef = useRef(options);
  optsRef.current = options;

  const [user, setUser] = useState<RBACUser | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const resolveAuth = useCallback(async () => {
    const { userSource: us, roleDefinitions: rdefs, roleCapabilities: rcaps, capabilitiesOverride: capOver } = optsRef.current;
    setError(null);
    let resolvedUser: RBACUser | null = null;
    let resolvedRoles: string[] = [];
    let resolvedCapabilities: string[] = [];

    try {
      if (us.type === "localStorage") {
        resolvedUser = parseUserFromStorage("localStorage", us.key);
        resolvedRoles = computeRoles(resolvedUser, rdefs);
        resolvedCapabilities = computeCapabilitiesFromRoles(resolvedRoles, rcaps);
      } else if (us.type === "sessionStorage") {
        resolvedUser = parseUserFromStorage("sessionStorage", us.key);
        resolvedRoles = computeRoles(resolvedUser, rdefs);
        resolvedCapabilities = computeCapabilitiesFromRoles(resolvedRoles, rcaps);
      } else if (us.type === "api") {
        resolvedUser = await us.fetch();
        resolvedRoles = computeRoles(resolvedUser, rdefs);
        resolvedCapabilities = computeCapabilitiesFromRoles(resolvedRoles, rcaps);
      } else if (us.type === "memory") {
        resolvedUser = us.getUser();
        resolvedRoles = computeRoles(resolvedUser, rdefs);
        resolvedCapabilities = computeCapabilitiesFromRoles(resolvedRoles, rcaps);
      } else if (us.type === "custom") {
        const auth = await Promise.resolve(us.getAuth());
        resolvedUser = auth.user ?? null;
        resolvedRoles = auth.roles ?? computeRoles(resolvedUser, rdefs);
        resolvedCapabilities =
          auth.capabilities ??
          computeCapabilitiesFromRoles(resolvedRoles, rcaps);
      }

      if (capOver) {
        if (capOver.type === "localStorage") {
          const override = parseCapabilitiesFromStorage("localStorage", capOver.key);
          if (override.length > 0) resolvedCapabilities = override;
        } else if (capOver.type === "sessionStorage") {
          const override = parseCapabilitiesFromStorage("sessionStorage", capOver.key);
          if (override.length > 0) resolvedCapabilities = override;
        } else if (capOver.type === "api") {
          const override = await capOver.fetch();
          resolvedCapabilities = override;
        }
      }

      setUser(resolvedUser);
      setRoles(resolvedRoles);
      setCapabilities(resolvedCapabilities);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setUser(null);
      setRoles([]);
      setCapabilities([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    resolveAuth();
  }, [resolveAuth]);

  // Listen to storage events when using localStorage/sessionStorage so we refetch when another tab changes data
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key =
      userSource.type === "localStorage" || userSource.type === "sessionStorage"
        ? userSource.key
        : null;
    if (!key) return;
    const handler = (e: StorageEvent) => {
      if (e.key === key) void resolveAuth();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [userSource.type, userSource.type === "localStorage" || userSource.type === "sessionStorage" ? (userSource as { key: string }).key : "", resolveAuth]);

  const hasRole = useCallback(
    (role: string) => roles.includes(role),
    [roles]
  );

  const hasCapability = useCallback(
    (capability: string) => hasCapabilityImpl(capabilities, capability),
    [capabilities]
  );

  const can = hasCapability;

  const refetch = useCallback(() => resolveAuth(), [resolveAuth]);

  const setUserInStorage = useCallback(
    (newUser: RBACUser | null, storage: "localStorage" | "sessionStorage", key: string) => {
      if (typeof window === "undefined") return;
      const s = storage === "localStorage" ? window.localStorage : window.sessionStorage;
      if (newUser == null) s.removeItem(key);
      else s.setItem(key, JSON.stringify(newUser));
      if (
        (userSource.type === "localStorage" && storage === "localStorage" && userSource.key === key) ||
        (userSource.type === "sessionStorage" && storage === "sessionStorage" && userSource.key === key)
      ) {
        void resolveAuth();
      }
    },
    [userSource, resolveAuth]
  );

  const setRolesInStorage = useCallback(
    (newRoles: string[], storage: "localStorage" | "sessionStorage", key: string) => {
      if (typeof window === "undefined") return;
      const s = storage === "localStorage" ? window.localStorage : window.sessionStorage;
      s.setItem(key, JSON.stringify(newRoles));
    },
    []
  );

  const setCapabilitiesInStorage = useCallback(
    (newCaps: string[], storage: "localStorage" | "sessionStorage", key: string) => {
      if (typeof window === "undefined") return;
      const s = storage === "localStorage" ? window.localStorage : window.sessionStorage;
      s.setItem(key, JSON.stringify(newCaps));
    },
    []
  );

  return {
    user,
    roles,
    capabilities,
    isReady,
    error,
    hasRole,
    hasCapability,
    can,
    refetch,
    setUserInStorage,
    setRolesInStorage,
    setCapabilitiesInStorage,
  };
}
