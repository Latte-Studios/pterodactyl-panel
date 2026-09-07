import { expect, test } from '@playwright/test';
import { applyTheme, capture, login } from './helpers';

test.describe('screenshots', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await applyTheme(page, testInfo);
    });

    test('login', async ({ page }, testInfo) => {
        await page.goto('/auth/login');
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible();

        await capture(page, testInfo, 'login');
    });

    test('dashboard', async ({ page }, testInfo) => {
        test.skip(!(await login(page)), 'PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD are not set');

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await capture(page, testInfo, 'dashboard');
    });

    test('console', async ({ page }, testInfo) => {
        const server = process.env.PLAYWRIGHT_SERVER_ID;

        test.skip(!server, 'PLAYWRIGHT_SERVER_ID is not set');
        test.skip(!(await login(page)), 'PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD are not set');

        await page.goto(`/server/${server}`);
        await page.waitForLoadState('networkidle');

        await capture(page, testInfo, 'console');
    });
});
