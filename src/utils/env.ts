// Is this bundle running under the CRA dev server, rather than a deployed build?
//
// Everything that has to choose between calling a node/API directly and going through a
// serverless proxy keys off this. It is deliberately NOT a
// `window.location.hostname.includes('vercel.app')` check, which several call sites used to
// do: that silently treats a deployment on a custom domain as local development, so the
// proxies are bypassed and the password gate never engages — on the one deployment where
// both matter most.
//
// NODE_ENV is set by react-scripts ('development' for `npm start`, 'production' for
// `npm run build`, 'test' under Jest) and inlined at build time, so this is a constant in
// the bundle with no runtime hostname guessing. Jest counts as non-local, matching a
// deployed build.
export function isLocalDev(): boolean {
  return process.env.NODE_ENV === 'development';
}
