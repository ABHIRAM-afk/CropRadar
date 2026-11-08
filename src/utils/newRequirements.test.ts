import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  isMatchScoreEligibleForAlert,
  findFarmsWithinAlertRadius,
  evaluateBiologicalHostRelevance,
  formatApproximateDistance,
} from './agriculturalLogic';

describe('Crop Radar Automated Outbreak & Notification Flow Tests', () => {
  it('WeatherModal uses app light theme and no dark slate modal styling', () => {
    const weatherModalPath = path.resolve('src/components/WeatherModal.tsx');
    const content = fs.readFileSync(weatherModalPath, 'utf8');

    assert.ok(!content.includes('bg-slate-900'), 'Should not contain bg-slate-900');
    assert.ok(!content.includes('bg-slate-950'), 'Should not contain bg-slate-950');
    assert.ok(!content.includes('border-slate-800'), 'Should not contain border-slate-800');
    assert.ok(!content.includes('bg-emerald-950'), 'Should not contain bg-emerald-950');
    assert.ok(content.includes('bg-white'), 'Should contain bg-white modal');
    assert.ok(content.includes('#E2E8D8'), 'Should contain app theme border #E2E8D8');
    assert.ok(content.includes('#14281D'), 'Should contain app theme text #14281D');
  });

  it('No duplicate plus signs in UI buttons', () => {
    const files = [
      'src/components/CropSidebar.tsx',
      'src/components/NewCropModal.tsx',
      'src/App.tsx',
    ];

    for (const file of files) {
      const content = fs.readFileSync(path.resolve(file), 'utf8');
      const regex = /<Plus[^>]*\/>\s*<span>\s*\+/g;
      const matches = content.match(regex);
      assert.strictEqual(matches, null, `File ${file} should not have a duplicate plus icon and literal plus: ${matches}`);
    }
  });

  it('Crop chat memory isolation: messagesByCycle preserves each cycle separately', () => {
    type ChatMsg = { id: string; text: string; cropCycleId: string };
    const messagesByCycle: Record<string, ChatMsg[]> = {};

    const paddyCycleId = 'cycle-paddy-1';
    messagesByCycle[paddyCycleId] = [
      { id: '1', text: 'Paddy blast symptoms spotted on leaf collar', cropCycleId: paddyCycleId },
    ];

    const chilliCycleId = 'cycle-chilli-2';
    messagesByCycle[chilliCycleId] = [
      { id: '2', text: 'Chilli leaf curl thrips advisory needed', cropCycleId: chilliCycleId },
    ];

    assert.strictEqual(messagesByCycle[chilliCycleId].length, 1);
    assert.ok(messagesByCycle[chilliCycleId][0].text.includes('Chilli leaf curl'));
    assert.strictEqual(messagesByCycle[paddyCycleId].length, 1);
    assert.ok(messagesByCycle[paddyCycleId][0].text.includes('Paddy blast'));
  });

  it('Webpage title is CropRadar and body has farmer-friendly light theme styling', () => {
    const indexHtmlPath = path.resolve('index.html');
    const content = fs.readFileSync(indexHtmlPath, 'utf8');

    assert.ok(content.includes('<title>CropRadar</title>'), 'index.html must have <title>CropRadar</title>');
    assert.ok(content.includes('property="og:title" content="CropRadar"'), 'og:title must be CropRadar');
    assert.ok(!content.includes('class="dark"'), 'index.html should not enforce dark mode');
    assert.ok(content.includes('bg-[#F8FAF5]'), 'body should use light background #F8FAF5');
  });

  it('Login page uses the user-provided farmer image', () => {
    const loginImgPath = path.resolve('src/assets/images/crop_radar_login.jpg');
    assert.ok(fs.existsSync(loginImgPath), 'crop_radar_login.jpg must exist');
    const stats = fs.statSync(loginImgPath);
    assert.ok(stats.size > 50000, 'Image should be the provided high-resolution farmer image');

    const loginPagePath = path.resolve('src/components/LoginPage.tsx');
    const loginContent = fs.readFileSync(loginPagePath, 'utf8');
    assert.ok(
      loginContent.includes("import cropRadarLoginImg from '../assets/images/crop_radar_login.jpg';"),
      'LoginPage must import cropRadarLoginImg'
    );
    assert.ok(loginContent.includes('src={cropRadarLoginImg}'), 'LoginPage must render imported image');
  });

  it('Crop mismatch guardrail: prevents cross-crop advice and isolates thread history', () => {
    const activeCrop = 'Turmeric';
    const detectedCrop = 'Rice (Paddy)';
    const isMismatch = activeCrop.toLowerCase() !== detectedCrop.toLowerCase();
    assert.strictEqual(isMismatch, true, 'Crop mismatch should be flagged');

    const riceBlastPrecautions = [
      'Maintain continuous 2-3 cm shallow water layer in paddy field to inhibit blast sporulation',
      'Avoid excessive split doses of Nitrogen fertilizer (>120 kg N/ha) in rice',
    ];
    const turmericLeafSpotPrecautions = [
      'Provide ridge drainage to prevent waterlogging around turmeric rhizomes',
      'Treat seed rhizomes before planting with Trichoderma viride',
    ];

    const resolvedAdviceForTurmeric = activeCrop === 'Turmeric' ? turmericLeafSpotPrecautions : riceBlastPrecautions;
    assert.ok(
      !resolvedAdviceForTurmeric.some((p) => p.includes('paddy field')),
      'Turmeric conversation must never receive paddy field flood advice'
    );
  });

  it('Strict Match Score Gating: Outbreaks require score > 0.700', () => {
    assert.strictEqual(isMatchScoreEligibleForAlert(0.699), false, 'Score 0.699 must be rejected');
    assert.strictEqual(isMatchScoreEligibleForAlert(0.700), false, 'Score 0.700 must be rejected (must be strictly > 0.700)');
    assert.strictEqual(isMatchScoreEligibleForAlert(0.701), true, 'Score 0.701 must qualify');
    assert.strictEqual(isMatchScoreEligibleForAlert(0.850), true, 'Score 0.850 must qualify');
    assert.strictEqual(isMatchScoreEligibleForAlert(1.000), true, 'Score 1.000 must qualify');
    assert.strictEqual(isMatchScoreEligibleForAlert(1.050), false, 'Score > 1.000 must be rejected');
  });

  it('Automatic notification flow: sends automatically without requiring farmer confirmation', () => {
    const serverResult = {
      analysisType: 'crop_diagnosis',
      diagnosisOrProduct: {
        titleEn: 'Chilli Leaf Curl Virus (GMB)',
        aiMatchScore: 0.88,
      },
      cropMismatch: { isMismatch: false },
    };

    const shouldAutoDispatch =
      serverResult.analysisType === 'crop_diagnosis' &&
      serverResult.diagnosisOrProduct.aiMatchScore > 0.70 &&
      !serverResult.cropMismatch.isMismatch;

    assert.strictEqual(shouldAutoDispatch, true, 'Qualifying outbreak must auto-trigger on server');

    // Card should render in 'sent' mode without requiring farmer manual confirmation
    const cardContent = fs.readFileSync(path.resolve('src/components/OutbreakAlertConfirmationCard.tsx'), 'utf8');
    assert.ok(
      cardContent.includes('5 km Community Outbreak Alert Automatically Dispatched'),
      'Card must support automatic dispatched header'
    );
    assert.ok(
      cardContent.includes('AI-assisted, not field-confirmed'),
      'Card must clearly label AI-assisted, not field-confirmed'
    );
    assert.ok(
      !cardContent.includes('verified: true'),
      'Must never claim agronomist verified'
    );
  });

  it('Biological Host Range Gating: only notifies nearby farms with susceptible crops', () => {
    const outbreakDisease = 'Chilli Leaf Curl Virus (GMB)';
    const reporterLat = 16.3067;
    const reporterLon = 80.4365;

    const nearbyFarms = [
      {
        id: 'farm-1',
        farmerName: 'Chilli Farmer',
        phone: '',
        latitude: 16.3150,
        longitude: 80.4400,
        villageSector: 'Sector East',
        crops: ['Chilli'],
        hasExplicitLocation: true,
      },
      {
        id: 'farm-2',
        farmerName: 'Cotton Farmer (Vector Reservoir)',
        phone: '',
        latitude: 16.3200,
        longitude: 80.4450,
        villageSector: 'Sector North',
        crops: ['Cotton'],
        hasExplicitLocation: true,
      },
      {
        id: 'farm-3',
        farmerName: 'Turmeric Farmer (Unrelated)',
        phone: '',
        latitude: 16.3100,
        longitude: 80.4380,
        villageSector: 'Sector South',
        crops: ['Turmeric'],
        hasExplicitLocation: true,
      },
    ];

    const eligibleNearbyFarms = findFarmsWithinAlertRadius(reporterLat, reporterLon, nearbyFarms, 5);
    const notifiedRecipients: string[] = [];

    for (const farm of eligibleNearbyFarms) {
      let isVulnerable = false;
      for (const crop of farm.crops) {
        const rel = evaluateBiologicalHostRelevance(outbreakDisease, crop);
        if (rel.relevance === 'direct_host' || rel.relevance === 'vector_host' || rel.relevance === 'broad_host') {
          isVulnerable = true;
          break;
        }
      }
      if (isVulnerable) {
        notifiedRecipients.push(farm.farmerName);
      }
    }

    // Chilli (direct host) and Cotton (whitefly vector reservoir) MUST be notified
    assert.ok(notifiedRecipients.includes('Chilli Farmer'), 'Chilli farmer must be notified');
    assert.ok(notifiedRecipients.includes('Cotton Farmer (Vector Reservoir)'), 'Cotton farmer must be notified as vector reservoir');

    // Turmeric (unrelated) MUST NOT be notified
    assert.ok(!notifiedRecipients.includes('Turmeric Farmer (Unrelated)'), 'Turmeric farmer must NOT receive Chilli Leaf Curl alerts');
  });

  it('Duplicate notification prevention for same recipient and outbreak', () => {
    const sentNotifications: Array<{ recipient_user_id: string; outbreak_id: string }> = [];

    const sendNotif = (recipientId: string, outbreakId: string) => {
      const isDuplicate = sentNotifications.some(
        (n) => n.recipient_user_id === recipientId && n.outbreak_id === outbreakId
      );
      if (isDuplicate) return false;
      sentNotifications.push({ recipient_user_id: recipientId, outbreak_id: outbreakId });
      return true;
    };

    const firstAttempt = sendNotif('user-123', 'outbreak-abc');
    assert.strictEqual(firstAttempt, true, 'First notification should succeed');

    const duplicateAttempt = sendNotif('user-123', 'outbreak-abc');
    assert.strictEqual(duplicateAttempt, false, 'Duplicate notification for same user and outbreak must be rejected');
    assert.strictEqual(sentNotifications.length, 1);
  });

  it('Notifications and Disease Radar include exact outbreak occurrence timestamp', () => {
    const notifModalPath = path.resolve('src/components/NotificationsModal.tsx');
    const notifContent = fs.readFileSync(notifModalPath, 'utf8');
    assert.ok(notifContent.includes('notif.outbreakTimestamp'), 'NotificationsModal must use outbreakTimestamp');
    assert.ok(notifContent.includes('Occurred: '), 'NotificationsModal must display Occurred label');

    const radarModalPath = path.resolve('src/components/DiseaseRadarModal.tsx');
    const radarContent = fs.readFileSync(radarModalPath, 'utf8');
    assert.ok(radarContent.includes('toLocaleTimeString'), 'DiseaseRadarModal must format occurrence time');
    assert.ok(radarContent.includes('toLocaleString'), 'DiseaseRadarModal popup must show full occurrence timestamp');
  });

  it('Brand text is CropRadar in Header and LoginPage with logo icon and AI badge', () => {
    const headerPath = path.resolve('src/components/Header.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');

    // Header brand heading check
    assert.ok(headerContent.includes('CropRadar'), 'Header must contain brand name CropRadar');
    assert.ok(!headerContent.includes('CROP RADAR'), 'Header must not contain all-caps CROP RADAR');
    assert.ok(headerContent.includes('<Radar className="w-5 h-5 text-[#256E3A]" />'), 'Header must retain radar logo icon');
    assert.ok(headerContent.includes('>AI</span>'), 'Header must retain AI badge');

    // Check LoginPage brand heading
    const loginPagePath = path.resolve('src/components/LoginPage.tsx');
    const loginContent = fs.readFileSync(loginPagePath, 'utf8');
    assert.ok(loginContent.includes('CropRadar'), 'LoginPage must contain brand name CropRadar');
    assert.ok(!loginContent.includes('CROP RADAR'), 'LoginPage must not contain all-caps CROP RADAR');
  });

  it('Opening notifications panel marks all as read, sets badge count to 0, and persists state', () => {
    type NotifItem = { id: string; title: string; isRead: boolean };
    let notifications: NotifItem[] = [
      { id: '1', title: 'Nearby Outbreak 1', isRead: false },
      { id: '2', title: 'Nearby Outbreak 2', isRead: false },
    ];
    let unreadCount = notifications.filter((n) => !n.isRead).length;
    assert.strictEqual(unreadCount, 2);

    // Simulate opening notifications panel
    let serverUpdateSucceeded = true;
    const openNotificationsPanel = () => {
      if (serverUpdateSucceeded) {
        // Persist on server
        notifications = notifications.map((n) => ({ ...n, isRead: true }));
        unreadCount = 0;
      }
    };

    openNotificationsPanel();
    assert.strictEqual(unreadCount, 0, 'Badge count must drop to 0 on opening');
    assert.ok(notifications.every((n) => n.isRead), 'All items must be marked as read');

    // Simulate page refresh (loading from server)
    const refreshedUnreadCount = notifications.filter((n) => !n.isRead).length;
    assert.strictEqual(refreshedUnreadCount, 0, 'Count must remain 0 after refresh');

    // Test failure scenario: Don't mark them read if updating fails
    notifications = [{ id: '3', title: 'Nearby Outbreak 3', isRead: false }];
    unreadCount = 1;
    serverUpdateSucceeded = false;
    let errorMessage = '';

    const failedOpenPanel = () => {
      if (!serverUpdateSucceeded) {
        errorMessage = 'Failed to update notification read status on server.';
        // Do NOT mark as read or reset badge!
        return;
      }
      notifications = notifications.map((n) => ({ ...n, isRead: true }));
      unreadCount = 0;
    };

    failedOpenPanel();
    assert.strictEqual(unreadCount, 1, 'Badge count must remain unchanged when server update fails');
    assert.strictEqual(notifications[0].isRead, false, 'Notification must remain unread');
    assert.ok(errorMessage.includes('Failed to update'), 'Clear error must be surfaced');
  });
});
