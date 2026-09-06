import { CHEER_DIVISIONS } from '../../utils/cheerScoring';

export interface DivisionRuleLike {
  divisionCode: string;
  divisionName?: string;
  exactTeamCount: number;
}

/** Any roster row that records which division slot it occupies. */
export interface RosterOccupantLike {
  assignedDivisionCode?: string | null;
}

export interface DivisionOption {
  id: string;
  code: string;
  name: string;
  exactTeamCount: number;
  occupied: number;
  remaining: number;
}

export interface DivisionOptionsInput {
  /** Raw `eligibleDivisionIds` off a season cheer team - populated or not. */
  eligibleDivisionIds?: unknown[];
  divisionRules?: DivisionRuleLike[] | null;
  /** The viewer's own active roster rows. */
  rosterEntries?: RosterOccupantLike[] | null;
}

export interface DivisionOptionsResult {
  /** Divisions this team may be added to right now. */
  selectable: DivisionOption[];
  /** Eligible and allocated, but the roster already holds its full allocation. */
  full: DivisionOption[];
  /** Why nothing is selectable, phrased for the manager. */
  blockedReason: string | null;
}

/** Normalises one raw eligible-division entry into id/code/name. */
const describeDivision = (division: any) => {
  const fallback = CHEER_DIVISIONS.find(
    option => option.id === division || option.code === division,
  );
  const isObject = division && typeof division === 'object';
  return {
    id: String(isObject ? division._id || division.id || '' : division ?? ''),
    code: String(
      (isObject ? division.code : fallback?.code) || '',
    ).toUpperCase(),
    name:
      (isObject ? division.name || division.code : fallback?.name) ||
      'Cheer division',
  };
};

const listNames = (options: DivisionOption[]) =>
  options.map(option => option.name).join(', ');

/**
 * Which divisions a cheer team can actually be added to.
 *
 * Eligibility alone is not enough: every division rule is an *exact*
 * allocation, so a division the roster has already filled is not a legal
 * target even though the team qualifies for it. Offering one anyway is what
 * made replacing a released team look broken - the pick was accepted by the
 * UI and then rejected by the server with "already has its exact allocation".
 *
 * Occupancy is counted from the roster's active rows, so releasing a team
 * frees its division here as soon as the roster reloads.
 */
export const resolveDivisionOptions = ({
  eligibleDivisionIds,
  divisionRules,
  rosterEntries,
}: DivisionOptionsInput): DivisionOptionsResult => {
  const rules = divisionRules ?? [];
  if (!rules.length) {
    return {
      selectable: [],
      full: [],
      blockedReason:
        'This league has no roster divisions set up yet, so teams cannot be added.',
    };
  }

  const ruleByCode = new Map(
    rules.map(rule => [String(rule.divisionCode).toUpperCase(), rule]),
  );

  const occupiedByCode = new Map<string, number>();
  for (const entry of rosterEntries ?? []) {
    const code = String(entry?.assignedDivisionCode ?? '').toUpperCase();
    if (!code) continue;
    occupiedByCode.set(code, (occupiedByCode.get(code) ?? 0) + 1);
  }

  const allocated: DivisionOption[] = [];
  const seen = new Set<string>();
  for (const raw of eligibleDivisionIds ?? []) {
    const described = describeDivision(raw);
    const rule = ruleByCode.get(described.code);
    // Unchanged from before: an entry with no id, or a division the roster
    // template does not allocate, is not a candidate at all.
    if (!described.id || !rule || seen.has(described.code)) continue;
    seen.add(described.code);

    const exactTeamCount = Number(rule.exactTeamCount) || 0;
    const occupied = occupiedByCode.get(described.code) ?? 0;
    allocated.push({
      ...described,
      name: rule.divisionName || described.name,
      exactTeamCount,
      occupied,
      remaining: Math.max(0, exactTeamCount - occupied),
    });
  }

  if (!allocated.length) {
    return {
      selectable: [],
      full: [],
      blockedReason:
        'This Cheer Team is not eligible for any division in the League roster template.',
    };
  }

  const selectable = allocated.filter(option => option.remaining > 0);
  const full = allocated.filter(option => option.remaining <= 0);

  return {
    selectable,
    full,
    blockedReason: selectable.length
      ? null
      : `Your ${listNames(full)} ${
          full.length > 1 ? 'slots are' : 'slot is'
        } already full. Release a team from ${
          full.length > 1 ? 'one of them' : 'it'
        } to add this one.`,
  };
};
