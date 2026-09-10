# Push notifications

The mobile app uses the existing Firebase setup and `/notifications` inbox. The corresponding server changes are in `D:/gameapp/cheerleadingapp_server`.

| Alert | Server trigger | Opens |
| --- | --- | --- |
| Your turn to pick | Committed draft start or next pick | DraftRoom |
| Draft starts soon | Within 15 minutes of the saved draft time | DraftRoom (LeagueDetail for auctions) |
| Set your starters | Within one hour of competition start, for active leagues in its season and period | LeagueDetail, Team tab |
| Scores published | Official performance scored by FantasyCheerService | LeagueDetail |
| Matchup final | Successful finalize-period transaction | LeagueDetail |
| League chat | Saved chat message; other active members only | LeagueChat |
| Manager joined | Successful membership transaction; existing members only | LeagueDetail |
| Comment/reaction/reply | Existing social service, with distinct comment/reply event keys and actor names | PostDetails |
| Coin reward | Committed positive GRANT wallet credit | Wallet |

## Delivery behavior

- Reminders and pending reward credits are checked every 30 seconds while the server is running. A late reminder reports the remaining minutes; deadlines already passed are skipped. Schedules are reread, so edits and cancellations take effect automatically.
- MongoDB's existing unique notification index prevents duplicate inbox items. Stable BullMQ job IDs prevent duplicate queued deliveries. Queue priority follows the five requested priorities.
- Before delivery, the server checks current membership, current draft pick, and reminder schedule. Deadline alerts also carry Android TTL and APNs expiration.
- Reward delivery bookkeeping is saved alongside the wallet credit in its transaction and retried until a notification job has been queued. Other domain hooks log notification failures without failing an already committed user action; they are not a transactional outbox.
- Foreground banners are tappable. Background and cold-start taps use the same route resolver as the inbox. Routes received before sign-in wait until the authenticated navigator is available.
- Device registration is scoped to the account and installation. Sign-out unregisters the installation on the server and deletes the Firebase token.
- Android 13 permission uses `PermissionsAndroid`, as required by the [React Native Firebase documentation](https://rnfirebase.io/messaging/usage). The native app creates a separate high-importance draft/lineup channel.

## Reward integration boundary

This server has DFS contest and entry models but no payout settlement endpoint/service or daily claim workflow. Notification work does not introduce payout calculations or issue coins. Future settlement/daily-claim code should use `WalletService.credit` with `type: CoinTransactionType.GRANT` and an idempotency key. For DFS rewards, also supply `referenceType: CoinReferenceType.DFS_ENTRY` and the entry ID as `referenceId`; the notification resolves the contest title from that entry. Existing administrative grants already use this credit path.

## Verification on a device

Restart/redeploy the server and rebuild the mobile app for the native channel change. Keep the existing Firebase credentials, APNs configuration, Redis worker, and MongoDB notification indexes enabled.

With two signed-in accounts in a test league, verify a draft start and next pick, a chat message, a join, official score publication, period finalization, and a committed coin grant. Test notification taps with the app foregrounded, backgrounded, and fully closed. Schedule a draft 15 minutes ahead and a competition one hour ahead, then test rescheduling/cancellation before delivery. Check that signing out stops notifications to that installation.

Automated checks use mocked Firebase and database boundaries; they do not prove delivery to a physical phone. No live pushes or financial credits were sent as part of these checks.
