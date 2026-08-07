# League API App Integration Design

## Objective

Replace the React Native app's mock and device-local league behavior with the current NestJS league module. Users can discover, create, inspect, join, configure, leave, and administer leagues through authenticated API calls. Private invitation QR codes use verified HTTPS links that open GameApp from the phone's normal camera application.

## Scope

This integration covers every route currently exposed by `LeaguesController`:

- `POST /leagues`
- `GET /leagues`
- `GET /leagues/:id`
- `PATCH /leagues/:id`
- `POST /leagues/:id/join`
- `POST /leagues/join-by-code`
- `POST /leagues/:id/leave`
- `DELETE /leagues/:id/members/:userId`
- `POST /leagues/:id/invitations`
- `GET /leagues/:id/invitations`
- `DELETE /leagues/:id/invitations/:invitationId`
- `GET /leagues/:id/members`
- `GET /leagues/:id/available-athletes`
- `GET /leagues/:id/rosters`

It also includes the minimal backend season read required to provide a valid `seasonId` during league creation, verified Android App Links, iOS Universal Links, invitation-link routing, authentication resume behavior, and a browser fallback page.

Auction control, bidding, standings, team editing, lineup changes, points, and league deletion are outside this integration because the current backend controller does not expose those routes. Existing UI controls for unsupported operations must be hidden or presented as unavailable; they must never simulate success with local state.

## Architecture

RTK Query is the authoritative client-side source for server league data. A typed `leaguesApi` injected into the existing authenticated `baseApi` owns league requests, cache tags, pagination contracts, request types, and response types. Screens consume generated query and mutation hooks instead of the local `leagueSlice`.

The local league slice and all league mock collections are removed after all consumers migrate. React Navigation remains responsible for screen state and deep-link routing. Temporary form state stays local to its screen; server entities are not copied into another Redux slice.

The app normalizes only transport-level variations at the API boundary. UI components receive a stable app-facing league model using backend fields such as `_id`, `name`, `logoUrl`, `maxTeams`, `joinedTeamCount`, `status`, `visibility`, and nested settings. The old `id`, `logoUri`, `membersCount`, `draftDate`, and `draftTime` mock shape is not retained as a second domain model.

## API Contracts

### Required season endpoint

The backend currently requires `seasonId` in `CreateLeagueDto`, but `SeasonsController` exposes no read operation. The integration therefore adds an authenticated `GET /seasons` endpoint with `page`, `limit`, and optional `status` query parameters. It returns the existing pagination envelope and only the fields needed by the app:

```ts
interface SeasonSummary {
  _id: string;
  name: string;
  slug: string;
  status: 'draft' | 'registration_open' | 'active' | 'completed' | 'cancelled';
  registrationStartsAt: string;
  registrationEndsAt: string;
  startsAt: string;
  endsAt: string;
}
```

The create screen requests seasons that presently accept league registration. The server, not the client, determines eligibility from status and registration dates. No roster-template or scoring-rule internals are exposed by this endpoint.

### League creation

The create form sends the backend's required nested contract:

```ts
interface CreateLeagueRequest {
  seasonId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  visibility: 'public' | 'private';
  maxTeams: number;
  fantasyTeamName: string;
  draftSettings: {
    type: 'auction';
    orderStrategy: 'random' | 'manual' | 'reverse_standings';
    startingBudget: number;
    minimumBid: number;
    bidIncrement: number;
    nominationDurationSeconds: number;
    biddingDurationSeconds: number;
    pickDurationSeconds?: number;
    draftStartsAt?: string;
  };
}
```

The UI offers only the executable `auction` draft type. It validates names, the 4-20 team bound, integer credit/timer values, future UTC draft time, and cross-field budget constraints before submission. Backend validation remains authoritative.

Logo selection is included only when a selected file can first be uploaded and converted to a backend-reachable URL. A device `file://` URI must never be sent as `logoUrl`. Until a league-logo upload endpoint or approved presigned-upload flow is available, logo selection is omitted from the submitted request and the UI explains that a default image will be used.

### Discovery and detail

League discovery supports `page`, `limit`, `term`, `seasonId`, `status`, `visibility`, and `mine`. The Fantasy League screen has separate discoverable and joined views driven by query parameters rather than merged mock arrays. Pagination appends pages while filters or search reset to page one.

Detail requests consume `{ league, caller }`. `caller.isMember`, `caller.isCreator`, `caller.canJoin`, and `caller.canEdit` control actions and settings visibility. Private-league `403` responses do not leak detail data.

