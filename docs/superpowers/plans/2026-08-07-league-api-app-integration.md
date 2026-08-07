# League API App Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock/local league behavior with the current authenticated backend league flow, including external-camera QR invitation links that open the app and resume after authentication.

**Architecture:** Add the missing backend season discovery route, then use typed RTK Query endpoints as the app's only league-data authority. Migrate screens incrementally from local Redux/mocks, centralize invite-link parsing and pending-link state, and configure verified Android App Links and iOS Universal Links against `cheerbattle.com`.

**Tech Stack:** NestJS 11, Mongoose, Jest, React Native 0.86, React 19, TypeScript, Redux Toolkit Query, React Navigation 7, Android App Links, iOS Universal Links.

## Global Constraints

- Match the deployed NestJS DTOs and response shapes exactly.
- Every authenticated request uses the existing JWT-aware `baseApi`.
- Do not persist or log plaintext invitation codes in Redux, AsyncStorage, analytics, or crash breadcrumbs.
- QR codes contain verified HTTPS URLs and are scanned by the phone's normal camera; do not add an in-app camera dependency.
- Only auction drafts are presented as executable.
- Never send a device `file://` URI as backend `logoUrl`.
- Hide or mark unavailable every league capability without a deployed backend route.
- Preserve unrelated user changes in both repositories.

---

## File Structure

### Backend repository: `D:/gameapp/cheerleadingapp_server`

- `src/seasons/dto/query-seasons.dto.ts`: validated app-facing season filters.
- `src/seasons/seasons.controller.ts`: authenticated `GET /seasons` route.
- `src/seasons/seasons.service.ts`: registration-eligible season pagination.
- `src/seasons/seasons.module.ts`: controller/service/repository wiring.
- `src/seasons/repositories/season.repository.ts`: stable filtered page query.
- Corresponding `*.spec.ts` files: DTO, controller, service, and repository contract coverage.
- `public/.well-known/assetlinks.json`: Android domain association.
- `public/.well-known/apple-app-site-association`: iOS domain association.
- `public/leagues/join/index.html`: app-not-installed invitation fallback.

### App repository: `D:/gameapp/GameApp`

- `src/store/api/leagueTypes.ts`: backend league, membership, invitation, athlete, roster, season, pagination, and request contracts.
- `src/store/api/leaguesApi.ts`: all league and season RTK Query endpoints and cache tags.
- `src/features/leagues/leagueErrors.ts`: backend error-to-message/terminal-state mapping.
- `src/features/leagues/inviteLinks.ts`: trusted invitation URL construction and parsing.
- `src/features/leagues/PendingInviteProvider.tsx`: short-lived pending invite state and post-auth resume.
- `src/screens/Home/FantasyLeagueScreen.tsx`: server discovery/joined lists, search, pagination, manual-code entry.
- `src/screens/Home/CreateLeagueScreen.tsx`: season-backed complete create contract.
- `src/screens/Home/JoinLeagueScreen.tsx`: public, code, shared-link, and QR-originated join confirmation.
- `src/screens/Home/LeagueDetailScreen.tsx`: server detail and permission-aware lazy tabs.
- `src/components/LeagueDetail/LeagueDetailTabs.tsx`: member, athlete, and roster server models.
- `src/components/LeagueDetail/LeagueDetailModals.tsx`: update, invitations, leave, and member removal mutations.
- `App.tsx`: deep-link routing and pending-invite-aware auth resume.
- `android/app/src/main/AndroidManifest.xml`: verified App Link intent filter.
- `ios/GameApp/GameApp.entitlements` and Xcode project settings: Associated Domains.
- Focused tests under `__tests__/leagues/`.

---

### Task 1: Expose registration-eligible seasons from the backend

**Files:**
- Create: `D:/gameapp/cheerleadingapp_server/src/seasons/dto/query-seasons.dto.ts`
- Modify: `D:/gameapp/cheerleadingapp_server/src/seasons/seasons.controller.ts`
- Modify: `D:/gameapp/cheerleadingapp_server/src/seasons/seasons.service.ts`
- Modify: `D:/gameapp/cheerleadingapp_server/src/seasons/repositories/season.repository.ts`
- Modify: `D:/gameapp/cheerleadingapp_server/src/seasons/seasons.module.ts`
- Test: matching `*.spec.ts` files beside each modified unit

