import {
  DRAFT_TYPE_OPTIONS,
  buildDraftSettings,
  isDraftTypeSupported,
} from '../src/constants/draftTypes';

describe('draft type options', () => {
  it('offers auction and snake as selectable', () => {
    expect(isDraftTypeSupported('auction')).toBe(true);
    expect(isDraftTypeSupported('snake')).toBe(true);
  });

  it('leaves linear and offline disabled', () => {
    expect(isDraftTypeSupported('linear')).toBe(false);
    expect(isDraftTypeSupported('offline')).toBe(false);
  });

  it('never lists random as a draft type', () => {
    // 'random' is a DraftOrderStrategy. Sending it as a type fails the server's
    // DraftType enum validation.
    expect(DRAFT_TYPE_OPTIONS.map((o) => o.value)).not.toContain('random');
    expect(DRAFT_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      'auction',
      'snake',
      'linear',
      'offline',
    ]);
  });
});

describe('buildDraftSettings', () => {
  const base = {
    startingBudget: 200,
    minimumBid: 1,
    bidIncrement: 1,
    nominationDurationSeconds: 30,
    biddingDurationSeconds: 20,
    pickDurationSeconds: 60,
  };

  it('sends type snake with a separate random order strategy', () => {
    const settings = buildDraftSettings({ ...base, type: 'snake' });

    expect(settings.type).toBe('snake');
    expect(settings.orderStrategy).toBe('random');
  });

  it('never collapses the order strategy into the draft type', () => {
    const settings = buildDraftSettings({ ...base, type: 'snake' });

    expect(settings.type).not.toBe('random');
  });

  it('keeps auction unchanged', () => {
    const settings = buildDraftSettings({ ...base, type: 'auction' });

    expect(settings.type).toBe('auction');
    expect(settings.orderStrategy).toBe('random');
    expect(settings.startingBudget).toBe(200);
  });

  it('clamps timers into the ranges the server accepts', () => {
    const settings = buildDraftSettings({
      ...base,
      type: 'snake',
      nominationDurationSeconds: 5000,
      biddingDurationSeconds: 1,
    });

    expect(settings.nominationDurationSeconds).toBe(300);
    expect(settings.biddingDurationSeconds).toBe(10);
  });
});
