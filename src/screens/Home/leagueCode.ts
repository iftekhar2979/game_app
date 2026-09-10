/**
 * Reading a league join code out of whatever a QR code contained.
 *
 * The league screen encodes the bare code, but a code can also arrive as a
 * link someone shared (`.../join/ABC123`), a query string (`?code=ABC123`) or
 * a prefixed payload (`CHEERBATTLE:ABC123`). All of those are accepted.
 *
 * Anything else is rejected rather than passed through. A camera pointed at a
 * menu, a Wi-Fi QR or a product label must not be treated as a league code -
 * the old flow sent whatever it had to the join endpoint and showed
 * "League Code Verified" before the server had verified anything.
 *
 * Kept pure so the parsing is testable without a camera.
 */

const CODE_SHAPE = /^[A-Z0-9_-]{3,32}$/;

export function parseLeagueCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;

  let code = raw.trim().toUpperCase();
  if (!code) return null;

  const fromQuery = /[?&]CODE=([A-Z0-9_-]+)/.exec(code) ?? /^CODE=([A-Z0-9_-]+)/.exec(code);
  const fromPath = /\/JOIN\/([A-Z0-9_-]+)/.exec(code);

  if (fromQuery) {
    code = fromQuery[1];
  } else if (fromPath) {
    code = fromPath[1];
  } else if (code.startsWith('CHEERBATTLE:')) {
    code = code.slice('CHEERBATTLE:'.length).trim();
  }

  return CODE_SHAPE.test(code) ? code : null;
}