**Interfaces:**
- Produces: `GET /api/v1/seasons?page=1&limit=20&status=registration_open`
- Returns: `{ data: SeasonSummary[]; pagination: { page; limit; total; totalPages } }`

- [ ] **Step 1: Write failing DTO/controller/service/repository tests**

```ts
it('lists authenticated registration-open seasons', async () => {
  service.listForLeagues.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  await expect(controller.list({ page: 1, limit: 20, status: SeasonStatus.REGISTRATION_OPEN }))
    .resolves.toEqual({ data: [], pagination: expect.any(Object) });
});
```

Assert authentication metadata, validated pagination, exact projected fields, registration-window filtering, deterministic `startsAt/_id` sorting, and exclusion of roster/scoring internals.

- [ ] **Step 2: Run focused backend tests and confirm contract failures**

Run: `npm test -- --runInBand src/seasons`

Expected: FAIL because the list route and query implementation do not exist.

- [ ] **Step 3: Implement the minimal endpoint**

Use the existing `PaginationDto`, `SeasonStatus`, response pagination helper, `@Authenticated()`, and repository patterns. The service must require both an eligible status and `registrationStartsAt <= now < registrationEndsAt` for app creation choices.

- [ ] **Step 4: Run focused tests, typecheck, and backend lint**

Run: `npm test -- --runInBand src/seasons`, `npm run build`, and the backend lint command from `package.json`.

- [ ] **Step 5: Commit the backend endpoint**

```bash
git add src/seasons
git commit -m "feat: expose league registration seasons"
```

---

### Task 2: Define app league contracts and RTK Query endpoints

**Files:**
- Create: `src/store/api/leagueTypes.ts`
- Create: `src/store/api/leaguesApi.ts`
- Create: `__tests__/leagues/leaguesApi.test.ts`

**Interfaces:**
- Produces hooks for seasons, league lists/detail/create/update, public/code join, leave, members, member removal, invitations, available athletes, and rosters.
- Produces tags: `LeagueList`, `League`, `LeagueMembers`, `LeagueInvitations`, `LeagueAthletes`, `LeagueRosters`.

- [ ] **Step 1: Write failing endpoint-definition tests**

```ts
expect(requestFor('joinByCode', {
  code: 'x'.repeat(32), fantasyTeamName: 'Flyers', joinMethod: 'qr_code',
})).toMatchObject({ url: '/leagues/join-by-code', method: 'POST' });
```

Cover all controller paths/methods, query serialization, nested create/update bodies, `204` responses, and invalidation rules.

- [ ] **Step 2: Run the focused test and confirm it fails because `leaguesApi` is absent**

Run: `npx jest --runInBand __tests__/leagues/leaguesApi.test.ts`

- [ ] **Step 3: Implement exact TypeScript contracts and injected endpoints**

Use `_id` as the server identifier and retain backend enum strings. Define `CreateLeagueRequest`, `UpdateLeagueRequest`, `LeagueDetailResponse`, `JoinLeagueResponse`, `InvitationCreatedResponse`, paginated member/athlete/roster responses, and `SeasonSummary` without `any`.

- [ ] **Step 4: Run focused tests and `npx tsc --noEmit`**

- [ ] **Step 5: Commit**

```bash
git add src/store/api/leagueTypes.ts src/store/api/leaguesApi.ts __tests__/leagues/leaguesApi.test.ts
git commit -m "feat: add typed league API client"
```

---

### Task 3: Centralize league errors and trusted invitation links

**Files:**
- Create: `src/features/leagues/leagueErrors.ts`
- Create: `src/features/leagues/inviteLinks.ts`
- Create: `__tests__/leagues/inviteLinks.test.ts`
- Create: `__tests__/leagues/leagueErrors.test.ts`

**Interfaces:**
- Produces: `buildLeagueInviteUrl(code, source): string`
- Produces: `parseLeagueInviteUrl(url): { code: string; source: 'qr' | 'invite' } | null`
- Produces: `classifyLeagueError(error): { message: string; terminalInvite: boolean; requiresAuth: boolean }`

- [ ] **Step 1: Write failing parser and error-classification tests**

```ts
expect(parseLeagueInviteUrl(`https://cheerbattle.com/leagues/join?code=${'a'.repeat(32)}&source=qr`))
  .toEqual({ code: 'a'.repeat(32), source: 'qr' });
