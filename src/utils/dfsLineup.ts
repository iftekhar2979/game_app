import type {
  DfsContest,
  DfsEntryLineupItem,
  DfsLineupPayloadItem,
  DfsLineupSlotConfig,
  DfsSlateTeam,
} from '../store/api/dfsApi';

export interface ExpandedDfsSlot {
  key: string;
  slot: string;
  divisionCodes: string[];
}

export type DfsLineupAssignments = Record<string, string | undefined>;

export const getEntityId = (
  value: string | { id?: string; _id?: string } | null | undefined,
): string => {
  if (typeof value === 'string') return value;
  return value?.id ?? value?._id ?? '';
};

export const expandDfsSlots = (
  configs: DfsLineupSlotConfig[] = [],
): ExpandedDfsSlot[] =>
  configs.flatMap(config =>
    Array.from({ length: config.count }, (_, index) => ({
      key: `${config.slot}-${index + 1}`,
      slot: config.slot,
      divisionCodes: config.divisionCodes ?? [],
    })),
  );

export const hydrateDfsLineup = (
  slots: ExpandedDfsSlot[],
  lineup: DfsEntryLineupItem[] = [],
): DfsLineupAssignments => {
  const remaining = [...lineup];
  return slots.reduce<DfsLineupAssignments>((assignments, slot) => {
    const matchIndex = remaining.findIndex(item => item.slot === slot.slot);
    if (matchIndex >= 0) {
      assignments[slot.key] = getEntityId(
        remaining.splice(matchIndex, 1)[0].seasonCheerTeamId,
      );
    }
    return assignments;
  }, {});
};

export const getSlateTeamId = (team: DfsSlateTeam): string =>
  getEntityId(team.seasonCheerTeamId);

export const buildDfsLineupPayload = (
  slots: ExpandedDfsSlot[],
  assignments: DfsLineupAssignments,
): DfsLineupPayloadItem[] =>
  slots
    .filter(slot => Boolean(assignments[slot.key]))
    .map(slot => ({
      slot: slot.slot,
      seasonCheerTeamId: assignments[slot.key] as string,
    }));

export const calculateDfsSalary = (
  assignments: DfsLineupAssignments,
  slateTeams: DfsSlateTeam[] = [],
): number => {
  const salaries = new Map(
    slateTeams.map(team => [getSlateTeamId(team), team.salary]),
  );
  return Object.values(assignments).reduce(
    (total, teamId) =>
      total + (teamId ? salaries.get(teamId) ?? 0 : 0),
    0,
  );
};

export const getDfsTeamName = (team: DfsSlateTeam): string => {
  const seasonCheerTeam = team.seasonCheerTeamId;
  if (typeof seasonCheerTeam === 'string') return 'Cheer team';
  if (seasonCheerTeam.teamName) return seasonCheerTeam.teamName;
  const cheerTeam = seasonCheerTeam.cheerTeamId;
  if (cheerTeam && typeof cheerTeam === 'object' && cheerTeam.name) {
    return cheerTeam.name;
  }
  return 'Cheer team';
};

export const getDfsTeamOrganization = (
  team: DfsSlateTeam,
): string | undefined => {
  const seasonCheerTeam = team.seasonCheerTeamId;
  if (typeof seasonCheerTeam === 'string') return undefined;
  const organization = seasonCheerTeam.organizationId;
  return typeof organization === 'object' ? organization.name : undefined;
};

export const getDfsTeamDivisionCodes = (team: DfsSlateTeam): string[] => {
  const seasonCheerTeam = team.seasonCheerTeamId;
  if (typeof seasonCheerTeam === 'string') return [];
  return (seasonCheerTeam.eligibleDivisionIds ?? [])
    .map(division => (typeof division === 'string' ? '' : division.code ?? ''))
    .filter(Boolean)
    .map(code => code.toUpperCase());
};

