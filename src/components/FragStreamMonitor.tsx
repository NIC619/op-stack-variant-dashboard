import { useState, useEffect } from 'react';
import {
  FRAG_GATEWAYS,
  probeFragStream,
  PROBE_WINDOW_MS,
} from '../utils/fragHealth';
import type { FragGateway, FragProbeResult } from '../utils/fragHealth';
import './FragStreamMonitor.css';

// Re-probe cadence within a burst. Each probe itself listens for
// PROBE_WINDOW_MS (~5s).
const POLL_INTERVAL_MS = 15000;

// A gateway only builds frags during its own ~30-block (~60s) epoch, so a
// single probe legitimately sees 0 frames for an off-epoch gateway. The
// aggregate is the true outage signal: during rotation at least one gateway
// builds each epoch, so "no gateway emitted within this window" means the
// frag stream is down. Window > one epoch to span rotation boundaries.
const HEALTHY_WINDOW_MS = 90000;

// Probing runs as a bounded burst instead of polling forever: on page open
// and on each manual Refresh, poll every POLL_INTERVAL_MS until the full
// HEALTHY_WINDOW_MS is covered, freeze the verdict, and stop. This caps
// serverless-function usage per visit while still giving the red banner a
// full epoch-safe evidence window. Rounds at t=0, 15s, …, 90s.
const BURST_ROUNDS = Math.floor(HEALTHY_WINDOW_MS / POLL_INTERVAL_MS) + 1;
// The verdict freezes as soon as the final round's probes settle. This is
// only a backstop for a lost/hung request: the serverless probe may run up to
// ~9s (connect + observe budget) before network overhead, so the cap sits
// above that.
const BURST_SETTLE_TIMEOUT_MS = 12000;

interface GatewayFragState {
  checking: boolean;
  result?: FragProbeResult;
  lastCheckedAt?: number;
  // Last time a probe of this gateway actually saw frag notifications.
  lastSeenAt?: number;
}

// One probing burst: startedAt is set when the burst begins (page open or
// Refresh click); endedAt is set once the final round has settled, freezing
// the verdict until the next burst.
interface Burst {
  startedAt: number;
  endedAt?: number;
}

export function FragStreamMonitor({ refreshKey }: { refreshKey: number }) {
  const [states, setStates] = useState<Record<string, GatewayFragState>>({});
  // Ticks every second so "Xs ago" labels and the aggregate window stay live.
  const [now, setNow] = useState(() => Date.now());
  const [burst, setBurst] = useState<Burst>(() => ({ startedAt: Date.now() }));

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Set when the verdict freezes. Probe results arriving after this point
    // are dropped: letting them through would mutate the frozen verdict and
    // could stamp a lastSeenAt newer than the frozen evalNow (negative age).
    let frozen = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    setBurst({ startedAt });

    const runProbes = (): Array<Promise<void>> =>
      FRAG_GATEWAYS.map(gateway => {
        setStates(prev => ({
          ...prev,
          [gateway.wsUrl]: { ...prev[gateway.wsUrl], checking: true },
        }));
        return probeFragStream(gateway.wsUrl).then(result => {
          if (cancelled || frozen) return;
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

    // Freeze once the final round's probes have settled (or the backstop
    // timeout fires because a request was lost). Any tile still marked
    // checking at that point had its request dropped — clear the flag so it
    // doesn't spin forever; its previous result stays displayed.
    const freeze = () => {
      if (cancelled || frozen) return;
      frozen = true;
      clearTimeout(settleTimer);
      setStates(prev => {
        const next = { ...prev };
        for (const url of Object.keys(next)) {
          if (next[url].checking) next[url] = { ...next[url], checking: false };
        }
        return next;
      });
      setBurst({ startedAt, endedAt: Date.now() });
    };

    runProbes();
    let round = 1;
    const interval = setInterval(() => {
      round += 1;
      const promises = runProbes();
      if (round >= BURST_ROUNDS) {
        clearInterval(interval);
        settleTimer = setTimeout(freeze, BURST_SETTLE_TIMEOUT_MS);
        Promise.allSettled(promises).then(freeze);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (settleTimer) clearTimeout(settleTimer);
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
  // Once the burst ends the verdict is frozen at burst end: probing has
  // stopped, so letting `now` keep advancing would decay a green verdict into
  // a false red purely from the passage of unobserved time.
  const paused = burst.endedAt !== undefined;
  const evalNow = burst.endedAt ?? now;
  const observedMs = evalNow - burst.startedAt;
  const lastSeenAny = gatewayStates.reduce<number | undefined>(
    (max, s) =>
      s.lastSeenAt !== undefined && (max === undefined || s.lastSeenAt > max)
        ? s.lastSeenAt
        : max,
    undefined,
  );
  const aggregateHealthy =
    lastSeenAny !== undefined && evalNow - lastSeenAny <= HEALTHY_WINDOW_MS;

  return (
    <div className="endpoints-layer frag-stream-section">
      <h3 className="layer-title">Frag Stream</h3>

      {aggregateHealthy ? (
        <div className="frag-banner frag-banner-healthy">
          ✅ Frag stream healthy — at least one gateway emitted frags in the last{' '}
          {formatAge(evalNow - (lastSeenAny as number))}
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

      {paused && (
        <p className="frag-paused">
          Monitoring paused — verdict from {formatAge(now - evalNow)} ago. Press
          🔄 Refresh to re-check.
        </p>
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
