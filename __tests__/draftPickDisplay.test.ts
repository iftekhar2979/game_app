import { describeDraftPick } from '../src/components/LeagueDetail/draftPickDisplay';
import type { DraftPickRecord } from '../src/store/api/leagueApi';

const basePick: DraftPickRecord = {
  pickNumber: 3,
  round: 1,
  fantasyTeamId: 'team-1',
  teamName: 'My Fantasy Squad',
  pickedAt: '2026-09-06T00:00:00.000Z',
};

describe('draft pick display', () => {
  it('names the cheer team and reports its division', () => {
    expect(
      describeDraftPick({
        ...basePick,
        seasonCheerTeamId: 'sct-1',
        cheerTeamName: 'Cheer Athletics Panthers',
        organizationName: 'Cheer Athletics',
        assignedDivisionCode: 'SMALL_COED',
        assignedDivisionName: 'Small Coed',
      }),
    ).toEqual({
      name: 'Cheer Athletics Panthers',
      detail: 'Cheer Athletics • Small Coed',
    });
  });

  it('falls back to the division code when no name came back', () => {
    expect(
      describeDraftPick({
        ...basePick,
        cheerTeamName: 'Top Gun Large Coed',
        assignedDivisionCode: 'MEDIUM_LARGE_COED',
        assignedDivisionName: null,
      }).detail,
    ).toBe('MEDIUM_LARGE_COED');
  });

  // The regression: a cheer pick read through the athlete field names rendered
  // an empty card, which is what "blank boxes" looked like on My Picks.
  it('never renders an empty name for a cheer pick', () => {
    const described = describeDraftPick({
      ...basePick,
      cheerTeamName: 'Stingrays Orange',
    });
    expect(described.name).toBe('Stingrays Orange');
    expect(described.name).not.toBe('');
  });

  it('still reads a legacy athlete pick', () => {
    expect(
      describeDraftPick({
        ...basePick,
        seasonAthleteId: 'sa-1',
        playerName: 'Jamie Flyer',
        nflTeam: 'DAL',
        positionCode: 'WR',
      }),
    ).toEqual({ name: 'Jamie Flyer', detail: 'DAL • WR' });
  });

  it('degrades to a readable placeholder when a pick carries neither shape', () => {
    expect(describeDraftPick(basePick)).toEqual({
      name: 'Unknown pick',
      detail: null,
    });
  });
});
