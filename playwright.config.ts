import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost';

const themes = ['light', 'dark'] as const;
const widths = [390, 1440] as const;

/**
 * Screenshots are taken for every combination of theme and width so the design
 * system can be reviewed the same way it is specified. The theme is forced two
 * ways: through the operating system preference and through the `latte:theme`
 * key the panel persists per user.
 */
const projects = themes.flatMap(theme =>
    widths.map(width => ({
        name: `${theme}-${width}`,
        metadata: { theme, width },
        snapshotPathTemplate: `./tests/screenshots/${theme}/${width}/{arg}{ext}`,
        use: {
            ...devices['Desktop Chrome'],
            colorScheme: theme,
            viewport: { width, height: width === 390 ? 844 : 900 },
        },
    })),
);

export default defineConfig({
    testDir: './tests/e2e',
    outputDir: './tests/.playwright',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL,
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
    },
    projects,
});
