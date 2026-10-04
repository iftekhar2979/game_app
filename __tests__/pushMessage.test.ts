import {
  NOTIFICATION_LIST_SCREEN,
  newDeviceId,
  shouldRegister,
  targetForMessage,
} from '../src/notifications/pushMessage';

/**
 * Where a tapped notification lands.
 *
 * The payload is attacker-adjacent in the sense that matters here: it is built
 * on the server, stringified by Firebase, and arrives with no guarantee that
 * the fields the app wants are present. A tap must always open something, and
 * must never open a screen this app does not have.
 */

describe('routing a tap', () => {
  it.each(['DraftRoom', 'LeagueDetail', 'LeagueChat'])(
    'opens %s with the league id',
    screen => {
      expect(targetForMessage({ screen, relatedId: 'league-1' })).toEqual({
        screen,
        params: { leagueId: 'league-1' },
      });
      expect(targetForMessage({ screen })).toEqual({ screen: 'Notification' });
    },
  );

  it('opens the wallet from a notification', () => {
    expect(targetForMessage({ screen: 'Wallet' })).toEqual({
      screen: 'Wallet',
    });
  });

  it('rejects non-string ids and prototype property screen names', () => {
    expect(
      targetForMessage({ screen: 'DraftRoom', relatedId: { id: 'bad' } }),
    ).toEqual({ screen: 'Notification' });
    expect(targetForMessage({ screen: 'constructor' })).toEqual({
      screen: 'Notification',
    });
    expect(targetForMessage({ screen: 'toString' })).toEqual({
      screen: 'Notification',
    });
    expect(targetForMessage({ screen: 'PostDetails', relatedId: 'post-1' })).toEqual({
      screen: NOTIFICATION_LIST_SCREEN,
    });
    expect(targetForMessage({ relatedType: 'comment', relatedId: 'comment-1' })).toEqual({
      screen: NOTIFICATION_LIST_SCREEN,
    });
  });

  it('falls back to the notification list when the id is missing', () => {
    // A removed screen should never receive navigation, even with an old push.
    expect(targetForMessage({ screen: 'PostDetails' })).toEqual({
      screen: NOTIFICATION_LIST_SCREEN,
    });
  });

  it('refuses to open a screen this app does not have', () => {
    // The screen name comes off the wire. A server typo, or an older app
    // meeting a newer payload, must not navigate into nothing.
    expect(targetForMessage({ screen: 'SomeScreenFromTheFuture' })).toEqual({
      screen: NOTIFICATION_LIST_SCREEN,
    });
  });

  it('always returns somewhere to go', () => {
    for (const payload of [undefined, null, {}, { deepLink: '' }]) {
      expect(targetForMessage(payload as never).screen).toBe(
        NOTIFICATION_LIST_SCREEN,
      );
    }
  });

  it('routes a league notification to that league', () => {
    expect(
      targetForMessage({ screen: 'LeagueChat', relatedId: 'league-9' }),
    ).toEqual({ screen: 'LeagueChat', params: { leagueId: 'league-9' } });
  });

});

describe('the device id', () => {
  it('is long enough not to collide across installs', () => {
    expect(newDeviceId()).toHaveLength(32);
  });

  it('differs between installs', () => {
    expect(newDeviceId()).not.toBe(newDeviceId());
  });

  it('is still full length when the random source is degenerate', () => {
    // `Math.random` returning 0 would make a naive implementation produce an
    // empty string, and the server keys a device row on this.
    expect(newDeviceId(() => 0)).toHaveLength(32);
  });
});

describe('deciding whether to register', () => {
  it('registers a token the server has not seen', () => {
    expect(
      shouldRegister({
        token: 'new-token',
        lastRegisteredToken: null,
        isAuthenticated: true,
      }),
    ).toBe(true);
  });

  it('skips a token that has not changed', () => {
    // Otherwise every cold start spends a request telling the server something
    // it already knows.
    expect(
      shouldRegister({
        token: 'same',
        lastRegisteredToken: 'same',
        isAuthenticated: true,
      }),
    ).toBe(false);
  });

  it('registers again once Firebase rotates the token', () => {
    expect(
      shouldRegister({
        token: 'rotated',
        lastRegisteredToken: 'old',
        isAuthenticated: true,
      }),
    ).toBe(true);
  });

  it('never registers while signed out', () => {
    // There is no account to attach the device to, and the request would 401.
    expect(
      shouldRegister({
        token: 'a-token',
        lastRegisteredToken: null,
        isAuthenticated: false,
      }),
    ).toBe(false);
  });

  it('treats a blank token as no token', () => {
    for (const token of ['', '   ', null, undefined]) {
      expect(
        shouldRegister({
          token,
          lastRegisteredToken: null,
          isAuthenticated: true,
        }),
      ).toBe(false);
    }
  });
});
