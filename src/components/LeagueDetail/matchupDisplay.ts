export function formatMatchupScore(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : '—';
}

export function formatFantasyPoints(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not scored';
  return `${value > 0 ? '+' : ''}${value} pts`;
}

export function formatGameStatus(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value
    : 'Status unavailable';
}

/**
 * Team avatars keyed by fantasy team id, taken from the league members list.
 *
 * The matchup endpoint carries `avatarUri` on each side, but a fantasy team has
 * no logo of its own to put there - nothing in the product writes one. The
 * members endpoint already solves this: it falls back to the owner's avatar and
 * hands back a signed URL, so the same picture the roster and draft room show
 * can fill the matchup header too.
 *
 * Accepts the raw query result because the endpoint is sometimes unwrapped to a
 * bare array and sometimes left as `{ data: [...] }`.
 */
export function buildTeamAvatarLookup(membersData: any): Record<string, string> {
  const members = Array.isArray(membersData)
    ? membersData
    : Array.isArray(membersData?.data)
    ? membersData.data
    : [];

  const lookup: Record<string, string> = {};
  for (const member of members) {
    const team = member?.team;
    const teamId = team?._id ?? team?.id;
    const uri = team?.avatarUri || team?.logoUrl || member?.user?.avatarUrl;
    if (teamId && typeof uri === 'string' && uri) {
      lookup[String(teamId)] = uri;
    }
  }
  return lookup;
}

/**
 * The picture to draw for one side of a matchup, or undefined to keep the
 * lettered placeholder.
 *
 * Prefers whatever the matchup endpoint sent, so a real team logo still wins
 * once teams can carry one.
 */
export function resolveTeamAvatarUri(
  team: any,
  lookup: Record<string, string>,
): string | undefined {
  if (typeof team?.avatarUri === 'string' && team.avatarUri) {
    return team.avatarUri;
  }
  const id = team?.fantasyTeamId;
  return id ? lookup[String(id)] : undefined;
}