### Membership

Public joining sends `{ fantasyTeamName }` to `/leagues/:id/join`. Manual private joining sends `{ code, fantasyTeamName, joinMethod: 'join_code' }` to `/leagues/join-by-code`. Invite links use `invite_link`; QR-originated links use `qr_code`.

Leaving and creator member removal use their existing `204` routes. The app asks for confirmation before either destructive membership action and invalidates list, detail, member, and roster caches afterward.

### Invitations

Creators can create invitations with optional `expiresAt` and `maximumUses`, list invitation metadata, and revoke an invitation. Creation returns the plaintext `code` only once. The app creates copy, share, and QR actions from that immediate response and never expects list responses to reveal the code.

Invitation codes and full invitation URLs are not logged, persisted in Redux, analytics, crash breadcrumbs, or AsyncStorage. If a creator leaves the one-time invitation result without copying or sharing it, a new invitation must be created.

### Members, athletes, and rosters

The Team tab reads paginated members and their fantasy-team summaries. Creator-only removal actions use the member user ID from the membership response. The Players tab reads paginated available athletes with supported term, organization, and position filters. Roster views use `/rosters` and represent empty roster data honestly before an auction occurs.

## QR Invitation and Deep-Link Flow

There is no in-app scanner and no camera dependency. A creator-generated QR code encodes an HTTPS URL on the owned production domain:

```text
https://cheerbattle.com/leagues/join?code=<url-encoded-opaque-code>&source=qr
```

The phone's normal camera recognizes the URL. Android App Links or iOS Universal Links opens GameApp directly when installed. React Navigation maps the path to a dedicated `JoinLeague` screen and preserves `code` plus the `source=qr` attribution in memory.

The join sequence is:

1. Validate the host, exact path, parameter count, code presence, decoded code length of 20-100 characters, and `source=qr`.
2. If authenticated, display the fantasy-team-name form immediately.
3. If unauthenticated, preserve the validated pending invite locally, complete the existing sign-in flow, then resume at the join form.
4. Submit `/leagues/join-by-code` with `joinMethod: 'qr_code'`.
5. On success, clear the pending invite, invalidate league caches, and navigate to the returned league detail.
6. On failure, keep or clear the pending invite according to the error: retryable network/5xx errors keep it; invalid, expired, revoked, exhausted, or closed-registration responses clear it after displaying the backend message.

Joining cannot complete without interaction because the backend requires `fantasyTeamName`. The link opens the correct app screen automatically, but the user confirms their team name before the mutation.

The pending invitation is sensitive short-lived state. It is stored only long enough to survive the authentication redirect, removed after success or terminal failure, and never included in logs. If process-death recovery is required, it may be stored in platform-secure storage with a short expiration; plaintext AsyncStorage is not acceptable.

### Platform association

Android adds a browsable HTTPS intent filter for host `cheerbattle.com` and path `/leagues/join`, with `android:autoVerify="true"`. The domain serves `/.well-known/assetlinks.json` containing package `com.gameapp` and the debug/release signing fingerprints appropriate to each environment.

iOS enables the Associated Domains entitlement for `applinks:cheerbattle.com`. The domain serves `/.well-known/apple-app-site-association` containing the production Apple Team ID, bundle ID, and only the league join path.

The website route provides a safe fallback for users without the app: it explains the invitation, links to the correct app store, and does not expose league details. The association files and fallback page must be delivered over HTTPS without redirects that break verification.

Development uses a separate verified development domain where possible. A custom scheme may be retained strictly as a development fallback, but QR invitations always use the production HTTPS format.

## Navigation and Authentication

The navigation container gains a linking configuration for the HTTPS prefix and `JoinLeague` path. Both cold-start URLs and links received while the app is running are handled. Link parsing is centralized so screens never parse arbitrary URLs themselves.

The auth flow accepts an optional pending destination. Successful sign-in, verification, account creation, or username completion resumes that destination instead of always selecting the default post-authentication screen. Logout clears pending invitation secrets.

Invalid links open a generic invalid-invitation state without making an API request. Repeated link events for the same URL are deduplicated while a join request is in flight.

## Screen Behavior

### Fantasy League

- Joined and discoverable sections use server queries.
- Search and filter state map directly to backend query parameters.
- Pull-to-refresh and pagination expose query loading state.
- The create button opens the API-backed form.
- A manual `Join with code` action remains available.