expect(parseLeagueInviteUrl(`https://evil.example/leagues/join?code=${'a'.repeat(32)}&source=qr`)).toBeNull();
```

Cover exact HTTPS host/path, duplicate/missing parameters, URL decoding, 20-100 character code bounds, QR/invite source, fragments, 401 resume, 410 terminal clearing, 409 feedback, and retryable network/5xx behavior.

- [ ] **Step 2: Run tests and confirm missing-module failures**

- [ ] **Step 3: Implement pure deterministic helpers without logging secrets**

- [ ] **Step 4: Run focused tests, TypeScript, and ESLint**

- [ ] **Step 5: Commit**

```bash
git add src/features/leagues __tests__/leagues/inviteLinks.test.ts __tests__/leagues/leagueErrors.test.ts
git commit -m "feat: validate league invitation links"
```

---

### Task 4: Add pending-invite state and deep-link navigation

**Files:**
- Create: `src/features/leagues/PendingInviteProvider.tsx`
- Create: `src/screens/Home/JoinLeagueScreen.tsx`
- Modify: `App.tsx`
- Test: `__tests__/leagues/deepLinkNavigation.test.tsx`

**Interfaces:**
- Consumes: `parseLeagueInviteUrl`, `useJoinByCodeMutation`.
- Produces: in-memory `pendingInvite`, `acceptInviteUrl`, `clearPendingInvite`, and `resumePendingInvite`.

- [ ] **Step 1: Write failing cold-start, warm-link, auth-resume, and deduplication tests**

```ts
expect(linking.getStateFromPath('/leagues/join?code=valid-code-value-12345&source=qr'))
  .toMatchObject({ routes: [expect.objectContaining({ name: 'JoinLeague' })] });
```

Assert unauthenticated links survive navigation through sign-in, logout clears them, terminal failures clear them, network failures retain them, and duplicate incoming events cannot submit twice.

- [ ] **Step 2: Run focused tests and verify expected failures**

- [ ] **Step 3: Implement provider, navigation linking config, and join screen**

The join form requires a 3-80 character fantasy-team name. Map sources to backend methods: QR to `qr_code`, shared links to `invite_link`, and manual input to `join_code`.

- [ ] **Step 4: Run focused tests, TypeScript, and lint**

- [ ] **Step 5: Commit**

```bash
git add App.tsx src/features/leagues/PendingInviteProvider.tsx src/screens/Home/JoinLeagueScreen.tsx __tests__/leagues/deepLinkNavigation.test.tsx
git commit -m "feat: resume league invitation deep links"
```

---

### Task 5: Replace Fantasy League mocks with backend discovery

**Files:**
- Modify: `src/screens/Home/FantasyLeagueScreen.tsx`
- Modify: `src/screens/Home/HomeScreen.tsx`
- Test: `__tests__/leagues/FantasyLeagueScreen.test.tsx`

**Interfaces:**
- Consumes: `useGetLeaguesQuery`, `JoinLeague` navigation.
- Produces: joined/discoverable server lists, pagination, search/filter, refresh, and manual-code entry.

- [ ] **Step 1: Write failing screen tests**

Assert loading, backend empty state, backend error/retry, separate `mine=true` list, public discovery, debounced search reset to page one, pagination append without duplicates, refresh, real `_id` navigation, and absence of mock names.

- [ ] **Step 2: Run focused tests and confirm the mock implementation fails them**

- [ ] **Step 3: Implement RTK Query-backed lists and remove mock/local league merging**

- [ ] **Step 4: Run focused tests, TypeScript, and lint**

- [ ] **Step 5: Commit**

```bash
git add src/screens/Home/FantasyLeagueScreen.tsx src/screens/Home/HomeScreen.tsx __tests__/leagues/FantasyLeagueScreen.test.tsx
git commit -m "feat: load fantasy leagues from backend"
```

---

### Task 6: Connect complete league creation

**Files:**
- Modify: `src/screens/Home/CreateLeagueScreen.tsx`
- Test: `__tests__/leagues/CreateLeagueScreen.test.tsx`

**Interfaces:**
- Consumes: `useGetSeasonsQuery`, `useCreateLeagueMutation`.
- Produces: valid `CreateLeagueRequest` with nested auction settings.

- [ ] **Step 1: Write failing create-flow tests**

Assert season loading/selection, no hard-coded ID, league and fantasy-team name validation, public/private visibility, 4-20 capacity, integer budgets/timers, future UTC draft start, only auction type, duplicate-submit prevention, `file://` logo exclusion, backend field errors, and navigation to the returned league `_id`.

