import './ProGate.css';

/**
 * Single-edition build: every feature is unlocked, so this renders children
 * untouched. Kept as a named component so the ProGate(...) call-sites across
 * Home/Stats/etc. don't need surgery — if a gated build ever returns, the
 * gating UI can live here again.
 */
export default function ProGate({ children }) {
  return children;
}
