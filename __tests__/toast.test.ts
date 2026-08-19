import { formatToastMessage } from '../src/utils/toast';

describe('formatToastMessage', () => {
  it('passes a plain string through', () => {
    expect(formatToastMessage('Something went wrong')).toBe('Something went wrong');
  });

  it('joins a validation error array instead of throwing', () => {
    // class-validator returns message as string[] on a 422. Calling .replace on
    // an array threw inside the caller's catch block, which surfaced as an
    // unhandled promise rejection rather than a toast.
    expect(
      formatToastMessage(['name should not be empty', 'maxTeams must be a number']),
    ).toBe('name should not be empty\nmaxTeams must be a number');
  });

  it('reads .message off an error-shaped object', () => {
    expect(formatToastMessage({ message: 'Boom' })).toBe('Boom');
  });

  it('serialises an object with no message rather than crashing', () => {
    expect(formatToastMessage({ statusCode: 500 })).toBe('{"statusCode":500}');
  });

  it('returns undefined for null and undefined', () => {
    expect(formatToastMessage(undefined)).toBeUndefined();
    expect(formatToastMessage(null)).toBeUndefined();
  });

  it('still humanises ISO timestamps and LOCKED prefixes', () => {
    expect(formatToastMessage('LOCKED: try later')).toBe('Locked: try later');
    expect(formatToastMessage('starts 2026-09-01T00:00:00Z')).not.toContain('T00:00:00Z');
  });
});
