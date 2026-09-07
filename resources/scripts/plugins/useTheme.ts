import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const STORAGE_KEY = 'latte:theme';
export const COOKIE_NAME = 'latte_theme';

const isPreference = (value: unknown): value is ThemePreference =>
    value === 'system' || value === 'light' || value === 'dark';

export const readPreference = (): ThemePreference => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return isPreference(stored) ? stored : 'system';
    } catch {
        // Storage can be unavailable in private windows; the system preference
        // is the correct fallback.
        return 'system';
    }
};

/**
 * Mirrors the preference into a cookie so the admin area, which is rendered by
 * Blade, can stamp the same attribute on the server and avoid a flash of the
 * wrong theme.
 */
const writeCookie = (preference: ThemePreference): void => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';

    document.cookie = `${COOKIE_NAME}=${preference}; path=/; max-age=31536000; SameSite=Lax${secure}`;
};

export const applyPreference = (preference: ThemePreference): void => {
    const root = document.documentElement;

    if (preference === 'system') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', preference);
    }
};

const systemTheme = (): ResolvedTheme =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
    preference === 'system' ? systemTheme() : preference;

interface UseTheme {
    preference: ThemePreference;
    theme: ResolvedTheme;
    setPreference: (preference: ThemePreference) => void;
    toggle: () => void;
}

/**
 * Reads and writes the panel theme. The preference is stored per browser and
 * defaults to whatever the operating system asks for.
 */
export default (): UseTheme => {
    const [preference, setStoredPreference] = useState<ThemePreference>(readPreference);
    const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(readPreference()));

    useEffect(() => {
        applyPreference(preference);
        setTheme(resolveTheme(preference));

        if (preference !== 'system' || !window.matchMedia) {
            return;
        }

        // Only the system preference needs to react to the operating system
        // changing under the panel.
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => setTheme(systemTheme());

        query.addEventListener('change', listener);

        return () => query.removeEventListener('change', listener);
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // The cookie below is enough to keep the admin area in sync.
        }

        writeCookie(next);
        applyPreference(next);
        setStoredPreference(next);
    }, []);

    const toggle = useCallback(
        () => setPreference(resolveTheme(readPreference()) === 'dark' ? 'light' : 'dark'),
        [setPreference],
    );

    return { preference, theme, setPreference, toggle };
};
