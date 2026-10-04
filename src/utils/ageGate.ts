/** Birth dates are interpreted as calendar dates, never UTC instants. */
export function ageFromBirthDate(value: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);
  if (
    year < 1900 ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day ||
    birthDate > today
  ) return null;

  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

export const canCreateAccount = (value: string, today = new Date()) => {
  const age = ageFromBirthDate(value, today);
  return age !== null && age >= 13;
};
