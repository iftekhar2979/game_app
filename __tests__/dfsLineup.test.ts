import {
  buildDfsLineupPayload,
  calculateDfsSalary,
  expandDfsSlots,
  getContestJoinMessage,
  getDfsErrorMessage,
  hydrateDfsLineup,
  validateDfsLineup,
} from '../src/utils/dfsLineup';
import type { DfsContest, DfsSlateTeam } from '../src/store/api/dfsApi';

const contest: DfsContest = {
  title: 'Starter Contest',
  type: 'free',
  entryFee: 0,
  maxEntrants: 10,
  entrantCount: 1,
  lineupSlots: [
    { slot: 'DIVISION_1', divisionCodes: ['SMALL_COED'], count: 2 },
  ],
  salaryCap: 200,
  lockTime: '2099-01-01T00:00:00.000Z',
  status: 'open',
};

const teams: DfsSlateTeam[] = [
  {
    seasonCheerTeamId: 'one',
    salary: 80,
    projectedPoints: 10,
    isLocked: false,
  },
  {
    seasonCheerTeamId: 'two',
    salary: 100,
    projectedPoints: 8,
    isLocked: false,
  },
];

describe('DFS lineup helpers', () => {
  it('expands configured slot counts and hydrates an existing complete lineup', () => {
    const slots = expandDfsSlots(contest.lineupSlots);
    const assignments = hydrateDfsLineup(slots, [
      { slot: 'DIVISION_1', seasonCheerTeamId: 'one' },
      { slot: 'DIVISION_1', seasonCheerTeamId: 'two' },
    ]);

    expect(slots.map(slot => slot.key)).toEqual(['DIVISION_1-1', 'DIVISION_1-2']);
    expect(assignments).toEqual({ 'DIVISION_1-1': 'one', 'DIVISION_1-2': 'two' });
  });

  it('builds a request containing only slot and seasonCheerTeamId', () => {
    const slots = expandDfsSlots(contest.lineupSlots);
    expect(
      buildDfsLineupPayload(slots, { 'DIVISION_1-1': 'one', 'DIVISION_1-2': 'two' }),
    ).toEqual([
      { slot: 'DIVISION_1', seasonCheerTeamId: 'one' },
      { slot: 'DIVISION_1', seasonCheerTeamId: 'two' },
    ]);
  });

  it('uses slate salaries for the running total', () => {
    expect(calculateDfsSalary({ a: 'one', b: 'two' }, teams)).toBe(180);
  });

  it('rejects incomplete, duplicate, locked, and over-cap lineups', () => {
    const slots = expandDfsSlots(contest.lineupSlots);
    expect(
      validateDfsLineup(contest, slots, { 'DIVISION_1-1': 'one' }, teams),
    ).toBe('Please fill all lineup spots.');
    expect(
      validateDfsLineup(
        contest,
        slots,
        { 'DIVISION_1-1': 'one', 'DIVISION_1-2': 'one' },
        teams,
      ),
    ).toBe('You have selected the same cheer team twice.');
    expect(
      validateDfsLineup(contest, slots, { 'DIVISION_1-1': 'one', 'DIVISION_1-2': 'two' }, [
        { ...teams[0], isLocked: true },
        teams[1],
      ]),
    ).toBe('This cheer team is locked.');
    expect(
      validateDfsLineup(
        { ...contest, salaryCap: 150 },
        slots,
        { 'DIVISION_1-1': 'one', 'DIVISION_1-2': 'two' },
        teams,
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
