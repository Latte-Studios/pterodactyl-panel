import { Page, TestInfo } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';

interface ProjectMetadata {
    theme: 'light' | 'dark';
    width: number;
}

export const metadata = (testInfo: TestInfo): ProjectMetadata =>
    testInfo.project.metadata as ProjectMetadata;

/**
 * Applies the theme the current project runs under before any script on the
 * page executes, so the panel never renders a frame under the wrong theme.
 */
export const applyTheme = async (page: Page, testInfo: TestInfo): Promise<void> => {
    const { theme } = metadata(testInfo);

    await page.addInitScript(value => {
        try {
            window.localStorage.setItem('latte:theme', value);
        } catch {
            // Storage is unavailable in some contexts; the OS level preference
            // configured on the project still applies.
        }
    }, theme);
    await page.context().addCookies([
        {
            name: 'latte_theme',
            value: theme,
            url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost',
        },
    ]);
};

/**
 * Writes a screenshot to tests/screenshots/{theme}/{width}/{name}.png. Visual
 * comparison is intentionally not asserted yet — the baselines are reviewed by
 * hand until the design system stops moving.
 */
export const capture = async (page: Page, testInfo: TestInfo, name: string): Promise<void> => {
    const { theme, width } = metadata(testInfo);
    const path = join('tests', 'screenshots', theme, String(width), `${name}.png`);

    await mkdir(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
};

/**
 * Signs in through the login form. Returns false when no credentials are
 * configured, which lets the authenticated screenshots skip instead of fail.
 */
export const login = async (page: Page): Promise<boolean> => {
    const username = process.env.PLAYWRIGHT_USERNAME;
    const password = process.env.PLAYWRIGHT_PASSWORD;

    if (!username || !password) {
        return false;
    }

    await page.goto('/auth/login');
    await page.getByLabel(/username or email/i).fill(username);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /login/i }).click();

    // Wait on the path, not on a pattern over the whole URL: anything matched
    // against the full string also matches the slashes in "http://", so the
    // wait returns immediately and the screenshots are taken signed out.
    await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 30_000 });

    return true;
};
