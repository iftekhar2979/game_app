import { resolveDivisionOptions } from '../src/components/LeagueDetail/divisionCapacity';

const rules = [
  { divisionCode: 'SMALL_COED', divisionName: 'Small Coed', exactTeamCount: 1 },
  { divisionCode: 'NON_TUMBLING', divisionName: 'Non Tumbling', exactTeamCount: 1 },
  { divisionCode: 'MEDIUM_LARGE', divisionName: 'Medium/Large', exactTeamCount: 2 },
];

const division = (id: string, code: string, name: string) => ({
  _id: id,
  code,
  name,
});

const SMALL_COED = division('d1', 'SMALL_COED', 'Small Coed');
const NON_TUMBLING = division('d2', 'NON_TUMBLING', 'Non Tumbling');
const MEDIUM_LARGE = division('d3', 'MEDIUM_LARGE', 'Medium/Large');
const INTERNATIONAL = division('d4', 'INTERNATIONAL', 'International');

describe('division capacity', () => {
  it('offers an eligible division the roster has room for', () => {
    const { selectable, blockedReason } = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED],
      divisionRules: rules,
      rosterEntries: [],
    });

    expect(selectable).toHaveLength(1);
    expect(selectable[0]).toMatchObject({
      code: 'SMALL_COED',
      occupied: 0,
      remaining: 1,
    });
    expect(blockedReason).toBeNull();
  });

  // The bug this exists for: the division was offered, picked, and then
  // rejected server-side with "already has its exact allocation".
  it('withholds a division the roster has already filled', () => {
    const { selectable, full, blockedReason } = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED],
      divisionRules: rules,
      rosterEntries: [{ assignedDivisionCode: 'SMALL_COED' }],
    });

    expect(selectable).toEqual([]);
    expect(full).toHaveLength(1);
    expect(blockedReason).toBe(
      'Your Small Coed slot is already full. Release a team from it to add this one.',
    );
  });

  it('frees the division again once that team is released', () => {
    const afterRelease = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED],
      divisionRules: rules,
      // The released row is no longer active, so it is simply absent.
      rosterEntries: [{ assignedDivisionCode: 'NON_TUMBLING' }],
    });

    expect(afterRelease.selectable.map(o => o.code)).toEqual(['SMALL_COED']);
    expect(afterRelease.blockedReason).toBeNull();
  });

  it('counts capacity per division rather than per roster', () => {
    const oneOfTwo = resolveDivisionOptions({
      eligibleDivisionIds: [MEDIUM_LARGE],
      divisionRules: rules,
      rosterEntries: [{ assignedDivisionCode: 'MEDIUM_LARGE' }],
    });
    expect(oneOfTwo.selectable[0]).toMatchObject({ occupied: 1, remaining: 1 });

    const twoOfTwo = resolveDivisionOptions({
      eligibleDivisionIds: [MEDIUM_LARGE],
      divisionRules: rules,
      rosterEntries: [
        { assignedDivisionCode: 'MEDIUM_LARGE' },
        { assignedDivisionCode: 'MEDIUM_LARGE' },
      ],
    });
    expect(twoOfTwo.selectable).toEqual([]);
  });

  it('keeps the divisions that still have room when others are full', () => {
    const { selectable, full } = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED, NON_TUMBLING],
      divisionRules: rules,
      rosterEntries: [{ assignedDivisionCode: 'SMALL_COED' }],
    });

    expect(selectable.map(o => o.code)).toEqual(['NON_TUMBLING']);
    expect(full.map(o => o.code)).toEqual(['SMALL_COED']);
  });

  it('names every full division when several block the add', () => {
    const { blockedReason } = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED, NON_TUMBLING],
      divisionRules: rules,
      rosterEntries: [
        { assignedDivisionCode: 'SMALL_COED' },
        { assignedDivisionCode: 'NON_TUMBLING' },
      ],
    });

    expect(blockedReason).toBe(
      'Your Small Coed, Non Tumbling slots are already full. Release a team from one of them to add this one.',
    );
  });

  // Eligibility rules that existed before capacity was considered.
  it('ignores a division the roster template does not allocate', () => {
    const { selectable, full, blockedReason } = resolveDivisionOptions({
      eligibleDivisionIds: [INTERNATIONAL],
      divisionRules: rules,
      rosterEntries: [],
    });

    expect(selectable).toEqual([]);
    expect(full).toEqual([]);
    expect(blockedReason).toBe(
      'This Cheer Team is not eligible for any division in the League roster template.',
    );
  });

  it('ignores an entry with no division id', () => {
    expect(
      resolveDivisionOptions({
        eligibleDivisionIds: [{ code: 'SMALL_COED', name: 'Small Coed' }],
        divisionRules: rules,
        rosterEntries: [],
      }).selectable,
    ).toEqual([]);
  });

  it('matches division codes case-insensitively on both sides', () => {
    const { selectable } = resolveDivisionOptions({
      eligibleDivisionIds: [division('d1', 'small_coed', 'Small Coed')],
      divisionRules: rules,
      rosterEntries: [{ assignedDivisionCode: 'non_tumbling' }],
    });

    expect(selectable.map(o => o.code)).toEqual(['SMALL_COED']);
  });

  it('resolves an unpopulated division through the known cheer divisions', () => {
    const { selectable } = resolveDivisionOptions({
      eligibleDivisionIds: ['small-coed'],
      divisionRules: rules,
      rosterEntries: [],
    });

    expect(selectable.map(o => o.code)).toEqual(['SMALL_COED']);
  });

  it('explains a league with no roster template rather than blaming the team', () => {
    const { blockedReason } = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED],
      divisionRules: [],
      rosterEntries: [],
    });

    expect(blockedReason).toBe(
      'This league has no roster divisions set up yet, so teams cannot be added.',
    );
  });

  it('never offers the same division twice', () => {
    const { selectable } = resolveDivisionOptions({
      eligibleDivisionIds: [SMALL_COED, division('d9', 'SMALL_COED', 'Dup')],
      divisionRules: rules,
      rosterEntries: [],
    });

    expect(selectable).toHaveLength(1);
  });
});
