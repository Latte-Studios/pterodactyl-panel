import { expect, test } from '@playwright/test';
import { applyTheme, capture, login } from './helpers';

/**
 * The Google sign-in surfaces: the button under the password form, the error
 * the callback reports through the query, and the account card. Google itself
 * is never reached; the redirect is only asserted to leave for accounts.google.com.
 */
test.describe('google sso', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await applyTheme(page, testInfo);
    });

    test('login button', async ({ page }, testInfo) => {
        await page.goto('/auth/login');
        const button = page.getByRole('link', { name: /continue with google/i });
        await expect(button).toBeVisible();

        await capture(page, testInfo, 'login-google');

        const [response] = await Promise.all([
            page.waitForResponse(r => r.url().endsWith('/auth/sso/google') && r.status() === 302),
            button.click().catch(() => undefined),
        ]);
        expect(response.headers()['location']).toContain('https://accounts.google.com/');
    });

    test('login error from callback', async ({ page }, testInfo) => {
        await page.goto('/auth/login?sso_error=domain');
        await expect(page.getByText(/not in a domain allowed/i)).toBeVisible();
        await expect(page).not.toHaveURL(/sso_error/);

        await capture(page, testInfo, 'login-google-error');
    });

    test('account card', async ({ page }, testInfo) => {
        test.skip(!(await login(page)), 'PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD are not set');

        await page.goto('/account');
        await expect(page.getByRole('link', { name: /link google account/i })).toBeVisible();

        await capture(page, testInfo, 'account-google');
    });
});
