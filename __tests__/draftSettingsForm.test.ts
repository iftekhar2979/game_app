import {
  describeDraftStartsAtProblem,
  describeSaveError,
} from '../src/components/LeagueDetail/draftSettingsForm';

const NOW = new Date('2026-09-07T06:44:00.000Z').getTime();
const at = (iso: string) => new Date(iso);

describe('draft start time guard', () => {
  // The 400 the server actually returned:
  // "draftSettings.draftStartsAt must be in the future"
  it('blocks a newly picked time that is in the past', () => {
    expect(
      describeDraftStartsAtProblem(at('2026-09-06T10:00:00.000Z'), null, NOW),
    ).toContain('must be in the future');
  });

  it('blocks a time equal to now, matching the server\'s <= rule', () => {
    expect(
      describeDraftStartsAtProblem(new Date(NOW), null, NOW),
    ).toContain('must be in the future');
  });

  it('allows a future time', () => {
    expect(
      describeDraftStartsAtProblem(at('2026-09-08T10:00:00.000Z'), null, NOW),
    ).toBeNull();
  });

  // The server only validates a date it is being asked to change, so editing a
  // pick timer must not be blocked by an untouched date that has since passed.
  it('ignores an unchanged date that is already in the past', () => {
    const existing = at('2026-09-01T10:00:00.000Z');
    expect(
      describeDraftStartsAtProblem(existing, existing.getTime(), NOW),
    ).toBeNull();
  });

  it('allows saving with no date set at all', () => {
    expect(describeDraftStartsAtProblem(null, null, NOW)).toBeNull();
  });

  it('rejects an unparseable date', () => {
    expect(
      describeDraftStartsAtProblem(new Date('nonsense'), null, NOW),
    ).toBe('Pick a valid draft date and time.');
  });
});

describe('save error messages', () => {
  it('surfaces the server message verbatim', () => {
    expect(
      describeSaveError({
        data: { message: 'draftSettings.draftStartsAt must be in the future' },
      }),
    ).toBe('draftSettings.draftStartsAt must be in the future');
  });

  it('joins multiple validation messages onto separate lines', () => {
    expect(describeSaveError({ data: { message: ['a', 'b'] } })).toBe('a\nb');
  });

  it('falls back for an error with nothing usable', () => {
    expect(describeSaveError(undefined)).toBe(
      'Failed to update draft settings.',
    );
    expect(describeSaveError({ data: { message: '   ' } })).toBe(
      'Failed to update draft settings.',
    );
  });
});
