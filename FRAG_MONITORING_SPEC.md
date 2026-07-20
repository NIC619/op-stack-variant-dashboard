# Frag-Stream Health Panel — unifi-simple-dashboard

Status: DRAFT 2026-07-15. Target: React (CRA) frontend + Vercel serverless `api/`.

## 1. Problem

ChainStatus shows per-endpoint block heights (`latest/safe/finalized`). But the L2 head advances even when the based gateway is wedged (portal fallback keeps sequencing), so a green "block height climbing" hides a total frag outage — the failure mode from 2026-07-08 (explorer dark ~6 days). We want a **Frag Stream** health tile per gateway that reflects the actual `:9999` frag WebSocket.

## 2. Can the "Primary" (direct `:9999` WS) approach be used here? — Only server-side.

**Not from the browser.** The dashboard is served over HTTPS (Vercel); a raw `ws://<gw-ip>:9999` is **mixed-content blocked**, the gateway WS has **no CORS/auth**, and the app already funnels raw `http://IP:port` RPC through `/api/rpc-proxy` for exactly these reasons (`src/utils/rpc.ts` `getRpcUrl`). So the WS probe must run **server-side in a Vercel serverless function**, and the frontend polls that function. With that indirection, the Primary approach applies.

## 3. Design

### 3a. Serverless probe — `api/frag-health.js` (mirror `api/rpc-proxy.js`)
- Same skeleton: CORS headers, `requireAuth(req,res)` (`lib/auth`), env-driven allowlist.
- Input: `?url=<gateway frag ws url>`; validate against an allowlist built from env (add `REACT_APP_GATEWAY(_\d+)?_FRAG_WS_URL`, analogous to the `RPC_URL_KEY` regex in `rpc-proxy.js`). Alternatively derive the WS URL from the existing `REACT_APP_GATEWAY*_RPC_URL` host with port `9999`.
- Action: open a WS to the URL, **send the subscription request** `{"jsonrpc":"2.0","id":1,"method":"frag_subscribe","params":[]}` (see Protocol below), read for `PROBE_MS` (~4000–5000 ms), count `frag_subscription` notifications, then close. Return `{ url, notifications, ok: notifications>0, elapsedMs }`. On connect error/timeout → `{ ok:false, error }`.

**Protocol (IMPORTANT — confirmed 2026-07-15).** `:9999` is a **jsonrpsee subscription** (namespace `frag`), NOT push-on-connect. After the handshake send `frag_subscribe`; the server acks with a subscription id then pushes `{"method":"frag_subscription","params":{"subscription":<id>,"result":{"blockNumber":…,"seq":…}}}`. A connect-only probe reads **zero** regardless of frag flow. Also: each gateway streams primarily its *own* built epochs, so a single ~5s probe can legitimately see 0 for an off-epoch gateway — see §4.
- Use the **`ws`** npm package (add dep) in the function, or a minimal raw client. Keep the probe well under the Vercel function limit — set `maxDuration` (e.g. 10s) in `vercel.json`/function config; `PROBE_MS ≤ 8000`.
- Stateless: each call is a fresh point-in-time probe (frames seen in the last ~5s).

### 3b. Frontend — Frag Stream tiles on ChainStatus
- Add a "Frag Stream" sub-section on `src/pages/ChainStatus.tsx` (mirror the `EndpointCard`/`endpoints-grid` layout), one tile per gateway.
- Fetch `/api/frag-health?url=<encoded ws url>` per gateway; drive off the existing `refreshKey` + an interval (e.g. every 15–20s). Reuse the app's fetch/error conventions.
- Tile: green if `frames>0` ("streaming — N frames / 5s"), red if `0`/error ("no frags"), plus last-checked time. Gateway list comes from the same numbered-slot env pattern as `rpc.ts` (`GATEWAY_RPC_URLS`).

## 4. Epoch-rotation caveat (important for thresholds)

A gateway only *builds* during its ~30-block (~60s) epoch. **Verify whether `:9999` emits only self-built frags or also relays peers'.** If self-built-only, a single 5s probe can legitimately see 0 frames for a gateway that's mid-off-epoch → false red. Mitigations:
- Show a top-level **"Frag stream: HEALTHY if *any* gateway emitted in the last N s"** banner (the aggregate is the true outage signal — during rotation at least one gateway builds each epoch), and treat per-gateway tiles as informational ("last seen Xs ago") rather than hard red.
- Or have the probe track "last frame age" via a couple of consecutive polls spanning > one epoch before showing red.

## 5. Alternative (avoid duplicate probing)

If `unifi-monitors/offchain-alerting` grows an HTTP status endpoint for its frag listeners (it's Telegram-only today), the dashboard could read that instead of running its own probe — single source of truth. Not available now; the serverless probe is the standalone path.

## 6. Env / rollout
- Add `REACT_APP_GATEWAY_FRAG_WS_URL` (+ numbered) to `.env.example` and Vercel, or derive `:9999` from the gateway RPC host in the function.
- `npm start` locally (probe works against direct WS in dev since no mixed-content); verify on a Vercel preview deploy (serverless path). Validate green during a live epoch and red when a gateway's `:9999` is down.