export const isDfsTeamCompatible = (
  slot: ExpandedDfsSlot,
  team: DfsSlateTeam,
): boolean => {
  const teamCodes = getDfsTeamDivisionCodes(team);
  if (teamCodes.length === 0 || slot.divisionCodes.length === 0) return true;
  return slot.divisionCodes.some(code => teamCodes.includes(code));
};

export const validateDfsLineup = (
  contest: DfsContest,
  slots: ExpandedDfsSlot[],
  assignments: DfsLineupAssignments,
  slateTeams: DfsSlateTeam[],
): string | undefined => {
  if (slots.some(slot => !assignments[slot.key])) {
    return 'Please fill all lineup spots.';
  }

  const selectedIds = slots.map(slot => assignments[slot.key] as string);
  if (new Set(selectedIds).size !== selectedIds.length) {
    return 'You have selected the same cheer team twice.';
  }

  const teamsById = new Map(
    slateTeams.map(team => [getSlateTeamId(team), team]),
  );
  for (const slot of slots) {
    const team = teamsById.get(assignments[slot.key] as string);
    if (!team) return 'One of your cheer teams is no longer available.';
    if (team.isLocked) return 'This cheer team is locked.';
    if (!isDfsTeamCompatible(slot, team)) {
      return `Choose a cheer team that can fill the ${slot.slot} spot.`;
    }
  }

  if (calculateDfsSalary(assignments, slateTeams) > contest.salaryCap) {
    return 'Your lineup is over the salary limit.';
  }

  return undefined;
};

export const isDfsEntryMissing = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === 'object' &&
      (error as { status?: unknown }).status === 404,
  );

export const getDfsErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  const raw =
    error && typeof error === 'object'
      ? (error as { data?: { message?: unknown }; message?: unknown }).data
          ?.message ?? (error as { message?: unknown }).message
      : undefined;
  const message = Array.isArray(raw)
    ? raw.join(' ')
    : typeof raw === 'string'
    ? raw
    : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('capacity') || normalized.includes('full')) {
    return 'This contest is full.';
  }
  if (
    normalized.includes('locked slate') ||
    normalized.includes('cheer teams cannot be selected')
  ) {
    return 'This cheer team is locked.';
  }
  if (
    normalized.includes('lock time') ||
    normalized.includes('started') ||
    normalized.includes('not open')
  ) {
    return 'The contest has started.';
  }
  if (
    normalized.includes('duplicate') ||
    normalized.includes('already entered')
  ) {
    return 'You already joined this contest.';
  }
  if (normalized.includes('salary')) {
    return 'Your lineup is over the salary limit.';
  }
  if (normalized.includes('lineup') || normalized.includes('slot')) {
    return message || 'Please check every lineup spot.';
  }
  return message || fallback;
};

/** Total lineup spots a contest asks an entrant to fill. */
export const countDfsLineupSpots = (contest: DfsContest): number =>
  (contest.lineupSlots ?? []).reduce(
    (total, slot) => total + Number(slot.count ?? 0),
    0,
  );

export const getContestJoinMessage = (
  contest: DfsContest,
  hasEntry = false,
  now = Date.now(),
): string | undefined => {
  if (hasEntry) return undefined;
  // A contest published without lineup slots cannot be entered by anyone. Say
  // so, rather than leaving an empty lineup behind a disabled submit button.
  if (countDfsLineupSpots(contest) < 1) {
    return 'This contest has no lineup spots set up yet.';
  }
  if (contest.type !== 'free' || contest.entryFee > 0) {
    return 'Paid contests are not available yet.';
  }
  if (contest.status !== 'open') {
    return contest.status === 'upcoming'
      ? 'This contest is not open yet.'
      : 'This contest is no longer available.';
  }
  if (new Date(contest.lockTime).getTime() <= now)
    return 'The contest has started.';
  if (contest.entrantCount >= contest.maxEntrants)
    return 'This contest is full.';
  return undefined;
};
