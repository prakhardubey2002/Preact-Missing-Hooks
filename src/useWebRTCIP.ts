/**
 * useWebRTCIP – detect local/public IPs via WebRTC ICE candidates and STUN.
 * Not highly reliable; use as first-priority hint and fall back to a public IP API (e.g. ipapi.co) if needed.
 * @module useWebRTCIP
 */

import { useEffect, useState, useRef } from "preact/hooks";

/** IPv4 regex for ICE candidate strings (captures dotted-decimal). */
const IPV4_REGEX =
  /\b(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?:25[0-5]|2[0-4]\d|1?\d{1,2})){3}\b/g;

const DEFAULT_STUN_SERVERS: string[] = ["stun:stun.l.google.com:19302"];
const DEFAULT_TIMEOUT_MS = 3000;

export interface UseWebRTCIPOptions {
  /** STUN server URLs (default: Google STUN). */
  stunServers?: string[];
  /** Stop gathering after this many ms (default: 3000). */
  timeout?: number;
  /** Called once per newly detected IP (no duplicates). */
  onDetect?: (ip: string) => void;
}

export interface UseWebRTCIPReturn {
  /** Unique IPv4 addresses found from ICE candidates. */
  ips: string[];
  /** True while ICE gathering is in progress. */
  loading: boolean;
  /** Error message if WebRTC is unavailable or detection fails. */
  error: string | null;
}

function isSSR(): boolean {
  return typeof window === "undefined";
}

function isWebRTCAvailable(): boolean {
  return typeof RTCPeerConnection !== "undefined";
}

/**
 * Extracts IPv4 addresses from an ICE candidate string.
 * Filters out common non-public/local patterns (e.g. 0.0.0.0) if desired; currently returns all matches.
 */
function extractIPv4FromCandidate(candidate: string): string[] {
  const matches = candidate.match(IPV4_REGEX);
  return matches ? [...matches] : [];
}

/**
 * Attempts to detect client IP addresses using WebRTC ICE candidates and a STUN server.
 * Works frontend-only (no backend). Not guaranteed to return a public IP; use as a hint and
 * fall back to a public IP API (e.g. ipapi.co, ip-api.com) if you need reliability.
 *
 * @param options - Optional: stunServers, timeout (ms), onDetect(ip) callback.
 * @returns { ips, loading, error } – unique IPv4s, loading flag, and error message.
 *
 * @example
 * const { ips, loading, error } = useWebRTCIP({
 *   timeout: 5000,
 *   onDetect: (ip) => console.log('Detected:', ip),
 * })
 * // If ips is empty and error is set, fall back to: fetch('https://api.ipify.org?format=json')
 */
export function useWebRTCIP(
  options: UseWebRTCIPOptions = {}
): UseWebRTCIPReturn {
  const {
    stunServers = DEFAULT_STUN_SERVERS,
    timeout: timeoutMs = DEFAULT_TIMEOUT_MS,
    onDetect,
  } = options;

  const [ips, setIps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportedRef = useRef<Set<string>>(new Set());
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    if (isSSR()) {
      setLoading(false);
      setError("WebRTC IP detection is not available during SSR");
      return;
    }

    if (!isWebRTCAvailable()) {
      setLoading(false);
      setError("RTCPeerConnection is not available");
      return;
    }

    const reported = new Set<string>();
    reportedRef.current = reported;

    const finish = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      setLoading(false);
    };

    const addIP = (ip: string) => {
      if (reported.has(ip)) return;
      reported.add(ip);
      setIps((prev) => {
        const next = [...prev, ip];
        return next;
      });
      onDetectRef.current?.(ip);
    };

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunServers }],
      });
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        const c = event.candidate;
        if (!c || !c.candidate) return;
        const found = extractIPv4FromCandidate(c.candidate);
        found.forEach(addIP);
      };

      pc.createDataChannel("");

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Failed to create offer"
          );
          finish();
        });

      timeoutRef.current = setTimeout(() => finish(), timeoutMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "WebRTC setup failed");
      finish();
    }

    return () => {
      finish();
    };
  }, [stunServers.join(","), timeoutMs]);

  return { ips, loading, error };
}

/*
 * Example usage (Preact component):
 *
 * function MyIPDisplay() {
 *   const { ips, loading, error } = useWebRTCIP({
 *     timeout: 4000,
 *     onDetect: (ip) => { / * optional: e.g. send to analytics * / },
 *   })
 *
 *   if (loading) return <p>Detecting IP…</p>
 *   if (error) return <p>WebRTC failed: {error}. Try fallback API.</p>
 *   return <p>IPs (WebRTC): {ips.join(', ') || 'None'}</p>
 * }
 *
 * Fallback to public IP API when WebRTC fails or returns empty:
 *   const [apiIP, setApiIP] = useState<string | null>(null)
 *   useEffect(() => {
 *     if (!loading && ips.length === 0 && error)
 *       fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => setApiIP(d.ip))
 *   }, [loading, ips.length, error])
 */
