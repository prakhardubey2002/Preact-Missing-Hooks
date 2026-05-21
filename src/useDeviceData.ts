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

/** Detected browser name and version */
export interface DeviceBrowserInfo {
  name: string;
  version: string;
}

/** Detected operating system name and version */
export interface DeviceOsInfo {
  name: string;
  version: string;
}

/** Snapshot of device / browser data from native Navigator and related APIs */
export interface DeviceData {
  userAgent: string;
  language: string;
  languages: readonly string[];
  platform: string;
  /** Detected browser (from Client Hints or user-agent parsing) */
  browser: DeviceBrowserInfo;
  /** Detected OS (from Client Hints or user-agent parsing) */
  os: DeviceOsInfo;
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
  /**
   * Request high-entropy Client Hints (`platformVersion`, `fullVersionList`)
   * when `navigator.userAgentData` supports it (default: true)
   */
  includeHighEntropy?: boolean;
}

interface NavigatorUAData {
  mobile?: boolean;
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
  getHighEntropyValues?: (
    hints: string[],
  ) => Promise<{
    platformVersion?: string;
    fullVersionList?: Array<{ brand: string; version: string }>;
  }>;
}

type NavigatorWithExtras = Navigator & {
  deviceMemory?: number;
  userAgentData?: NavigatorUAData;
};

const UNKNOWN_BROWSER: DeviceBrowserInfo = { name: "Unknown", version: "" };
const UNKNOWN_OS: DeviceOsInfo = { name: "Unknown", version: "" };

