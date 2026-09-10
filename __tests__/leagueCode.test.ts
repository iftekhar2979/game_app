import { parseLeagueCode } from '../src/screens/Home/leagueCode';

/**
 * What counts as a league code when the camera reads a QR.
 *
 * The scanner reports every QR in frame, so this is the gate between "the
 * reader pointed their phone at an invite" and "the reader pointed it at a
 * menu". The old flow had no gate at all.
 */

describe('reading a league code', () => {
  it('accepts the bare code the league screen encodes', () => {
    expect(parseLeagueCode('abc123')).toBe('ABC123');
    expect(parseLeagueCode('  ABC123\n')).toBe('ABC123');
  });

  it('pulls the code out of a shared join link', () => {
    expect(parseLeagueCode('https://cheerbattle.app/join/ABC123?ref=qr')).toBe('ABC123');
  });

  it('pulls the code out of a query string', () => {
    expect(parseLeagueCode('https://cheerbattle.app/invite?code=xyz789&x=1')).toBe('XYZ789');
    expect(parseLeagueCode('code=XYZ789')).toBe('XYZ789');
  });

  it('accepts the prefixed payload', () => {
    expect(parseLeagueCode('CHEERBATTLE:ABC123')).toBe('ABC123');
  });

  it('rejects a QR that is not a league invite', () => {
    // A Wi-Fi QR, a website, a sentence: none of these may reach the join
    // endpoint dressed up as a code.
    for (const raw of [
      'WIFI:S:HomeNetwork;T:WPA;P:secret;;',
      'https://example.com/menu',
      'hello world',
    ]) {
      expect(parseLeagueCode(raw)).toBeNull();
    }
  });

  it('rejects nothing-shaped input', () => {
    for (const raw of ['', '   ', null, undefined, 'CHEERBATTLE:']) {
      expect(parseLeagueCode(raw)).toBeNull();
    }
  });

  it('rejects a code too short to be one', () => {
    expect(parseLeagueCode('AB')).toBeNull();
  });
});
