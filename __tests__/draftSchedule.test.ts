import {
  resolveDraftStartsAt,
  resolveDraftStartsAtTime,
} from '../src/components/LeagueDetail/draftSchedule';

const ISO = '2026-09-20T18:00:00.000Z';

describe('resolving the draft start time', () => {
  // The regression: this is the only shape the API actually sends, and it was
  // the one shape none of the three call sites looked at.
  it('reads the path the league endpoint returns', () => {
    expect(resolveDraftStartsAt({ draftSettings: { draftStartsAt: ISO } })).toBe(ISO);
  });

  it('prefers draftSettings over a flattened copy', () => {
    expect(
      resolveDraftStartsAt({
        draftSettings: { draftStartsAt: ISO },
        draftStartsAt: '2020-01-01T00:00:00.000Z',
      }),
    ).toBe(ISO);
  });

  it('still accepts an already-mapped league object', () => {
    expect(resolveDraftStartsAt({ draftStartsAt: ISO })).toBe(ISO);
  });

  it('still accepts the settings wrapper and mock draftDate', () => {
    expect(resolveDraftStartsAt({ settings: { draftSettings: { draftStartsAt: ISO } } })).toBe(ISO);
    expect(resolveDraftStartsAt({ draftDate: ISO })).toBe(ISO);
  });

  it('returns undefined when the league has no draft time', () => {
    expect(resolveDraftStartsAt({})).toBeUndefined();
    expect(resolveDraftStartsAt({ draftSettings: {} })).toBeUndefined();
    expect(resolveDraftStartsAt(undefined)).toBeUndefined();
    expect(resolveDraftStartsAt(null)).toBeUndefined();
  });
});

describe('as a timestamp', () => {
  it('converts a real date', () => {
    expect(resolveDraftStartsAtTime({ draftSettings: { draftStartsAt: ISO } })).toBe(
      new Date(ISO).getTime(),
    );
  });

  it('accepts a Date instance as well as a string', () => {
    expect(resolveDraftStartsAtTime({ draftSettings: { draftStartsAt: new Date(ISO) } })).toBe(
      new Date(ISO).getTime(),
    );
  });

  // NaN would compare false against every bound, which reads as "the deadline
  // has passed" and would show a stuck 00:00:00 all over again.
  it('returns null for an unparseable date rather than NaN', () => {
    expect(resolveDraftStartsAtTime({ draftSettings: { draftStartsAt: 'not a date' } })).toBeNull();
  });

  it('returns null when there is nothing scheduled', () => {
    expect(resolveDraftStartsAtTime({})).toBeNull();
  });
});
