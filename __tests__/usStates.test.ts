import { US_STATES, matchesState, stateName } from '../src/constants/usStates';

/**
 * The US state list behind the profile's state picker.
 *
 * What gets stored is the two-letter code; the name is only ever a label. These
 * pin the list's integrity - a duplicate or malformed code would be stored and
 * then fail to match anything - and the two behaviours the picker depends on.
 */

describe('the list itself', () => {
  it('covers all fifty states', () => {
    // Spot-checked at both ends of the alphabet rather than asserting a count,
    // which would pass just as happily on fifty copies of Alabama.
    for (const name of ['Alabama', 'Texas', 'California', 'Wyoming', 'Hawaii']) {
      expect(US_STATES.some((state) => state.name === name)).toBe(true);
    }

    const states = US_STATES.filter(
      (state) => !['DC', 'AS', 'GU', 'MP', 'PR', 'VI'].includes(state.code),
    );
    expect(states).toHaveLength(50);
  });

  it('includes DC and the inhabited territories', () => {
    // All-star programs exist in Puerto Rico and Guam, so a list of exactly
    // fifty would refuse a real answer.
    for (const code of ['DC', 'PR', 'GU', 'AS', 'MP', 'VI']) {
      expect(US_STATES.some((state) => state.code === code)).toBe(true);
    }
  });

  it('gives every entry a unique two-letter uppercase code', () => {
    const codes = US_STATES.map((state) => state.code);

    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('names every entry', () => {
    for (const state of US_STATES) {
      expect(state.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('stateName', () => {
  it('turns a stored code into something readable', () => {
    expect(stateName('TX')).toBe('Texas');
    expect(stateName('DC')).toBe('District of Columbia');
  });

  it('reads nothing stored as nothing to show', () => {
    expect(stateName(null)).toBeNull();
    expect(stateName(undefined)).toBeNull();
    expect(stateName('')).toBeNull();
  });

  it('falls back to the code it does not recognise', () => {
    // The server validates against its own copy of this list, so it can accept
    // a code this build has never heard of. Showing the code beats showing
    // nothing, and beats claiming the state is unset when it is not.
    expect(stateName('ZZ')).toBe('ZZ');
  });
});

describe('matchesState', () => {
  const texas = { code: 'TX', name: 'Texas' };

  it('matches on the name, case-insensitively', () => {
    expect(matchesState(texas, 'tex')).toBe(true);
    expect(matchesState(texas, 'TEXAS')).toBe(true);
  });

  it('matches on the code by prefix', () => {
    expect(matchesState(texas, 'tx')).toBe(true);
    expect(matchesState(texas, 'T')).toBe(true);
  });

  it('matches a code by prefix only, not anywhere inside it', () => {
    // Prefix rather than substring: matching a code's second letter would put
    // a dozen unrelated states behind every single-letter keystroke.
    // A synthetic entry, so the name cannot match and mask the code rule.
    const nowhere = { code: 'ZQ', name: 'Nowhere' };

    expect(matchesState(nowhere, 'z')).toBe(true);
    expect(matchesState(nowhere, 'q')).toBe(false);
  });

  it('matches everything on a blank search', () => {
    expect(matchesState(texas, '')).toBe(true);
    expect(matchesState(texas, '   ')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(matchesState(texas, '  texas  ')).toBe(true);
  });

  it('finds exactly one state for an unambiguous term', () => {
    const found = US_STATES.filter((state) => matchesState(state, 'wyoming'));
    expect(found.map((state) => state.code)).toEqual(['WY']);
  });
});