### Create League

- Loads selectable active/configurable seasons from the backend.
- Collects every required create field and valid auction setting.
- Disables duplicate submission while the mutation is pending.
- Maps field-level validation errors when possible and otherwise shows the backend message.
- Navigates to the created league returned by the API.

### League Detail

- Fetches by route ID and renders loading, forbidden, not-found, and retry states.
- Uses backend status and caller permissions instead of local timers to infer lifecycle.
- Reads members, available athletes, and rosters lazily when their tabs activate.
- Hides mock matchup and standings data until corresponding backend endpoints are available.

### Settings and invitations

- Creator-editable settings patch only supplied backend fields and nested setting objects.
- Editing is disabled when `caller.canEdit` is false.
- Invitation management is creator-only.
- Unsupported delete-league UI is removed because no backend route exists.

## Cache Strategy

`leaguesApi` provides tags for league lists, individual leagues, members, invitations, athletes, and rosters. Mutations invalidate the narrowest correct set:

- Create: lists and the created league.
- Update: league detail and lists.
- Join/leave/remove: detail, lists, members, and rosters.
- Create/revoke invitation: invitation list only.

Screen focus does not dispatch server entities into Redux. RTK Query subscription lifetimes and explicit invalidation drive refreshes.

## Error Handling

The app maps the backend status families consistently:

- `400`: invalid request or locked lifecycle; retain editable form values.
- `401`: preserve a valid pending destination and route through authentication.
- `403`: show permission or private-membership requirements without leaking data.
- `404`: show league, member, season, or invitation not found.
- `409`: show capacity, duplicate membership/team name, or conflicting update feedback.
- `410`: show expired/revoked/exhausted invitation or closed registration and clear terminal pending invites.
- `422`: attach infeasible or unsupported settings feedback to the create/settings form.
- Network/5xx: show retry UI without inventing successful local state.

All mutation buttons prevent concurrent duplicate submissions. Successful `204` responses are treated as `undefined` data, not JSON parsing failures.

## Testing

API contract tests assert every route, method, query parameter, body, `204` handling, cache tag, and response type used by the screens.

Component tests cover loading, empty, error, pagination, creator/member/non-member permissions, create validation, settings locking, invitation one-time secret handling, join errors, leave confirmation, and member removal.

Deep-link tests cover cold and warm starts, valid QR and invite links, invalid hosts/paths/codes, URL decoding, duplicate events, authenticated and unauthenticated routing, post-authentication resume, terminal secret clearing, retryable failure retention, and successful `joinMethod` selection.

Native verification includes Android App Link association and `adb` intent tests, iOS Universal Link device tests, app-not-installed web fallback, and QR scans using the normal Android and iOS camera apps. A real release-signed Android build must verify the release fingerprint.

## Delivery Dependencies

- A stable HTTPS host owned by the product; this design assumes `cheerbattle.com`.
- Android debug and release SHA-256 signing certificate fingerprints.
- Apple Team ID and final iOS bundle identifier.
- Permission to deploy `assetlinks.json`, `apple-app-site-association`, and the fallback join page on the domain.
- Permission to add and deploy the specified authenticated `GET /seasons` endpoint, because the current controller is empty while league creation requires `seasonId`.
- A defined league-logo upload flow if custom logo submission is required in this release.

If any deployment credential is unavailable during app implementation, the app-side routing and deterministic tests are completed first, while production association verification remains an explicit release blocker rather than being silently skipped.

## Acceptance Criteria

- League screens contain no mock league, member, roster, athlete, matchup, or standings data presented as real.
- Season selection calls the deployed `GET /seasons` contract; no database ID is hard-coded in the app.
- Create, list, detail, update, join, leave, remove member, invitation, member, athlete, and roster operations call the backend contracts with JWT authentication.
- Public joins and manual-code joins use the correct endpoint and `joinMethod`.
- A normal phone camera scan of a creator-issued QR opens the installed app through a verified HTTPS link.
- QR-originated joins submit `joinMethod: 'qr_code'`; shared-link joins submit `invite_link`.
- Unauthenticated invite recipients resume the same invitation after completing authentication.
- Invitation plaintext never appears in logs or persistent general-purpose client state.
- Unsupported backend capabilities are hidden or explicitly unavailable and never simulated locally.
- Android, iOS, API, component, deep-link, TypeScript, lint, and focused integration checks pass before release.
