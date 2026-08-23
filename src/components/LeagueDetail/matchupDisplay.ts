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
