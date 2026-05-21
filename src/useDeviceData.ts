import { useCallback, useEffect, useState } from "preact/hooks";

/** Parsed Client Hints from `navigator.userAgentData` when available */
export interface UserAgentDataInfo {
  mobile: boolean;
  platform: string;
  brands: ReadonlyArray<{ brand: string; version: string }>;
}

/** Screen and display metrics from `screen` and `window` */
export interface DeviceScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelRatio: number;
}

/** Viewport size (`window.innerWidth` / `innerHeight`) */
export interface DeviceViewportInfo {
  width: number;
  height: number;
}

/** Battery status from the Battery Status API when available */
export interface DeviceBatteryInfo {
  charging: boolean;
  level: number;
}

/** Snapshot of device / browser data from native Navigator and related APIs */
export interface DeviceData {
  userAgent: string;
  language: string;
  languages: readonly string[];
  platform: string;
  cookieEnabled: boolean;
  online: boolean;
  hardwareConcurrency?: number;
  /** Approximate device RAM in GB (Chrome / some browsers only) */
  deviceMemory?: number;
  maxTouchPoints: number;
  vendor: string;
  touch: boolean;
  screen: DeviceScreenInfo;
  viewport: DeviceViewportInfo;
  userAgentData?: UserAgentDataInfo;
  reducedMotion: boolean;
  colorScheme: "light" | "dark" | "no-preference";
  battery?: DeviceBatteryInfo;
}

export interface UseDeviceDataOptions {
  /** Fetch battery info when the Battery Status API exists (default: true) */
  includeBattery?: boolean;
  /** Battery refresh interval in ms (default: 60000) */
  batteryPollIntervalMs?: number;
}

interface NavigatorUAData {
  mobile?: boolean;
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
}

type NavigatorWithExtras = Navigator & {
  deviceMemory?: number;
  userAgentData?: NavigatorUAData;
};

const SSR_DEVICE_DATA: DeviceData = {
  userAgent: "",
  language: "en",
  languages: ["en"],
  platform: "",
  cookieEnabled: false,
  online: true,
  maxTouchPoints: 0,
  vendor: "",
  touch: false,
  screen: {
    width: 0,
    height: 0,
    availWidth: 0,
    availHeight: 0,
    colorDepth: 24,
    pixelRatio: 1,
  },
  viewport: { width: 0, height: 0 },
  reducedMotion: false,
  colorScheme: "no-preference",
};

function getColorScheme(): DeviceData["colorScheme"] {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "no-preference";
  }
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "no-preference";
}

function getReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reads synchronous device / browser data from Navigator, Screen, and matchMedia. */
export function getDeviceData(): DeviceData {
  if (typeof navigator === "undefined") {
    return SSR_DEVICE_DATA;
  }

  const nav = navigator as NavigatorWithExtras;
  const screen =
    typeof globalThis.screen !== "undefined" ? globalThis.screen : null;
  const win =
    typeof globalThis.window !== "undefined" ? globalThis.window : null;

  const data: DeviceData = {
    userAgent: nav.userAgent ?? "",
    language: nav.language ?? "",
    languages: nav.languages ? [...nav.languages] : [],
    platform: nav.platform ?? "",
    cookieEnabled: Boolean(nav.cookieEnabled),
    online: Boolean(nav.onLine),
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    vendor: nav.vendor ?? "",
    touch: (nav.maxTouchPoints ?? 0) > 0,
    screen: {
      width: screen?.width ?? 0,
      height: screen?.height ?? 0,
      availWidth: screen?.availWidth ?? 0,
      availHeight: screen?.availHeight ?? 0,
      colorDepth: screen?.colorDepth ?? 24,
      pixelRatio: win?.devicePixelRatio ?? 1,
    },
    viewport: {
      width: win?.innerWidth ?? 0,
      height: win?.innerHeight ?? 0,
    },
    reducedMotion: getReducedMotion(),
    colorScheme: getColorScheme(),
  };

  if (typeof nav.hardwareConcurrency === "number") {
    data.hardwareConcurrency = nav.hardwareConcurrency;
  }
  if (typeof nav.deviceMemory === "number") {
    data.deviceMemory = nav.deviceMemory;
  }

  const uaData = nav.userAgentData;
  if (uaData) {
    data.userAgentData = {
      mobile: Boolean(uaData.mobile),
      platform: uaData.platform ?? "",
      brands: uaData.brands ? [...uaData.brands] : [],
    };
  }

  return data;
}

async function readBattery(): Promise<DeviceBatteryInfo | undefined> {
  if (typeof navigator === "undefined") return undefined;
  const getBattery = (
    navigator as Navigator & {
      getBattery?: () => Promise<{
        charging: boolean;
        level: number;
      }>;
    }
  ).getBattery;
  if (!getBattery) return undefined;
  try {
    const battery = await getBattery.call(navigator);
    return { charging: battery.charging, level: battery.level };
  } catch {
    return undefined;
  }
}

/**
 * Extracts device and browser data from native Navigator, Screen, window, and
 * matchMedia APIs. Updates on resize, orientation, online/offline, and
 * prefers-color-scheme / prefers-reduced-motion changes. Optionally polls the
 * Battery Status API when available.
 *
 * @param options - `includeBattery` (default true), `batteryPollIntervalMs` (default 60000)
 * @returns Current {@link DeviceData} snapshot
 *
 * @example
 * ```tsx
 * function DevicePanel() {
 *   const device = useDeviceData();
 *   return (
 *     <dl>
 *       <dt>Language</dt><dd>{device.language}</dd>
 *       <dt>CPUs</dt><dd>{device.hardwareConcurrency ?? '—'}</dd>
 *       <dt>Viewport</dt><dd>{device.viewport.width}×{device.viewport.height}</dd>
 *       <dt>Theme</dt><dd>{device.colorScheme}</dd>
 *     </dl>
 *   );
 * }
 * ```
 */
export function useDeviceData(
  options: UseDeviceDataOptions = {},
): DeviceData {
  const { includeBattery = true, batteryPollIntervalMs = 60_000 } = options;

  const [data, setData] = useState<DeviceData>(() => getDeviceData());

  const refresh = useCallback(() => {
    setData((prev) => {
      const next = getDeviceData();
      return prev.battery ? { ...next, battery: prev.battery } : next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => refresh();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);

    const reducedMotionMq = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    );
    const darkMq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const lightMq = window.matchMedia?.("(prefers-color-scheme: light)");

    const onMediaChange = () => refresh();
    reducedMotionMq?.addEventListener?.("change", onMediaChange);
    darkMq?.addEventListener?.("change", onMediaChange);
    lightMq?.addEventListener?.("change", onMediaChange);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      reducedMotionMq?.removeEventListener?.("change", onMediaChange);
      darkMq?.removeEventListener?.("change", onMediaChange);
      lightMq?.removeEventListener?.("change", onMediaChange);
    };
  }, [refresh]);

  useEffect(() => {
    if (!includeBattery || typeof navigator === "undefined") return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const updateBattery = async () => {
      const battery = await readBattery();
      if (cancelled || battery === undefined) return;
      setData((prev) => ({ ...prev, battery }));
    };

    void updateBattery();
    if (batteryPollIntervalMs > 0) {
      intervalId = setInterval(() => void updateBattery(), batteryPollIntervalMs);
    }

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [includeBattery, batteryPollIntervalMs]);

  return data;
}
