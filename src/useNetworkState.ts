import { useEffect, useState } from "preact/hooks";

/** Network Information API (not in all browsers) */
interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

/** Effective connection type from Network Information API */
export type EffectiveConnectionType = "slow-2g" | "2g" | "3g" | "4g";

/** Network connection type (e.g., wifi, cellular) */
export type ConnectionType =
  | "bluetooth"
  | "cellular"
  | "ethernet"
  | "mixed"
  | "none"
  | "other"
  | "unknown"
  | "wifi";

export interface NetworkState {
  /** Whether the browser is online */
  online: boolean;
  /** Effective connection type (when supported) */
  effectiveType?: EffectiveConnectionType;
  /** Estimated downlink speed in Mbps (when supported) */
  downlink?: number;
  /** Estimated round-trip time in ms (when supported) */
  rtt?: number;
  /** Whether the user has requested reduced data usage (when supported) */
  saveData?: boolean;
  /** Connection type (when supported) */
  connectionType?: ConnectionType;
}

function getNetworkState(): NetworkState {
  if (typeof navigator === "undefined") {
    return { online: true };
  }

  const state: NetworkState = {
    online: navigator.onLine,
  };

  const connection = (
    navigator as Navigator & { connection?: NetworkInformation }
  ).connection;

  if (connection) {
    if (connection.effectiveType !== undefined) {
      state.effectiveType = connection.effectiveType as EffectiveConnectionType;
    }
    if (connection.downlink !== undefined) {
      state.downlink = connection.downlink;
    }
    if (connection.rtt !== undefined) {
      state.rtt = connection.rtt;
    }
    if (connection.saveData !== undefined) {
      state.saveData = connection.saveData;
    }
    if (connection.type !== undefined) {
      state.connectionType = connection.type as ConnectionType;
    }
  }

  return state;
}

/**
 * A Preact hook that returns the current network state, including online/offline
 * status and (when supported) connection type, downlink, RTT, and save-data preference.
 * Updates reactively when the network state changes.
 *
 * @returns The current network state object
 *
 * @example
 * ```tsx
 * function NetworkStatus() {
 *   const { online, effectiveType, saveData } = useNetworkState();
 *   return (
 *     <div>
 *       Status: {online ? 'Online' : 'Offline'}
 *       {effectiveType && ` (${effectiveType})`}
 *       {saveData && ' - Reduced data mode'}
 *     </div>
 * );
 * }
 * ```
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(getNetworkState);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateState = () => setState(getNetworkState());

    window.addEventListener("online", updateState);
    window.addEventListener("offline", updateState);

    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection;
    if (connection?.addEventListener) {
      connection.addEventListener("change", updateState);
    }

    return () => {
      window.removeEventListener("online", updateState);
      window.removeEventListener("offline", updateState);
      if (connection?.removeEventListener) {
        connection.removeEventListener("change", updateState);
      }
    };
  }, []);

  return state;
}
