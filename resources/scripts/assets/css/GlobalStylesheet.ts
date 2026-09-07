import { createGlobalStyle } from 'styled-components/macro';
// @ts-expect-error untyped font file
import lato300 from '@fontsource/lato/files/lato-latin-300-normal.woff2';
// @ts-expect-error untyped font file
import lato400 from '@fontsource/lato/files/lato-latin-400-normal.woff2';
// @ts-expect-error untyped font file
import lato700 from '@fontsource/lato/files/lato-latin-700-normal.woff2';

const latinRange =
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

/**
 * The token block below is section 9.9 of the Latte Studios brand book, copied
 * verbatim. It is the only place in the client where a colour may be written as
 * a literal; everything else references the variables through Tailwind.
 *
 * The `-rgb` variables next to them exist because twin.macro cannot resolve
 * Tailwind's `<alpha-value>` placeholder. New code reaches the tokens through
 * `colors.ls.*`, which is built on the `-rgb` channels and therefore supports
 * opacity modifiers; legacy code reaches them through the compatibility aliases
 * in tailwind.config.js, which use the plain variables.
 */
export default createGlobalStyle`
    @font-face {
        font-family: 'Lato';
        font-style: normal;
        font-display: swap;
        font-weight: 300;
        src: url(${lato300}) format('woff2');
        unicode-range: ${latinRange};
    }

    @font-face {
        font-family: 'Lato';
        font-style: normal;
        font-display: swap;
        font-weight: 400;
        src: url(${lato400}) format('woff2');
        unicode-range: ${latinRange};
    }

    @font-face {
        font-family: 'Lato';
        font-style: normal;
        font-display: swap;
        font-weight: 700;
        src: url(${lato700}) format('woff2');
        unicode-range: ${latinRange};
    }

    :root {
        --ls-font: "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif;
        --ls-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
        --ls-ground: #FAF8F5;    --ls-paper: #FFFFFF;     --ls-sidebar: #74502F;
        --ls-primary: #74502F;   --ls-primary-hover: #5A3E24;   --ls-on-primary: #FFFFFF;
        --ls-accent: #C28E5F;    --ls-secondary: #7F4108;       --ls-mocha: #8E6846;
        --ls-ink: #1A1A1A;       --ls-ink-70: rgba(26,26,26,.70);   --ls-ink-50: rgba(26,26,26,.50);
        --ls-border-strong: rgba(0,0,0,.23);   --ls-border: rgba(0,0,0,.12);   --ls-hairline: rgba(0,0,0,.06);
        --ls-card-border: rgba(116,80,47,.12);   --ls-tint: rgba(116,80,47,.08);
        --ls-focus: #A87548;     --ls-danger: #C62828;
        --ls-shadow-card: 0 1px 2px rgba(0,0,0,.04);
        --ls-open: #74502F;      --ls-open-bg: rgba(116,80,47,.10);
        --ls-progress: #0097A7;  --ls-progress-bg: rgba(38,198,218,.14);
        --ls-waiting: #B45309;   --ls-waiting-bg: rgba(255,167,38,.16);
        --ls-closed: rgba(26,26,26,.70);   --ls-closed-bg: rgba(26,26,26,.07);
        --ls-ok: #15803D;        --ls-ok-bg: rgba(34,197,94,.14);
        --ls-bad: #C62828;       --ls-bad-bg: rgba(239,83,80,.14);
        --ls-radius-pill: 999px;  --ls-radius-card: 12px;  --ls-radius-input: 8px;
        --ls-sidebar-w: 240px;    --ls-topbar-h: 64px;     --ls-row-h: 52px;

        /* Wolf Expresso, fixed. The auth screens are the brand at full strength
           and wear it whatever the theme is, which is why they cannot reach for
           --ls-sidebar: that one follows the theme. */
        --ls-expresso: #74502F;
        --ls-expresso-rgb: 116 80 47;

        --ls-terminal: #1E140C;
        --ls-terminal-ink: #F3E9DF;
        /* The terminal surface is the same dark in both themes, so anything
           drawn on it keeps a light hairline of its own: without it a tooltip
           over the sidebar of the dark theme has no edge at all. */
        --ls-terminal-border: rgba(255,255,255,.16);

        /* The sidebar keeps one ink in both themes: it is Wolf Expresso in light
           and the darkest brown in dark, so white always sits on top of it. */
        --ls-sidebar-ink: rgba(255,255,255,.70);
        --ls-sidebar-ink-strong: #FFFFFF;
        --ls-sidebar-ink-muted: rgba(255,255,255,.50);
        --ls-sidebar-hover: rgba(255,255,255,.08);
        --ls-sidebar-active: rgba(255,255,255,.14);

        --ls-ground-rgb: 250 248 245;
        --ls-paper-rgb: 255 255 255;
        --ls-sidebar-rgb: 116 80 47;
        --ls-primary-rgb: 116 80 47;
        --ls-primary-hover-rgb: 90 62 36;
        --ls-on-primary-rgb: 255 255 255;
        --ls-accent-rgb: 194 142 95;
        --ls-secondary-rgb: 127 65 8;
        --ls-mocha-rgb: 142 104 70;
        --ls-ink-rgb: 26 26 26;
        --ls-focus-rgb: 168 117 72;
        --ls-danger-rgb: 198 40 40;
        --ls-open-rgb: 116 80 47;
        --ls-progress-rgb: 0 151 167;
        --ls-waiting-rgb: 180 83 9;
        --ls-closed-rgb: 26 26 26;
        --ls-ok-rgb: 21 128 61;
        --ls-bad-rgb: 198 40 40;
        --ls-terminal-rgb: 30 20 12;
        --ls-terminal-ink-rgb: 243 233 223;
    }

    [data-theme="dark"] {
        --ls-ground: #241812;    --ls-paper: #2E1F16;     --ls-sidebar: #1E140C;
        --ls-primary: #C28E5F;   --ls-primary-hover: #A87548;   --ls-on-primary: #1E140C;
        --ls-ink: #FFFFFF;       --ls-ink-70: rgba(255,255,255,.70);   --ls-ink-50: rgba(255,255,255,.50);
        --ls-border-strong: rgba(255,255,255,.23);   --ls-border: rgba(255,255,255,.08);
        --ls-hairline: rgba(255,255,255,.06);   --ls-card-border: rgba(255,255,255,.08);
        --ls-tint: rgba(194,142,95,.14);   --ls-divider-accent: rgba(194,142,95,.15);
        --ls-focus: #C28E5F;     --ls-danger: #FF6659;    --ls-shadow-card: none;
        --ls-open: #D4A87F;      --ls-open-bg: rgba(194,142,95,.18);
        --ls-progress: #4DD0E1;  --ls-progress-bg: rgba(38,198,218,.18);
        --ls-waiting: #FFB74D;   --ls-waiting-bg: rgba(255,167,38,.18);
        --ls-closed: rgba(255,255,255,.70);   --ls-closed-bg: rgba(255,255,255,.08);
        --ls-ok: #4ADE80;        --ls-ok-bg: rgba(34,197,94,.18);
        --ls-bad: #FF6659;       --ls-bad-bg: rgba(239,83,80,.18);

        --ls-ground-rgb: 36 24 18;
        --ls-paper-rgb: 46 31 22;
        --ls-sidebar-rgb: 30 20 12;
        --ls-primary-rgb: 194 142 95;
        --ls-primary-hover-rgb: 168 117 72;
        --ls-on-primary-rgb: 30 20 12;
        --ls-ink-rgb: 255 255 255;
        --ls-focus-rgb: 194 142 95;
        --ls-danger-rgb: 255 102 89;
        --ls-open-rgb: 212 168 127;
        --ls-progress-rgb: 77 208 225;
        --ls-waiting-rgb: 255 183 77;
        --ls-closed-rgb: 255 255 255;
        --ls-ok-rgb: 74 222 128;
        --ls-bad-rgb: 255 102 89;
    }

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) {
            --ls-ground: #241812;    --ls-paper: #2E1F16;     --ls-sidebar: #1E140C;
            --ls-primary: #C28E5F;   --ls-primary-hover: #A87548;   --ls-on-primary: #1E140C;
            --ls-ink: #FFFFFF;       --ls-ink-70: rgba(255,255,255,.70);   --ls-ink-50: rgba(255,255,255,.50);
            --ls-border-strong: rgba(255,255,255,.23);   --ls-border: rgba(255,255,255,.08);
            --ls-hairline: rgba(255,255,255,.06);   --ls-card-border: rgba(255,255,255,.08);
            --ls-tint: rgba(194,142,95,.14);   --ls-divider-accent: rgba(194,142,95,.15);
            --ls-focus: #C28E5F;     --ls-danger: #FF6659;    --ls-shadow-card: none;
            --ls-open: #D4A87F;      --ls-open-bg: rgba(194,142,95,.18);
            --ls-progress: #4DD0E1;  --ls-progress-bg: rgba(38,198,218,.18);
            --ls-waiting: #FFB74D;   --ls-waiting-bg: rgba(255,167,38,.18);
            --ls-closed: rgba(255,255,255,.70);   --ls-closed-bg: rgba(255,255,255,.08);
            --ls-ok: #4ADE80;        --ls-ok-bg: rgba(34,197,94,.18);
            --ls-bad: #FF6659;       --ls-bad-bg: rgba(239,83,80,.18);

            --ls-ground-rgb: 36 24 18;
            --ls-paper-rgb: 46 31 22;
            --ls-sidebar-rgb: 30 20 12;
            --ls-primary-rgb: 194 142 95;
            --ls-primary-hover-rgb: 168 117 72;
            --ls-on-primary-rgb: 30 20 12;
            --ls-ink-rgb: 255 255 255;
            --ls-focus-rgb: 194 142 95;
            --ls-danger-rgb: 255 102 89;
            --ls-open-rgb: 212 168 127;
            --ls-progress-rgb: 77 208 225;
            --ls-waiting-rgb: 255 183 77;
            --ls-closed-rgb: 255 255 255;
            --ls-ok-rgb: 74 222 128;
            --ls-bad-rgb: 255 102 89;
        }
    }

    /*
     * The sidebar is a dark surface in both themes, so the semantic tones inside
     * it are the dark theme's. The light theme's are tuned for paper and lose
     * their contrast over Wolf Expresso: the green of a running server was very
     * nearly unreadable there.
     */
    [data-surface="sidebar"] {
        --ls-open: #D4A87F;      --ls-progress: #4DD0E1;
        --ls-waiting: #FFB74D;   --ls-closed: rgba(255,255,255,.70);
        --ls-ok: #4ADE80;        --ls-bad: #FF6659;

        /* A tinted background is transparent, so over Wolf Expresso it would
           carry the brown up into the chip and eat the contrast again. These
           are the same tints already flattened onto the darkest brown: opaque,
           so the light theme cannot bleed through, and still light enough to
           read as a chip against the sidebar of the dark theme. Every tone
           clears 4.5:1 on its own background. */
        --ls-open-bg: #3C2A1B;      --ls-progress-bg: #1F3431;
        --ls-waiting-bg: #472E11;   --ls-closed-bg: #352C24;
        --ls-ok-bg: #1F341B;        --ls-bad-bg: #441F18;

        --ls-open-rgb: 212 168 127;
        --ls-progress-rgb: 77 208 225;
        --ls-waiting-rgb: 255 183 77;
        --ls-closed-rgb: 255 255 255;
        --ls-ok-rgb: 74 222 128;
        --ls-bad-rgb: 255 102 89;
    }

    html {
        color-scheme: light dark;
    }

    :root[data-theme="light"] {
        color-scheme: light;
    }

    :root[data-theme="dark"] {
        color-scheme: dark;
    }

    body {
        margin: 0;
        font-family: var(--ls-font);
        font-weight: 400;
        background-color: var(--ls-ground);
        color: var(--ls-ink);
        letter-spacing: 0.015em;
    }

    h1, h2, h3, h4, h5, h6 {
        font-family: var(--ls-font);
        font-weight: 700;
        letter-spacing: normal;
        margin: 0;
    }

    p {
        font-family: var(--ls-font);
        color: var(--ls-ink-70);
        line-height: 1.375;
    }

    ::selection {
        background-color: var(--ls-tint);
    }

    form {
        margin: 0;
    }

    textarea, select, input, button, button:focus, button:focus-visible {
        outline: none;
    }

    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        margin: 0;
    }

    input[type=number] {
        -moz-appearance: textfield !important;
    }

    /* Scroll Bar Style */
    ::-webkit-scrollbar {
        background: none;
        width: 16px;
        height: 16px;
    }

    ::-webkit-scrollbar-thumb {
        border: solid 0 rgb(0 0 0 / 0%);
        border-right-width: 4px;
        border-left-width: 4px;
        -webkit-border-radius: 9px 4px;
        box-shadow: inset 0 0 0 1px var(--ls-border-strong), inset 0 0 0 4px var(--ls-ground);
    }

    ::-webkit-scrollbar-track-piece {
        margin: 4px 0;
    }

    ::-webkit-scrollbar-thumb:horizontal {
        border-right-width: 0;
        border-left-width: 0;
        border-top-width: 4px;
        border-bottom-width: 4px;
        -webkit-border-radius: 4px 9px;
    }

    ::-webkit-scrollbar-corner {
        background: transparent;
    }
`;
