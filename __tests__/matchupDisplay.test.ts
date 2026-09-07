import {
  buildTeamAvatarLookup,
  resolveTeamAvatarUri,
  formatFantasyPoints,
  formatGameStatus,
  formatMatchupScore,
} from '../src/components/LeagueDetail/matchupDisplay';

describe('matchup display values', () => {
  it('renders positive, zero, and negative scores without truthy fallbacks', () => {
    expect(formatMatchupScore(12)).toBe('12');
    expect(formatMatchupScore(0)).toBe('0');
    expect(formatMatchupScore(-3)).toBe('-3');
    expect(formatFantasyPoints(12)).toBe('+12 pts');
    expect(formatFantasyPoints(0)).toBe('0 pts');
    expect(formatFantasyPoints(-3)).toBe('-3 pts');
  });

  it('does not invent zero points or an upcoming status for missing data', () => {
    expect(formatMatchupScore(undefined)).toBe('—');
    expect(formatFantasyPoints(undefined)).toBe('Not scored');
    expect(formatGameStatus(undefined)).toBe('Status unavailable');
  });
});

describe('matchup team avatars', () => {
  const members = {
    data: [
      {
        team: { _id: 'team-a', avatarUri: 'https://signed/a.png' },
        user: { avatarUrl: 'https://user/a.png' },
      },
      { team: { _id: 'team-b' }, user: { avatarUrl: 'https://user/b.png' } },
      { team: { _id: 'team-c' }, user: {} },
    ],
  };

  it('keys avatars by fantasy team id from a wrapped or bare response', () => {
    const wrapped = buildTeamAvatarLookup(members);
    const bare = buildTeamAvatarLookup(members.data);
    expect(wrapped).toEqual(bare);
    expect(wrapped['team-a']).toBe('https://signed/a.png');
  });

  it("falls back to the owner's avatar when the team has no logo", () => {
    expect(buildTeamAvatarLookup(members)['team-b']).toBe('https://user/b.png');
  });

  it('omits teams with no picture at all rather than storing empty strings', () => {
    expect(buildTeamAvatarLookup(members)).not.toHaveProperty('team-c');
  });

  it('survives a missing or malformed members response', () => {
    expect(buildTeamAvatarLookup(undefined)).toEqual({});
    expect(buildTeamAvatarLookup({ data: null })).toEqual({});
    expect(buildTeamAvatarLookup([null, {}, { team: {} }])).toEqual({});
  });

  // The regression: the matchup endpoint sends avatarUri, but no fantasy team
  // has a logo for it to carry, so every header fell back to "MY"/"OPP".
  it('resolves a side that the matchup endpoint left blank', () => {
    const lookup = buildTeamAvatarLookup(members);
    expect(
      resolveTeamAvatarUri({ fantasyTeamId: 'team-b', avatarUri: null }, lookup),
    ).toBe('https://user/b.png');
  });

  it('prefers a real team logo from the matchup endpoint over the lookup', () => {
    const lookup = { 'team-a': 'https://user/a.png' };
    expect(
      resolveTeamAvatarUri(
        { fantasyTeamId: 'team-a', avatarUri: 'https://logo/a.png' },
        lookup,
      ),
    ).toBe('https://logo/a.png');
  });

  it('returns undefined so the lettered placeholder still renders', () => {
    const lookup = buildTeamAvatarLookup(members);
    expect(resolveTeamAvatarUri({ fantasyTeamId: 'team-c' }, lookup)).toBeUndefined();
    expect(resolveTeamAvatarUri(undefined, lookup)).toBeUndefined();
    expect(resolveTeamAvatarUri({}, lookup)).toBeUndefined();
  });
});
