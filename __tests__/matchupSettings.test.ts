import {
  buildMatchupSettings,
} from '../src/constants/matchupSettings';

describe('create-league matchup settings', () => {
  it('uses the fixed Season Long Fantasy format accepted by the server', () => {
    expect(buildMatchupSettings()).toEqual({
      format: 'total_points',
      tiebreaker: 'none',
    });
  });
});
