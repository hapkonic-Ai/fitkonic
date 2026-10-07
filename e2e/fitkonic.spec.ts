import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/HARSH/.gemini/antigravity/brain/2b025df4-22c6-4fa2-8633-b3256e6c26c3';

test.describe('FITKONIC — Simplified 3-User (Harsh, Pranav, Kavi) E2E & Offline Sync Suite', () => {
  test('1. Simple Workout Log (No Templates) + Offline Persistence & Neon Sync', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // 1. Confirm Home Dashboard & 3 Logins (Harsh, Pranav, Kavi)
    await expect(page.getByTestId('home-dashboard')).toBeVisible();
    await expect(page.getByTestId('switch-user-harsh')).toBeVisible();
    await expect(page.getByTestId('switch-user-pranav')).toBeVisible();
    await expect(page.getByTestId('switch-user-kavi')).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_mobile_home.png'), fullPage: false });

    // 2. Open Simple Workout Logger directly (no template chooser required)
    await page.getByTestId('today-workout-row').click();
    await expect(page.getByTestId('workout-logger-screen')).toBeVisible();

    // Tap Squat chip to add Squat to today's workout
    await page.getByTestId('quick-add-ex-squat').click();
    await expect(page.getByTestId('workout-exercise-card-ex-squat')).toBeVisible();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_mobile_workout_logger.png') });

    // 3. Simulate Offline Mode
    await page.getByTestId('toggle-offline-button').click();
    await expect(page.getByTestId('offline-indicator-text')).toContainText('OFFLINE MODE');

    // 4. Save Today's Workout while offline
    await page.getByTestId('finish-workout-btn').click();
    await expect(page.getByTestId('workout-saved-banner')).toBeVisible();

    // 5. Restore connection & confirm sync to Neon DB
    await page.getByTestId('toggle-offline-button').click();
    await expect(page.getByTestId('synced-indicator-text')).toContainText('Neon DB Synced', {
      timeout: 10000,
    });
  });

  test('2. Simple Diet Log (What I Ate Today — No Calorie Clutter)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByTestId('today-nutrition-row').click();
    await expect(page.getByTestId('diet-tracker-screen')).toBeVisible();

    // Add what Harsh ate for Dinner without needing calories/macros
    await page.getByTestId('meal-tab-dinner').click();
    await page.getByTestId('diet-food-input').fill('3 Chapati, Paneer Bhurji & Salad');
    await page.getByTestId('diet-save-btn').click();

    await expect(page.getByTestId('diet-tracker-screen')).toContainText(
      '3 Chapati, Paneer Bhurji & Salad'
    );
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_mobile_diet.png') });
  });

  test('3. Progress via Body Weight & Increase in Lifting Weights for Harsh, Pranav & Kavi', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('home-dashboard')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_desktop_dashboard.png') });

    // Navigate to Progress screen
    await page.getByTestId('desktop-nav-progress').click();
    await expect(page.getByTestId('progress-screen')).toBeVisible();

    // Verify Bench Press lifting weight increase is shown for Harsh (55 kg -> 67.5 kg, +12.5 kg)
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('55 kg');
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('67.5 kg');
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('+12.5 kg');

    // Switch to Pranav and verify his lifting weight progress (50 kg -> 60 kg)
    await page.getByTestId('progress-user-pranav').click();
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('50 kg');
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('60 kg');

    // Switch to Kavi and verify his lifting weight progress (45 kg -> 55 kg)
    await page.getByTestId('progress-user-kavi').click();
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('45 kg');
    await expect(page.getByTestId('lift-card-ex-bench-press')).toContainText('55 kg');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_desktop_progress.png') });

    // Log out and verify the 3-login selector (Harsh, Pranav, Kavi) on LoginScreen
    await page.getByTestId('desktop-nav-profile').click();
    await page.getByTestId('open-settings-button').click();
    await page.getByTestId('logout-button').click();

    await expect(page.getByTestId('login-screen')).toBeVisible();
    await expect(page.getByTestId('demo-login-harsh')).toBeVisible();
    await expect(page.getByTestId('demo-login-pranav')).toBeVisible();
    await expect(page.getByTestId('demo-login-kavi')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'qa_login_splash.png') });
  });
});
