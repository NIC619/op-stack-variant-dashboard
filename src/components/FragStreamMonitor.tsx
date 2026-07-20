import { useState, useEffect } from 'react';
import {
  FRAG_GATEWAYS,
  probeFragStream,
  PROBE_WINDOW_MS,
} from '../utils/fragHealth';
import type { FragGateway, FragProbeResult } from '../utils/fragHealth';
import './FragStreamMonitor.css';

// Re-probe cadence. Each probe itself listens for PROBE_WINDOW_MS (~5s).
const POLL_INTERVAL_MS = 15000;

// A gateway only builds frags during its own ~30-block (~60s) epoch, so a
// single probe legitimately sees 0 frames for an off-epoch gateway. The
// aggregate is the true outage signal: during rotation at least one gateway
// builds each epoch, so "no gateway emitted within this window" means the
// frag stream is down. Window > one epoch to span rotation boundaries.
const HEALTHY_WINDOW_MS = 90000;

interface GatewayFragState {
  checking: boolean;
  result?: FragProbeResult;
  lastCheckedAt?: number;
  // Last time a probe of this gateway actually saw frag notifications.
  lastSeenAt?: number;
}

export function FragStreamMonitor({ refreshKey }: { refreshKey: number }) {
  const [states, setStates] = useState<Record<string, GatewayFragState>>({});
  // Ticks every second so "Xs ago" labels and the aggregate window stay live.
  const [now, setNow] = useState(() => Date.now());
  // When monitoring started. The outage banner claims "no frags in the last
  // 90s", so it must not appear until we have actually observed that long.
  const [monitoringSince] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runProbes = () => {
      FRAG_GATEWAYS.forEach(gateway => {
        setStates(prev => ({
          ...prev,
          [gateway.wsUrl]: { ...prev[gateway.wsUrl], checking: true },
        }));
        probeFragStream(gateway.wsUrl).then(result => {
          if (cancelled) return;
          const checkedAt = Date.now();
          setStates(prev => ({
            ...prev,
            [gateway.wsUrl]: {
              checking: false,
              result,
              lastCheckedAt: checkedAt,
              lastSeenAt: result.ok ? checkedAt : prev[gateway.wsUrl]?.lastSeenAt,
            },
          }));
        });
      });
    };

    runProbes();
    const interval = setInterval(runProbes, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshKey]);

  if (FRAG_GATEWAYS.length === 0) {
    return null;
  }

  const gatewayStates = FRAG_GATEWAYS.map(g => states[g.wsUrl]).filter(
    (s): s is GatewayFragState => Boolean(s),
  );
  // The red banner needs full evidence: every gateway probed at least once
  // AND a full healthy-window of observation elapsed. A single fast failure
  // while other gateways are still on their first probe proves nothing.
  const allInitialProbed =
    gatewayStates.length === FRAG_GATEWAYS.length &&
    gatewayStates.every(s => s.lastCheckedAt !== undefined);
  const observedMs = now - monitoringSince;
  const lastSeenAny = gatewayStates.reduce<number | undefined>(
    (max, s) =>
      s.lastSeenAt !== undefined && (max === undefined || s.lastSeenAt > max)
        ? s.lastSeenAt
        : max,
    undefined,
  );
  const aggregateHealthy =
    lastSeenAny !== undefined && now - lastSeenAny <= HEALTHY_WINDOW_MS;

  return (
    <div className="endpoints-layer frag-stream-section">
      <h3 className="layer-title">Frag Stream</h3>

      {aggregateHealthy ? (
        <div className="frag-banner frag-banner-healthy">
          ✅ Frag stream healthy — at least one gateway emitted frags in the last{' '}
          {formatAge(now - (lastSeenAny as number))}
        </div>
      ) : !allInitialProbed ? (
        <div className="frag-banner frag-banner-checking">
          Checking frag streams…
        </div>
      ) : observedMs < HEALTHY_WINDOW_MS ? (
        <div className="frag-banner frag-banner-warming">
          ⏳ No frags seen yet — monitoring ({formatAge(observedMs)} of{' '}
          {Math.round(HEALTHY_WINDOW_MS / 1000)}s window)
        </div>
      ) : (
        <div className="frag-banner frag-banner-down">
          🚨 No frags seen from any gateway in the last{' '}
          {Math.round(HEALTHY_WINDOW_MS / 1000)}s — the frag stream may be down
        </div>
      )}

      <div className="frag-grid">
        {FRAG_GATEWAYS.map(gateway => (
          <FragTile
            key={gateway.wsUrl}
            gateway={gateway}
            state={states[gateway.wsUrl]}
            now={now}
          />
        ))}
      </div>

      <p className="frag-note">
        A gateway only builds during its own epoch (~60s), so a quiet tile is
        normal while another gateway is sequencing — the banner above is the
        outage signal.
      </p>
    </div>
  );
}

function FragTile({
  gateway,
  state,
  now,
}: {
  gateway: FragGateway;
  state: GatewayFragState | undefined;
  now: number;
}) {
  const result = state?.result;
  const probeSeconds = Math.round(PROBE_WINDOW_MS / 1000);

  let statusClass = 'frag-tile-checking';
  let statusText = 'Checking…';
  if (result) {
    if (result.ok) {
      statusClass = 'frag-tile-streaming';
      statusText = `Streaming — ${result.notifications} frag${
        result.notifications === 1 ? '' : 's'
      } / ${probeSeconds}s`;
    } else if (result.error) {
      statusClass = 'frag-tile-error';
      statusText = `Unreachable: ${result.error}`;
    } else {
      statusClass = 'frag-tile-idle';
      statusText = 'No frags this probe (may be off-epoch)';
    }
  }

  return (
    <div className={`frag-tile ${statusClass}`}>
      <div className="frag-tile-header">
        <span className="frag-tile-name">{gateway.name}</span>
        <span className="frag-tile-status-dot" />
      </div>
      <p className="frag-tile-url">{gateway.wsUrl}</p>
      <p className="frag-tile-status">{statusText}</p>
      <div className="frag-tile-meta">
        <span>
          Last seen:{' '}
          {state?.lastSeenAt !== undefined
            ? `${formatAge(now - state.lastSeenAt)} ago`
            : 'never (this session)'}
        </span>
        <span>
          Checked:{' '}
          {state?.lastCheckedAt !== undefined
            ? `${formatAge(now - state.lastCheckedAt)} ago`
            : '—'}
        </span>
      </div>
    </div>
  );
}

function formatAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
