export const FANTASY_MATCH_PERIODS = [
  { number: 1, dates: 'Dec 4–6' },
  { number: 2, dates: 'Dec 11–13' },
  { number: 3, dates: 'Dec 18–21 and Jan 8–10' },
  { number: 4, dates: 'Jan 15–17' },
  { number: 5, dates: 'Jan 22–24 and Jan 29–31' },
  { number: 6, dates: 'Feb 5–7 and Feb 12–14' },
  { number: 7, dates: 'Feb 19–21' },
  { number: 8, dates: 'Feb 26–28' },
  { number: 9, dates: 'Mar 5–7' },
  { number: 10, dates: 'Mar 12–14' },
  { number: 11, dates: 'Mar 19–21', championship: true },
] as const;

export const fantasyMatchLabel = (number: number) =>
  number === 11 ? 'Championship' : `Match ${number}`;