- [ ] **Step 2: Run focused tests and confirm local `createLeague` dispatch fails them**

- [ ] **Step 3: Implement the API-backed form with policy-safe defaults**

Use defaults from the approved backend settings spec: auction/random, pick duration 60, while requiring explicit starting budget, minimum bid, increment, nomination duration, and bidding duration.

- [ ] **Step 4: Run focused tests, TypeScript, and lint**

- [ ] **Step 5: Commit**

```bash
git add src/screens/Home/CreateLeagueScreen.tsx __tests__/leagues/CreateLeagueScreen.test.tsx
git commit -m "feat: create leagues through backend"
```

---

### Task 7: Connect league detail, members, athletes, and rosters

**Files:**
- Modify: `src/screens/Home/LeagueDetailScreen.tsx`
- Modify: `src/components/LeagueDetail/LeagueDetailTabs.tsx`
- Modify: `src/screens/Home/DraftRoomScreen.tsx`
- Test: `__tests__/leagues/LeagueDetailScreen.test.tsx`

**Interfaces:**
- Consumes: detail, member, athlete, and roster hooks.
- Produces: permission-aware real-data tabs with lazy queries.

- [ ] **Step 1: Write failing detail/tab tests**

Assert detail loading/403/404/retry, backend status rendering, `caller` permission actions, lazy tab queries, member pagination, athlete filters, pre-auction empty rosters, and no mock standings/matchups or local timer-driven lifecycle transitions.

- [ ] **Step 2: Run tests and confirm mock/local selectors fail them**

- [ ] **Step 3: Implement server-backed detail and tabs**

Hide Draft Room navigation until a deployed auction route exists. Render `_id`, `logoUrl`, `maxTeams`, `joinedTeamCount`, nested draft start, visibility, and backend lifecycle without adapting them back to the obsolete mock interface.

- [ ] **Step 4: Run focused tests, TypeScript, and lint**

- [ ] **Step 5: Commit**

```bash
git add src/screens/Home/LeagueDetailScreen.tsx src/components/LeagueDetail/LeagueDetailTabs.tsx src/screens/Home/DraftRoomScreen.tsx __tests__/leagues/LeagueDetailScreen.test.tsx
git commit -m "feat: connect league detail data"
```

---

### Task 8: Connect settings, invitations, leave, and member removal

