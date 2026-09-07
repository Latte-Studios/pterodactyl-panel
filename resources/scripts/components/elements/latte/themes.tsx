/**
 * Test helper. Every primitive has to render under both themes, so the specs
 * wrap it in the same `data-theme` attribute the panel stamps on <html>.
 */
import React from 'react';

export const themes: ('light' | 'dark')[] = ['light', 'dark'];

export const ThemeWrapper = ({ theme, children }: { theme: 'light' | 'dark'; children: React.ReactNode }) => (
    <div data-theme={theme}>{children}</div>
);
