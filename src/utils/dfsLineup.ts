import type {
  DfsContest,
  DfsEntryLineupItem,
  DfsLineupPayloadItem,
  DfsLineupSlotConfig,
  DfsSlateAthlete,
} from '../store/api/dfsApi';

export interface ExpandedDfsSlot {
  key: string;
  slot: string;
  positionCodes: string[];
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
      positionCodes: config.positionCodes ?? [],
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
        remaining.splice(matchIndex, 1)[0].seasonAthleteId,
      );
    }
    return assignments;
  }, {});
};

export const getSlateAthleteId = (athlete: DfsSlateAthlete): string =>
  getEntityId(athlete.seasonAthleteId);

export const buildDfsLineupPayload = (
  slots: ExpandedDfsSlot[],
  assignments: DfsLineupAssignments,
): DfsLineupPayloadItem[] =>
  slots
    .filter(slot => Boolean(assignments[slot.key]))
    .map(slot => ({
      slot: slot.slot,
      seasonAthleteId: assignments[slot.key] as string,
    }));

export const calculateDfsSalary = (
  assignments: DfsLineupAssignments,
  slateAthletes: DfsSlateAthlete[] = [],
): number => {
  const salaries = new Map(
    slateAthletes.map(athlete => [getSlateAthleteId(athlete), athlete.salary]),
  );
  return Object.values(assignments).reduce(
    (total, athleteId) =>
      total + (athleteId ? salaries.get(athleteId) ?? 0 : 0),
    0,
  );
};

export const getDfsAthleteName = (athlete: DfsSlateAthlete): string => {
  const seasonAthlete = athlete.seasonAthleteId;
  if (typeof seasonAthlete === 'string') return 'Player';
  const globalAthlete = seasonAthlete.athleteId;
  if (!globalAthlete || typeof globalAthlete === 'string') return 'Player';
  return (
    globalAthlete.displayName ||
    [globalAthlete.firstName, globalAthlete.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Player'
  );
};

export const getDfsAthletePositionCodes = (
  athlete: DfsSlateAthlete,
): string[] => {
  const seasonAthlete = athlete.seasonAthleteId;
  if (typeof seasonAthlete === 'string') return [];
  return (seasonAthlete.eligiblePositionIds ?? [])
    .map(position => (typeof position === 'string' ? '' : position.code ?? ''))
    .filter(Boolean);
};

export const isDfsAthleteCompatible = (
  slot: ExpandedDfsSlot,
  athlete: DfsSlateAthlete,
): boolean => {
  const athleteCodes = getDfsAthletePositionCodes(athlete);
  if (athleteCodes.length === 0 || slot.positionCodes.length === 0) return true;
  return slot.positionCodes.some(code => athleteCodes.includes(code));
};

export const validateDfsLineup = (
  contest: DfsContest,
  slots: ExpandedDfsSlot[],
  assignments: DfsLineupAssignments,
  slateAthletes: DfsSlateAthlete[],
): string | undefined => {
  if (slots.some(slot => !assignments[slot.key])) {
    return 'Please fill all lineup spots.';
  }

  const selectedIds = slots.map(slot => assignments[slot.key] as string);
  if (new Set(selectedIds).size !== selectedIds.length) {
    return 'You have selected the same player twice.';
  }

  const athletesById = new Map(
    slateAthletes.map(athlete => [getSlateAthleteId(athlete), athlete]),
  );
  for (const slot of slots) {
    const athlete = athletesById.get(assignments[slot.key] as string);
    if (!athlete) return 'One of your players is no longer available.';
    if (athlete.isLocked) return 'This player is locked.';
    if (!isDfsAthleteCompatible(slot, athlete)) {
      return `Choose a player who can fill the ${slot.slot} spot.`;
    }
  }

  if (calculateDfsSalary(assignments, slateAthletes) > contest.salaryCap) {
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
    normalized.includes('locked player') ||
    normalized.includes('player is locked')
  ) {
    return 'This player is locked.';
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

export const getContestJoinMessage = (
  contest: DfsContest,
  hasEntry = false,
  now = Date.now(),
): string | undefined => {
  if (hasEntry) return undefined;
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