**Files:**
- Modify: `src/components/LeagueDetail/LeagueDetailModals.tsx`
- Modify: `src/screens/Home/LeagueDetailScreen.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `__tests__/leagues/LeagueManagement.test.tsx`

**Interfaces:**
- Consumes: update, invitation create/list/revoke, leave, and remove-member mutations.
- Produces: creator-aware management UI and one-time invitation share/QR result.

- [ ] **Step 1: Write failing management tests**

Assert `caller.canEdit` locking, partial nested PATCH bodies, creator-only invitation/member actions, one-time plaintext display, URL source selection, expiration/maximum-use validation, revoke/leave/remove confirmation, `204` success, cache refresh, secret disappearance after dismissal, and removal of fake delete-league success.

- [ ] **Step 2: Run tests and confirm current local modal behavior fails them**

- [ ] **Step 3: Implement backend mutations and QR/share actions**

Generate QR content from `buildLeagueInviteUrl(code, 'qr')`; shared links use `buildLeagueInviteUrl(code, 'invite')`. Install `react-native-qrcode-svg@6.3.21` and render QR codes locally through the already-installed `react-native-svg`; never send the invitation URL to the existing third-party QR image service.

- [ ] **Step 4: Run focused tests, TypeScript, and lint**

- [ ] **Step 5: Commit**

```bash
git add src/components/LeagueDetail/LeagueDetailModals.tsx src/screens/Home/LeagueDetailScreen.tsx __tests__/leagues/LeagueManagement.test.tsx
git commit -m "feat: connect league administration"
```

---

### Task 9: Remove obsolete local league state

**Files:**
- Delete: `src/store/slices/leagueSlice.ts`
- Modify: `src/store/index.ts`
- Modify: every remaining import found by `rg "leagueSlice|state\.league|createLeague\(|deleteLeague\(" src`
- Test: existing focused league tests

**Interfaces:**
- Consumes: completed RTK Query migration.
- Produces: one authoritative server state model.

- [ ] **Step 1: Add a failing repository guard test or script assertion**

```powershell
$matches = rg -n "MOCK_LEAGUE|state\.league|createLeague\(|deleteLeague\(" src
if ($LASTEXITCODE -eq 0) { throw "Obsolete league state remains:`n$matches" }
```

- [ ] **Step 2: Run the guard and confirm obsolete references remain**

- [ ] **Step 3: Remove the reducer, mocks, imports, and dead adapters**

- [ ] **Step 4: Run the guard, all league tests, TypeScript, and lint**

- [ ] **Step 5: Commit**

```bash
git add src/store src/screens src/components
git commit -m "refactor: remove local league state"
```

---

### Task 10: Configure verified Android and iOS invitation links

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Create/Modify: `ios/GameApp/GameApp.entitlements`
- Modify: `ios/GameApp.xcodeproj/project.pbxproj`
- Create: `D:/gameapp/cheerleadingapp_server/public/.well-known/assetlinks.json`
- Create: `D:/gameapp/cheerleadingapp_server/public/.well-known/apple-app-site-association`
- Create: `D:/gameapp/cheerleadingapp_server/public/leagues/join/index.html`
- Test: `__tests__/leagues/nativeLinkConfig.test.ts`

**Interfaces:**
- Consumes: host `cheerbattle.com`, path `/leagues/join`, Android package `com.gameapp`, release fingerprints, Apple Team ID, and bundle ID.
- Produces: verified HTTPS routing from normal camera apps to GameApp.

- [ ] **Step 1: Write failing static configuration tests**

Assert Android VIEW/DEFAULT/BROWSABLE, HTTPS host/path, and `autoVerify`; iOS `applinks:cheerbattle.com`; exact association-file identifiers and path restrictions; and a non-secret fallback page.

- [ ] **Step 2: Run the static tests and confirm native association is absent**

- [ ] **Step 3: Implement native and domain association configuration**

Do not invent signing fingerprints or Apple identifiers. Obtain them from actual debug/release signing configuration and Apple project settings. Host association files at the required `/.well-known/` paths over HTTPS without redirects.

- [ ] **Step 4: Verify links on real builds**

Android commands:

```powershell
adb shell pm verify-app-links --re-verify com.gameapp
adb shell am start -a android.intent.action.VIEW -d "https://cheerbattle.com/leagues/join?code=valid-code-value-12345&source=qr"
```

On iOS, install a signed device build, scan a real QR with Camera, and confirm the Universal Link opens `JoinLeague`. Also verify the browser fallback with the app uninstalled.

- [ ] **Step 5: Commit app and deployable association changes**

```bash
git add android ios __tests__/leagues/nativeLinkConfig.test.ts
git commit -m "feat: verify league invitation app links"
```

---

### Task 11: Full integration verification and documentation

**Files:**
- Modify: `README.md`
- Modify: backend README/API documentation as needed
- Test: all backend and app suites

**Interfaces:**
- Produces: reproducible local/deployed verification instructions and release blockers.

- [ ] **Step 1: Document environment, domain, signing, and manual end-to-end setup**

Include API base URL, season setup prerequisite, association file locations, Android fingerprints, Apple IDs, invitation-secret handling, and the app-not-installed fallback.

- [ ] **Step 2: Run complete backend verification**

Run backend test, build/typecheck, and lint scripts from its `package.json`. Record exact failures without weakening checks.

- [ ] **Step 3: Run complete app verification**

Run `npx jest --runInBand`, `npx tsc --noEmit`, `npm run lint`, Android debug assembly, and iOS build where the host supports it.

- [ ] **Step 4: Run the real happy paths against the backend**

Verify create, list, detail, update, public join, manual-code join, shared-link join, external-camera QR join, auth resume, leave, member removal, invitation create/list/revoke, members, athletes, and rosters. Verify `400/401/403/404/409/410/422` UI behavior with controlled backend fixtures.

- [ ] **Step 5: Perform final diff and secret audit**

Run `git diff --check`, inspect both repository statuses, and search for invitation codes, mock league data, hard-coded season IDs, and unintended signing secrets.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md
git commit -m "docs: explain league integration setup"
```
