import {
  buildDfsLineupPayload,
  calculateDfsSalary,
  expandDfsSlots,
  getContestJoinMessage,
  getDfsErrorMessage,
  hydrateDfsLineup,
  validateDfsLineup,
} from '../src/utils/dfsLineup';
import type { DfsContest, DfsSlateAthlete } from '../src/store/api/dfsApi';

const contest: DfsContest = {
  title: 'Starter Contest',
  type: 'free',
  entryFee: 0,
  maxEntrants: 10,
  entrantCount: 1,
  lineupSlots: [{ slot: 'BASE', positionCodes: ['BASE'], count: 2 }],
  salaryCap: 200,
  lockTime: '2099-01-01T00:00:00.000Z',
  status: 'open',
};

const athletes: DfsSlateAthlete[] = [
  { seasonAthleteId: 'one', salary: 80, projectedPoints: 10, isLocked: false },
  { seasonAthleteId: 'two', salary: 100, projectedPoints: 8, isLocked: false },
];

describe('DFS lineup helpers', () => {
  it('expands configured slot counts and hydrates an existing complete lineup', () => {
    const slots = expandDfsSlots(contest.lineupSlots);
    const assignments = hydrateDfsLineup(slots, [
      { slot: 'BASE', seasonAthleteId: 'one' },
      { slot: 'BASE', seasonAthleteId: 'two' },
    ]);

    expect(slots.map(slot => slot.key)).toEqual(['BASE-1', 'BASE-2']);
    expect(assignments).toEqual({ 'BASE-1': 'one', 'BASE-2': 'two' });
  });

  it('builds a request containing only slot and seasonAthleteId', () => {
    const slots = expandDfsSlots(contest.lineupSlots);
    expect(
      buildDfsLineupPayload(slots, { 'BASE-1': 'one', 'BASE-2': 'two' }),
    ).toEqual([
      { slot: 'BASE', seasonAthleteId: 'one' },
      { slot: 'BASE', seasonAthleteId: 'two' },
    ]);
  });

  it('uses slate salaries for the running total', () => {
    expect(calculateDfsSalary({ a: 'one', b: 'two' }, athletes)).toBe(180);
  });

  it('rejects incomplete, duplicate, locked, and over-cap lineups', () => {
    const slots = expandDfsSlots(contest.lineupSlots);
    expect(
      validateDfsLineup(contest, slots, { 'BASE-1': 'one' }, athletes),
    ).toBe('Please fill all lineup spots.');
    expect(
      validateDfsLineup(
        contest,
        slots,
        { 'BASE-1': 'one', 'BASE-2': 'one' },
        athletes,
      ),
    ).toBe('You have selected the same player twice.');
    expect(
      validateDfsLineup(contest, slots, { 'BASE-1': 'one', 'BASE-2': 'two' }, [
        { ...athletes[0], isLocked: true },
        athletes[1],
      ]),
    ).toBe('This player is locked.');
    expect(
      validateDfsLineup(
        { ...contest, salaryCap: 150 },
        slots,
        { 'BASE-1': 'one', 'BASE-2': 'two' },
        athletes,
      ),
    ).toBe('Your lineup is over the salary limit.');
  });

  it('turns common backend failures into simple messages', () => {
    expect(
      getDfsErrorMessage({ data: { message: 'Contest capacity reached' } }),
    ).toBe('This contest is full.');
    expect(
      getDfsErrorMessage({ data: { message: 'Contest lock time passed' } }),
    ).toBe('The contest has started.');
  });

  it('reports why a contest cannot be joined', () => {
    expect(getContestJoinMessage({ ...contest, status: 'upcoming' })).toBe(
      'This contest is not open yet.',
    );
    expect(getContestJoinMessage({ ...contest, entrantCount: 10 })).toBe(
      'This contest is full.',
    );
    expect(getContestJoinMessage(contest)).toBeUndefined();
  });
});
