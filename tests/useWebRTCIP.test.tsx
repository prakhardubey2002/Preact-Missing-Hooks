/** @jsx h */
import { h } from 'preact';
import { render, waitFor } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { useWebRTCIP } from '@/useWebRTCIP';

describe('useWebRTCIP', () => {
  const originalRTCPeerConnection = global.RTCPeerConnection;

  afterEach(() => {
    if (originalRTCPeerConnection !== undefined) {
      (global as unknown as { RTCPeerConnection: typeof originalRTCPeerConnection }).RTCPeerConnection =
        originalRTCPeerConnection;
    } else {
      delete (global as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection;
    }
    vi.useRealTimers();
  });

  it('returns error when RTCPeerConnection is not available', async () => {
    delete (global as unknown as { RTCPeerConnection?: unknown }).RTCPeerConnection;

    function TestComponent() {
      const { ips, loading, error } = useWebRTCIP();
      return (
        <div>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="error">{error ?? 'none'}</span>
          <span data-testid="ips">{ips.join(',')}</span>
        </div>
      );
    }

    const { getByTestId } = render(<TestComponent />);
    await waitFor(() => expect(getByTestId('loading').textContent).toBe('false'));
    expect(getByTestId('error').textContent).toContain('RTCPeerConnection');
    expect(getByTestId('ips').textContent).toBe('');
  });

  it('starts with loading true and then resolves with mock ICE candidate', async () => {
    vi.useFakeTimers();

    let onIceCandidate: (e: { candidate: { candidate: string } | null }) => void = () => { };
    const mockPC = {
      close: vi.fn(),
      createDataChannel: vi.fn(),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      onicecandidate: null as ((e: { candidate: { candidate: string } | null }) => void) | null,
    };

    (global as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = vi.fn().mockImplementation(() => ({
      ...mockPC,
      get onicecandidate() {
        return this._onicecandidate;
      },
      set onicecandidate(fn) {
        this._onicecandidate = fn;
        onIceCandidate = fn;
      },
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
    }));

    let result: { ips: string[]; loading: boolean; error: string | null } = { ips: [], loading: true, error: null };
    function TestComponent() {
      const state = useWebRTCIP({ timeout: 3000 });
      result = state;
      return (
        <div>
          <span data-testid="loading">{String(state.loading)}</span>
          <span data-testid="ips">{state.ips.join(',')}</span>
          <span data-testid="error">{state.error ?? 'none'}</span>
        </div>
      );
    }

    render(<TestComponent />);
    expect(result.loading).toBe(true);

    // Simulate ICE candidate with an IPv4
    onIceCandidate({
      candidate: { candidate: 'candidate:1 1 UDP 123 192.168.1.100 456 typ host' },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(result.ips).toContain('192.168.1.100');

    // Timeout should stop gathering
    vi.advanceTimersByTime(3500);
    await waitFor(() => expect(result.loading).toBe(false));

    expect(mockPC.close).toHaveBeenCalled();
  });

  it('calls onDetect for each new IP without duplicates', async () => {
    vi.useFakeTimers();
    const detected: string[] = [];
    let onIceCandidate: (e: { candidate: { candidate: string } | null }) => void = () => { };

    (global as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = vi.fn().mockImplementation(() => ({
      close: vi.fn(),
      createDataChannel: vi.fn(),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      _onicecandidate: null,
      get onicecandidate() {
        return this._onicecandidate;
      },
      set onicecandidate(fn) {
        this._onicecandidate = fn;
        onIceCandidate = fn;
      },
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
    }));

    function TestComponent() {
      const { ips } = useWebRTCIP({
        timeout: 5000,
        onDetect: (ip) => detected.push(ip),
      });
      return <span data-testid="ips">{ips.join(',')}</span>;
    }

    render(<TestComponent />);

    onIceCandidate({
      candidate: { candidate: 'candidate:1 1 UDP 0 10.0.0.1 9 typ host' },
    });
    onIceCandidate({
      candidate: { candidate: 'candidate:2 1 UDP 0 10.0.0.1 9 typ host' },
    });
    onIceCandidate({
      candidate: { candidate: 'candidate:3 1 UDP 0 192.168.0.2 9 typ host' },
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(detected).toEqual(['10.0.0.1', '192.168.0.2']);
  });

  it('ignores null candidate (end-of-candidates)', async () => {
    vi.useFakeTimers();
    let onIceCandidate: (e: { candidate: unknown }) => void = () => { };

    (global as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection = vi.fn().mockImplementation(() => ({
      close: vi.fn(),
      createDataChannel: vi.fn(),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      get onicecandidate() {
        return this._onicecandidate;
      },
      set onicecandidate(fn) {
        this._onicecandidate = fn;
        onIceCandidate = fn;
      },
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
    }));

    function TestComponent() {
      const { ips } = useWebRTCIP({ timeout: 100 });
      return <span data-testid="ips">{ips.join(',')}</span>;
    }

    render(<TestComponent />);
    onIceCandidate({ candidate: null });
    await vi.advanceTimersByTimeAsync(0);
    const el = document.querySelector('[data-testid="ips"]');
    expect(el?.textContent).toBe('');
  });
});
