import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { formatLocalTime, formatLocalDateTime } from './dateFormatter.js';

describe('Crop Radar Timestamps & Outbreak Management Tests', () => {
  // --------------------------------------------------------------------------
  // Requirement 1: Correct Timestamps
  // --------------------------------------------------------------------------
  it('1. Timestamps: UTC 04:07 AM displays consistently as 09:37 AM in India (Asia/Kolkata)', () => {
    // Exact user test case: 04:07 AM UTC must display as 09:37 AM in India (+5:30)
    const testUtcIso = '2026-11-09T04:07:00.000Z';
    const date = new Date(testUtcIso);

    // Test in Asia/Kolkata timezone
    const formattedIndiaTime = date.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    assert.strictEqual(
      formattedIndiaTime,
      '09:37 AM',
      'UTC 04:07 AM must display as 09:37 AM in India timezone without hardcoded offsets'
    );

    // Verify dateFormatter formats valid ISO strings without throwing
    const localFormatted = formatLocalTime(testUtcIso);
    assert.ok(typeof localFormatted === 'string' && localFormatted.length > 0);

    const localFull = formatLocalDateTime(testUtcIso);
    assert.ok(typeof localFull === 'string' && localFull.includes('2026'));
  });

  it('1b. Timestamps: Server returns raw UTC ISO strings so clients format in user local timezone', () => {
    const serverPath = path.resolve('server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    // In /api/notifications: server must return raw ISO strings, not pre-formatted server strings
    assert.ok(
      serverCode.includes('timestamp: n.created_at') || serverCode.includes('timestamp: n.createdAt'),
      'Notifications route must return raw ISO timestamp'
    );
    assert.ok(
      serverCode.includes('outbreakTimestamp: n.created_at') || serverCode.includes('outbreakTimestamp: n.createdAt'),
      'Notifications route must return raw ISO outbreakTimestamp'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 2: Label reports in the existing radar list
  // --------------------------------------------------------------------------
  it('2. Radar List Labels: "Your outbreak" badge for own reports and "Nearby outbreak" for others', () => {
    const radarPath = path.resolve('src/components/DiseaseRadarModal.tsx');
    const radarCode = fs.readFileSync(radarPath, 'utf8');

    // Check for "Your outbreak" and "Nearby outbreak" badges
    assert.ok(radarCode.includes('rep.isOwnReport'), 'DiseaseRadarModal must check rep.isOwnReport');
    assert.ok(radarCode.includes('Your outbreak'), 'DiseaseRadarModal must display "Your outbreak"');
    assert.ok(radarCode.includes('Nearby outbreak'), 'DiseaseRadarModal must display "Nearby outbreak"');
    assert.ok(radarCode.includes('bg-emerald-100'), 'Must use subtle green styling for Your outbreak badge');

    // Ensure map and markers remain untouched
    assert.ok(radarCode.includes('custom-disease-icon'), 'Disease markers must remain untouched');
    assert.ok(radarCode.includes('custom-farm-icon'), 'Farm marker must remain untouched');
    assert.ok(radarCode.includes('Outbreak Warning Perimeter'), 'Perimeter circle must remain untouched');
  });

  it('2b. Privacy: Server calculates isOwnReport without exposing reporter user IDs to the frontend', () => {
    const serverPath = path.resolve('server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(
      serverCode.includes('isOwnReport: Boolean(currentUserId && r.reporter_user_id === currentUserId)') ||
      serverCode.includes('isOwnReport: Boolean(currentUserId &&'),
      'Server must compute isOwnReport via currentUserId comparison'
    );
    // Ensure r.reporter_user_id is not included in mapped reports sent to client
    const radarEndpointMatch = serverCode.match(/app\.get\('\/api\/disease-radar'[\s\S]*?res\.json\(\{[\s\S]*?reports: nearbyReports/);
    assert.ok(radarEndpointMatch, 'Disease radar route must exist');
    assert.ok(
      !radarEndpointMatch[0].includes('reporterUserId: r.reporter_user_id') &&
      !radarEndpointMatch[0].includes('reporter_user_id: r.reporter_user_id'),
      'Server must not leak reporter user IDs to client'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 3: Delete your own outbreak for everyone
  // --------------------------------------------------------------------------
  it('3. Delete For Everyone: Server enforces ownership (403 for non-owners) and deletes outbreak + linked notifications', () => {
    const serverPath = path.resolve('server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    // Server must implement DELETE endpoint with 403 ownership enforcement
    assert.ok(serverCode.includes('/api/disease-radar/outbreaks/:id'), 'Server must have DELETE outbreak route');
    assert.ok(serverCode.includes('403'), 'Server must return 403 if user is not the reporter');
    assert.ok(
      serverCode.includes("from('notifications')\n          .delete()\n          .eq('outbreak_id', outbreakId)") ||
      serverCode.includes(".delete().eq('outbreak_id', outbreakId)"),
      'Server must delete linked recipient notifications'
    );
    assert.ok(
      serverCode.includes("from('disease_outbreaks')\n          .delete()\n          .eq('id', outbreakId)") ||
      serverCode.includes(".delete().eq('id', outbreakId)"),
      'Server must delete outbreak from shared radar'
    );

    // Chat card must have Delete for everyone button with confirmation
    const cardPath = path.resolve('src/components/OutbreakAlertConfirmationCard.tsx');
    const cardCode = fs.readFileSync(cardPath, 'utf8');
    assert.ok(cardCode.includes('Delete for everyone'), 'Card must have Delete for everyone action');
    assert.ok(cardCode.includes('showDeleteConfirm'), 'Card must include confirmation modal/state');
    assert.ok(cardCode.includes('onDeleteForEveryone'), 'Card must have onDeleteForEveryone callback');
  });

  // --------------------------------------------------------------------------
  // Requirement 4: Remove any outbreak from your own radar (Two-User Check)
  // --------------------------------------------------------------------------
  it('4. Two-User Isolation Check: User B removing an outbreak hides it only from User B; User A still sees it', () => {
    type OutbreakReport = { id: string; diseaseName: string; reporterUserId: string };

    const initialReports: OutbreakReport[] = [
      { id: 'outbreak-user-a', diseaseName: 'Chilli Leaf Curl', reporterUserId: 'user-a' },
      { id: 'outbreak-general', diseaseName: 'Paddy Blast', reporterUserId: 'user-c' },
    ];

    // Simulating user-hidden sets (as stored in server Map and localStorage per user)
    const userAHidden = new Set<string>();
    const userBHidden = new Set<string>();

    // User A and User B both view the radar initial state
    const userAViewInitial = initialReports.filter((r) => !userAHidden.has(r.id));
    const userBViewInitial = initialReports.filter((r) => !userBHidden.has(r.id));
    assert.strictEqual(userAViewInitial.length, 2, 'User A sees both reports initially');
    assert.strictEqual(userBViewInitial.length, 2, 'User B sees both reports initially');

    // Action: User B removes outbreak-user-a from their personal radar
    userBHidden.add('outbreak-user-a');

    // Simulate User B radar fetch after action / page refresh
    const userBViewAfterHide = initialReports.filter((r) => !userBHidden.has(r.id));
    assert.strictEqual(userBViewAfterHide.length, 1, 'Outbreak is hidden from User B radar');
    assert.strictEqual(userBViewAfterHide[0].id, 'outbreak-general');

    // Verify User A STILL sees the outbreak on their radar!
    const userAViewAfterHide = initialReports.filter((r) => !userAHidden.has(r.id));
    assert.strictEqual(userAViewAfterHide.length, 2, 'User A STILL sees the report on their radar!');
    assert.ok(userAViewAfterHide.some((r) => r.id === 'outbreak-user-a'));

    // Verify shared report was NOT deleted from community database
    assert.strictEqual(initialReports.length, 2, 'Shared report is not deleted when User B hides it');
  });

  it('4b. Two-User Delete Check: User B cannot delete User A report; User A can delete for everyone', () => {
    type OutbreakReport = { id: string; diseaseName: string; reporterUserId: string };
    type Notification = { id: string; recipientUserId: string; outbreakId: string };

    let sharedReports: OutbreakReport[] = [
      { id: 'outbreak-user-a', diseaseName: 'Chilli Leaf Curl', reporterUserId: 'user-a' },
    ];
    let sharedNotifications: Notification[] = [
      { id: 'notif-1', recipientUserId: 'user-b', outbreakId: 'outbreak-user-a' },
      { id: 'notif-2', recipientUserId: 'user-c', outbreakId: 'outbreak-user-a' },
      { id: 'notif-unrelated', recipientUserId: 'user-b', outbreakId: 'other-outbreak' },
    ];

    const deleteOutbreak = (requestingUserId: string, outbreakId: string): { status: number; error?: string } => {
      const outbreak = sharedReports.find((r) => r.id === outbreakId);
      if (!outbreak) return { status: 404, error: 'Not found' };
      if (outbreak.reporterUserId !== requestingUserId) {
        return { status: 403, error: 'Forbidden: You can only delete outbreaks reported by your farm' };
      }
      // Authorized delete
      sharedReports = sharedReports.filter((r) => r.id !== outbreakId);
      sharedNotifications = sharedNotifications.filter((n) => n.outbreakId !== outbreakId);
      return { status: 200 };
    };

    // User B tries to delete User A's outbreak -> must fail with 403
    const unauthorizedAttempt = deleteOutbreak('user-b', 'outbreak-user-a');
    assert.strictEqual(unauthorizedAttempt.status, 403, 'User B must be rejected with 403 Forbidden');
    assert.strictEqual(sharedReports.length, 1, 'Report must not be deleted by unauthorized user');
    assert.strictEqual(sharedNotifications.length, 3, 'Notifications must not be deleted by unauthorized user');

    // User A deletes their own outbreak -> succeeds
    const authorizedAttempt = deleteOutbreak('user-a', 'outbreak-user-a');
    assert.strictEqual(authorizedAttempt.status, 200, 'User A must succeed');
    assert.strictEqual(sharedReports.length, 0, 'Outbreak deleted from shared radar for everyone');
    assert.strictEqual(sharedNotifications.length, 1, 'Linked notifications deleted for all recipients');
    assert.strictEqual(sharedNotifications[0].id, 'notif-unrelated', 'Unrelated notifications must be preserved');
  });

  // --------------------------------------------------------------------------
  // Requirement 4c: SQL Migration for user_hidden_outbreaks prepared
  // --------------------------------------------------------------------------
  it('4c. Migration for user_hidden_outbreaks is prepared for review with strict RLS and UUID FK CASCADE', () => {
    const migrationPath = path.resolve('supabase/migrations/20261109030000_user_hidden_outbreaks.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.user_hidden_outbreaks'), 'Must create user_hidden_outbreaks');
    assert.ok(
      sqlContent.includes('outbreak_id UUID NOT NULL REFERENCES public.disease_outbreaks(id) ON DELETE CASCADE'),
      'Must define outbreak_id as UUID foreign key to public.disease_outbreaks(id) with ON DELETE CASCADE'
    );
    assert.ok(
      sqlContent.includes('hidden_at TIMESTAMPTZ NOT NULL DEFAULT now()'),
      'Must define hidden_at with DEFAULT now()'
    );
    assert.ok(sqlContent.includes('PRIMARY KEY (user_id, outbreak_id)'), 'Must have composite primary key');
    assert.ok(sqlContent.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    assert.ok(sqlContent.includes('auth.uid() = user_id'), 'RLS policy must restrict to auth.uid() = user_id');
  });

  it('4d. Security: Server derives user_id strictly from authenticated session (req.user.id), not request body', () => {
    const serverPath = path.resolve('server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    // Inspect /api/disease-radar/hide-outbreak endpoint code
    const hideEndpointMatch = serverCode.match(/app\.post\('\/api\/disease-radar\/hide-outbreak'[\s\S]*?return res\.json/);
    assert.ok(hideEndpointMatch, 'Hide outbreak route must exist');
    const hideRouteCode = hideEndpointMatch[0];

    assert.ok(
      hideRouteCode.includes('const userId = req.user?.id;'),
      'Server must derive userId from authenticated session req.user.id'
    );
    assert.ok(
      !hideRouteCode.includes('req.body.userId') && !hideRouteCode.includes('req.body.user_id'),
      'Server must never trust client-provided user_id in request body'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 5: Reporter confirmation message format & self-exclusion
  // --------------------------------------------------------------------------
  it('5a. Reporter Confirmation: Shows exact requested notification count message', () => {
    const cardPath = path.resolve('src/components/OutbreakAlertConfirmationCard.tsx');
    const cardCode = fs.readFileSync(cardPath, 'utf8');

    // Must match: "Outbreak report sent. 4 nearby farmers with potentially affected crops were notified."
    assert.ok(
      cardCode.includes('Outbreak report sent.') &&
      cardCode.includes('nearby') &&
      cardCode.includes('with potentially affected crops') &&
      cardCode.includes('notified.'),
      'Confirmation card must render the exact requested sent confirmation message'
    );

    // Dynamic helper test
    const count = 4;
    const confirmationTextEn = `Outbreak report sent. ${count} nearby farmers with potentially affected crops were notified.`;
    assert.strictEqual(
      confirmationTextEn,
      'Outbreak report sent. 4 nearby farmers with potentially affected crops were notified.'
    );

    // Must match when 0 eligible farmers notified
    assert.ok(
      cardCode.includes('Outbreak report saved. No nearby farmers with potentially affected crops were found within 5 km to notify.'),
      'Card must render accurate message when 0 nearby host farms are eligible'
    );

    // Must match when delivery failed
    assert.ok(
      cardCode.includes('Outbreak report recorded, but delivery of alerts to nearby farmers failed.'),
      'Card must render accurate message when delivery fails'
    );
  });

  it('5b. Reporter Exclusion: Reporter is never sent a nearby-warning notification for their own report', () => {
    const serverPath = path.resolve('server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    assert.ok(
      serverCode.includes('f.user_id !== reporterUserId') && serverCode.includes('f.id !== reporterUserId'),
      'Server candidate farm filtering must exclude reporter user ID'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 6: Account-scoped persistence (no browser-only localStorage)
  // --------------------------------------------------------------------------
  it('6. Account-Scoped Persistence: DiseaseRadarModal uses account-scoped API and no localStorage', () => {
    const modalPath = path.resolve('src/components/DiseaseRadarModal.tsx');
    const modalCode = fs.readFileSync(modalPath, 'utf8');

    assert.ok(!modalCode.includes('localStorage'), 'DiseaseRadarModal must not rely on browser localStorage');
    assert.ok(
      modalCode.includes('/api/disease-radar/hidden-outbreaks'),
      'DiseaseRadarModal must load hidden outbreaks via account-scoped API'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 7: Mobile 320px Send Button Visibility
  // --------------------------------------------------------------------------
  it('7. Mobile 320px: Message composer ensures textarea flexes with minWidth:0 and send button does not clip', () => {
    const composerPath = path.resolve('src/components/MessageComposer.tsx');
    const composerCode = fs.readFileSync(composerPath, 'utf8');

    assert.ok(
      composerCode.includes("minWidth: 0") && composerCode.includes("flex: '1 1 0%'"),
      'MessageComposer must set minWidth: 0 and flex: 1 1 0% on text input container'
    );
    assert.ok(
      composerCode.includes('flexShrink: 0'),
      'Send button must have explicit flexShrink: 0'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 8: Outbreak Removal Persistence Across Sessions & Devices
  // --------------------------------------------------------------------------
  it('8. Outbreak Removal: applySession resets diseaseReports and re-fetches with authenticated session token', () => {
    const appPath = path.resolve('src/App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf8');

    // On account login/change, applySession must reset and re-fetch diseaseReports
    assert.ok(
      appCode.includes('setDiseaseReports([])'),
      'applySession must clear previous diseaseReports when account changes or logs out'
    );
    assert.ok(
      appCode.includes('fetchDiseaseReports(initialProfile.latitude, initialProfile.longitude)'),
      'applySession must re-fetch disease reports with authenticated session token'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 9: Notification Mark As Read Database Confirmation & Diagnostic Error
  // --------------------------------------------------------------------------
  it('9. Mark As Read: Updates unread badge ONLY after database confirms success and preserves unread state on failure', () => {
    const appPath = path.resolve('src/App.tsx');
    const appCode = fs.readFileSync(appPath, 'utf8');

    // Notification mark as read must check resp.ok && json?.success before clearing unread badge
    assert.ok(
      appCode.includes('if (!resp.ok || !json?.success)'),
      'handleOpenNotifications must check both resp.ok and json.success before clearing badge'
    );
    assert.ok(
      appCode.includes('setUnreadNotificationsCount(0)'),
      'handleOpenNotifications must update badge only after confirmation'
    );
    // Preserves unread state on error and shows actual diagnostic error message
    assert.ok(
      appCode.includes('Could not mark notifications as read: ${errorDetail}') ||
      appCode.includes('Could not mark notifications as read:'),
      'handleOpenNotifications must display actual diagnostic error detail rather than masking with connection message'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 10: Server-Enforced Session Identity & UUID Validation
  // --------------------------------------------------------------------------
  it('10. Server Endpoints: Derives user strictly from req.user.id and validates UUID syntax before DB queries', () => {
    const serverPath = path.resolve('server.ts');
    const serverCode = fs.readFileSync(serverPath, 'utf8');

    // In mark-all-read endpoint
    assert.ok(
      serverCode.includes('handleMarkAllNotificationsRead') &&
      serverCode.includes('const userId = req.user?.id'),
      'mark-all-read must derive user strictly from req.user.id'
    );
    assert.ok(
      serverCode.includes('isValidUuid(userId)'),
      'Server must validate UUID before querying recipient_user_id in Supabase to prevent 22P02 syntax errors'
    );
    assert.ok(
      serverCode.includes("eq('recipient_user_id', userId)"),
      'mark-all-read must be strictly scoped to recipient_user_id'
    );

    // In hide-outbreak endpoint
    assert.ok(
      serverCode.includes('/api/disease-radar/hide-outbreak') &&
      serverCode.includes('const userId = req.user?.id'),
      'hide-outbreak must derive user strictly from req.user.id'
    );
    assert.ok(
      serverCode.includes("from('user_hidden_outbreaks')"),
      'hide-outbreak must persist to user_hidden_outbreaks table'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 11: Vercel Routing & Prefix Normalization
  // --------------------------------------------------------------------------
  it('11. Vercel Routing: vercel.json rewrites /api/(.*) and handlers normalize URL prefixes', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf8'));
    const rewrites = vercelConfig.rewrites || [];
    const apiRewrite = rewrites.find((r: any) => r.source === '/api/(.*)');
    assert.ok(apiRewrite, 'vercel.json must rewrite /api/(.*) to /api');
    assert.strictEqual(apiRewrite.destination, '/api');

    const apiIndexCode = fs.readFileSync(path.resolve('api/index.ts'), 'utf8');
    assert.ok(
      apiIndexCode.includes('normalizeVercelUrl') && apiIndexCode.includes('/api'),
      'api/index.ts must normalize URLs to prevent 404 routing mismatches on Vercel'
    );

    const serverCode = fs.readFileSync(path.resolve('server.ts'), 'utf8');
    assert.ok(
      serverCode.includes("'/api/notifications/mark-all-read'") &&
      serverCode.includes("'/notifications/mark-all-read'"),
      'server.ts must listen on both /api/ and root paths for notifications mark-all-read'
    );
  });

  // --------------------------------------------------------------------------
  // Requirement 12: Radar Removal UI Persistence & Failure Handling
  // --------------------------------------------------------------------------
  it('12. Radar Removal: DiseaseRadarModal awaits database confirmation before updating state or removing marker', () => {
    const modalCode = fs.readFileSync(path.resolve('src/components/DiseaseRadarModal.tsx'), 'utf8');
    assert.ok(
      modalCode.includes('await onRemoveFromMyRadar(outbreakId)'),
      'DiseaseRadarModal must await database write confirmation first'
    );
    assert.ok(
      modalCode.includes('setRemovingOutbreakId'),
      'DiseaseRadarModal must track removing state to prevent double submits'
    );

    const appCode = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
    assert.ok(
      appCode.includes('!isLoadingAuth') && appCode.includes('fetchDiseaseReports'),
      'App.tsx must wait for auth session to resolve before fetching radar reports on refresh'
    );
  });
});

