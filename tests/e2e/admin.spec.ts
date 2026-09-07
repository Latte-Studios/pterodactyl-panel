import { test } from '@playwright/test';
import { applyTheme, capture, login } from './helpers';

/**
 * The administration area is still rendered by Blade and styled by an override
 * on top of AdminLTE, so it is captured from its own spec. Every page here is a
 * top level entry in the admin sidebar.
 */
const pages = [
    ['admin-overview', '/admin'],
    ['admin-settings', '/admin/settings'],
    ['admin-api', '/admin/api'],
    ['admin-databases', '/admin/databases'],
    ['admin-locations', '/admin/locations'],
    ['admin-nodes', '/admin/nodes'],
    ['admin-servers', '/admin/servers'],
    ['admin-users', '/admin/users'],
    ['admin-mounts', '/admin/mounts'],
    ['admin-nests', '/admin/nests'],
] as const;

test.describe('admin screenshots', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await applyTheme(page, testInfo);
    });

    for (const [name, path] of pages) {
        test(name, async ({ page }, testInfo) => {
            test.skip(
                !(await login(page)),
                'PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD are not set',
            );

            await page.goto(path);
            await page.waitForLoadState('networkidle');

            await capture(page, testInfo, name);
        });
    }
});
