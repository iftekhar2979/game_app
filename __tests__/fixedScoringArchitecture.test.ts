import fs from 'fs';
import path from 'path';

const read = (relativePath: string) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

/**
 * Comments legitimately name the fields we are banning - the whole point of
 * those comments is to say "do not re-add these" - so identifier checks run
 * against code only.
 */
const readCode = (relativePath: string) =>
  read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

const walk = (dir: string): string[] => {
  const absolute = path.join(__dirname, '..', dir);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(next);
    return /\.tsx?$/.test(entry.name) ? [next] : [];
  });
};

const sourceFiles = walk('src');

/**
 * Scoring is a single fixed system. These assertions exist so that a future
 * change reintroducing per-league or server-driven scoring configuration fails
 * loudly here instead of silently producing two disagreeing sets of rules.
 */
describe('fixed scoring architecture', () => {
  it('exposes no scoring-settings endpoint or hook', () => {
    const leagueApi = read('src/store/api/leagueApi.ts');

    expect(leagueApi).not.toContain('getScoringSettings');
    expect(leagueApi).not.toContain('useGetScoringSettingsQuery');
    expect(leagueApi).not.toContain('scoring-settings');
    expect(leagueApi).not.toContain('interface ScoringRule');
    expect(leagueApi).not.toContain('interface ScoringSettings');
  });

  it('keeps no scoring overrides on the league update contract', () => {
    const leagueApi = readCode('src/store/api/leagueApi.ts');
    const forbidden = [
      'scoreBands',
      'divisionWinBonuses',
      'lastPlacePenalties',
      'hitZeroBonus',
      'grandChampionBonus',
      'officialScoreMultiplier',
      'deductionMultiplier',
      'placementPoints',
    ];

    forbidden.forEach(field => expect(leagueApi).not.toContain(field));
  });

  it('has no scoring settings modal anywhere in the app', () => {
    sourceFiles.forEach(file => {
      expect(readCode(file)).not.toContain('ScoringSettingsSubModal');
    });
  });

  it('never submits client-calculated fantasy points to the server', () => {
    sourceFiles.forEach(file => {
      const source = readCode(file);
      expect(source).not.toContain('fantasyPoints:');
      expect(source).not.toContain('fantasyPointsBreakdown:');
    });
  });

  it('defines the scoring numbers in exactly one module', () => {
    const owners = sourceFiles.filter(file => {
      const source = readCode(file);
      return (
        source.includes('export const SCORE_BANDS') ||
        source.includes('export const DIVISION_WIN_BONUSES') ||
        source.includes('export const LAST_PLACE_PENALTIES') ||
        source.includes('export const HIT_ZERO_BONUS') ||
        source.includes('export const GRAND_CHAMPION_BONUS')
      );
    });

    expect(owners).toEqual([path.join('src', 'utils', 'cheerScoring.ts')]);
  });

  it('renders the same rules component in the app and the admin dashboard', () => {
    expect(read('src/screens/Admin/AdminCheerScreen.tsx')).toContain(
      'FixedScoringRulesList',
    );
    expect(read('src/components/Scoring/FixedScoringRules.tsx')).toContain(
      'export const ScoringRulesTab',
    );
  });
});
