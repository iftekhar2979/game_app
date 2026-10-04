import { ageFromBirthDate, canCreateAccount } from '../src/utils/ageGate';

describe('account age screen', () => {
  const today = new Date(2026, 9, 3);

  it('uses the local calendar birthday at the age-13 boundary', () => {
    expect(ageFromBirthDate('2013-10-03', today)).toBe(13);
    expect(canCreateAccount('2013-10-03', today)).toBe(true);
    expect(ageFromBirthDate('2013-10-04', today)).toBe(12);
    expect(canCreateAccount('2013-10-04', today)).toBe(false);
  });

  it('rejects invalid and future dates', () => {
    for (const value of ['', '2026-10-04', '2012-02-30', '2013-13-01', '99-01-01']) {
      expect(ageFromBirthDate(value, today)).toBeNull();
      expect(canCreateAccount(value, today)).toBe(false);
    }
    expect(ageFromBirthDate('2012-02-29', today)).toBe(14);
  });
});