const SSR_DEVICE_DATA: DeviceData = {
  userAgent: "",
  language: "en",
  languages: ["en"],
  platform: "",
  browser: UNKNOWN_BROWSER,
  os: UNKNOWN_OS,
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

const NOT_A_BRAND = /not.?a.?brand/i;

/** Parse browser and OS from a user-agent string (sync fallback). */
export function parseUserAgent(userAgent: string): {
  browser: DeviceBrowserInfo;
  os: DeviceOsInfo;
} {
  const browser: DeviceBrowserInfo = { ...UNKNOWN_BROWSER };
  const os: DeviceOsInfo = { ...UNKNOWN_OS };

  if (!userAgent) {
    return { browser, os };
  }

  const win = userAgent.match(/Windows NT ([\d.]+)/);
  if (win) {
    os.name = "Windows";
    os.version = win[1];
  } else {
    const mac = userAgent.match(/Mac OS X ([\d._]+)/);
    if (mac) {
      os.name = "macOS";
      os.version = mac[1].replace(/_/g, ".");
    } else {
      const android = userAgent.match(/Android ([\d.]+)/);
      if (android) {
        os.name = "Android";
        os.version = android[1];
      } else {
        const ios = userAgent.match(/(?:iPhone OS|CPU OS) ([\d_]+)/);
        if (ios) {
          os.name = "iOS";
          os.version = ios[1].replace(/_/g, ".");
        } else if (/Linux/.test(userAgent)) {
          os.name = "Linux";
          const linux = userAgent.match(/Linux ([\d.]+)/);
          os.version = linux?.[1] ?? "";
        }
      }
    }
  }

  const edg = userAgent.match(/Edg(?:A|iOS)?\/([\d.]+)/);
  const opera = userAgent.match(/OPR\/([\d.]+)/);
  const firefox = userAgent.match(/Firefox\/([\d.]+)/);
  const safari =
    /Version\/([\d.]+)/.test(userAgent) &&
    /Safari/.test(userAgent) &&
    !/Chrome|Chromium|Edg|OPR/.test(userAgent)
      ? userAgent.match(/Version\/([\d.]+)/)
      : null;
  const chrome = userAgent.match(/Chrome\/([\d.]+)/);

  if (edg) {
    browser.name = "Edge";
    browser.version = edg[1];
  } else if (opera) {
    browser.name = "Opera";
    browser.version = opera[1];
  } else if (firefox) {
    browser.name = "Firefox";
    browser.version = firefox[1];
  } else if (safari) {
    browser.name = "Safari";
    browser.version = safari[1];
  } else if (chrome) {
    browser.name = "Chrome";
    browser.version = chrome[1];
  }

  return { browser, os };
}

function pickBrowserBrand(
  brands: Array<{ brand: string; version: string }>,
): DeviceBrowserInfo {
  const meaningful = brands.find((b) => !NOT_A_BRAND.test(b.brand));
  const pick = meaningful ?? brands[0];
  if (!pick) return { ...UNKNOWN_BROWSER };
  return { name: pick.brand, version: pick.version };
}

function mergeBrowserOsFromUaData(
  uaData: NavigatorUAData,
  fallback: { browser: DeviceBrowserInfo; os: DeviceOsInfo },
): { browser: DeviceBrowserInfo; os: DeviceOsInfo } {
  const browser = uaData.brands?.length
    ? pickBrowserBrand(uaData.brands)
    : { ...fallback.browser };
  const os: DeviceOsInfo = {
    name: uaData.platform?.trim() || fallback.os.name,
    version: fallback.os.version,
  };
  return { browser, os };
}

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

  const ua = nav.userAgent ?? "";
  const parsed = parseUserAgent(ua);
  const uaData = nav.userAgentData;
  const { browser, os } = uaData
    ? mergeBrowserOsFromUaData(uaData, parsed)
    : parsed;

  const data: DeviceData = {
    userAgent: ua,
    language: nav.language ?? "",
    languages: nav.languages ? [...nav.languages] : [],
    platform: nav.platform ?? "",
    browser,
    os,
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

  if (uaData) {
    data.userAgentData = {
      mobile: Boolean(uaData.mobile),
      platform: uaData.platform ?? "",
      brands: uaData.brands ? [...uaData.brands] : [],
    };
  }

  return data;
}

async function readHighEntropyBrowserOs(
  uaData: NavigatorUAData,
  current: { browser: DeviceBrowserInfo; os: DeviceOsInfo },
): Promise<{ browser: DeviceBrowserInfo; os: DeviceOsInfo } | undefined> {
  if (!uaData.getHighEntropyValues) return undefined;
  try {
    const hints = await uaData.getHighEntropyValues([
      "platformVersion",
      "fullVersionList",
    ]);
    const browser = hints.fullVersionList?.length
      ? pickBrowserBrand(hints.fullVersionList)
      : { ...current.browser };
    const os: DeviceOsInfo = {
      name: current.os.name,
      version: hints.platformVersion?.trim() || current.os.version,
    };
    return { browser, os };
  } catch {
    return undefined;
  }
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
 *       <dt>Browser</dt><dd>{device.browser.name} {device.browser.version}</dd>
 *       <dt>OS</dt><dd>{device.os.name} {device.os.version}</dd>
 *       <dt>Language</dt><dd>{device.language}</dd>
 *       <dt>Viewport</dt><dd>{device.viewport.width}×{device.viewport.height}</dd>
 *     </dl>
 *   );
 * }
 * ```
 */
export function useDeviceData(options: UseDeviceDataOptions = {}): DeviceData {
  const {
    includeBattery = true,
    batteryPollIntervalMs = 60_000,
    includeHighEntropy = true,
  } = options;

  const [data, setData] = useState<DeviceData>(() => getDeviceData());

  const refresh = useCallback(() => {
    setData((prev) => {
      const next = getDeviceData();
      return {
        ...next,
        ...(prev.battery ? { battery: prev.battery } : {}),
      };
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
      "(prefers-reduced-motion: reduce)"
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
    if (!includeHighEntropy || typeof navigator === "undefined") return;

    const uaData = (navigator as NavigatorWithExtras).userAgentData;
    if (!uaData?.getHighEntropyValues) return;

    let cancelled = false;

    const updateHighEntropy = async () => {
      const base = getDeviceData();
      const enriched = await readHighEntropyBrowserOs(uaData, {
        browser: base.browser,
        os: base.os,
      });
      if (cancelled || !enriched) return;
      setData((prev) => ({
        ...prev,
        browser: enriched.browser,
        os: enriched.os,
      }));
    };

    void updateHighEntropy();

    return () => {
      cancelled = true;
    };
  }, [includeHighEntropy]);

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
      intervalId = setInterval(
        () => void updateBattery(),
        batteryPollIntervalMs
      );
    }

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [includeBattery, batteryPollIntervalMs]);

  return data;
}
