/**
 * Every colour in this file resolves to a token defined in
 * resources/scripts/assets/css/GlobalStylesheet.ts. There are two ways to
 * reach them, because twin.macro 2.8 does not resolve Tailwind's
 * `<alpha-value>` placeholder and emits it literally:
 *
 *   ls.*      rgb(var(--ls-x-rgb) / <alpha-value>) — new code only, opacity
 *             modifiers such as `bg-ls-paper/50` work.
 *   aliases   var(--ls-x) — the legacy palette names that twin.macro code still
 *             uses. Opacity modifiers are silently dropped on these, so a
 *             modifier belongs on an `ls.*` colour instead.
 */

// Colours new code should use. Tokens that already carry a fixed alpha are
// passed through unchanged; there is nothing left for a modifier to do to them.
const ls = {
    ground: 'rgb(var(--ls-ground-rgb) / <alpha-value>)',
    paper: 'rgb(var(--ls-paper-rgb) / <alpha-value>)',
    sidebar: 'rgb(var(--ls-sidebar-rgb) / <alpha-value>)',
    primary: 'rgb(var(--ls-primary-rgb) / <alpha-value>)',
    'primary-hover': 'rgb(var(--ls-primary-hover-rgb) / <alpha-value>)',
    'on-primary': 'rgb(var(--ls-on-primary-rgb) / <alpha-value>)',
    accent: 'rgb(var(--ls-accent-rgb) / <alpha-value>)',
    secondary: 'rgb(var(--ls-secondary-rgb) / <alpha-value>)',
    mocha: 'rgb(var(--ls-mocha-rgb) / <alpha-value>)',
    ink: 'rgb(var(--ls-ink-rgb) / <alpha-value>)',
    'ink-70': 'var(--ls-ink-70)',
    'ink-50': 'var(--ls-ink-50)',
    'border-strong': 'var(--ls-border-strong)',
    border: 'var(--ls-border)',
    hairline: 'var(--ls-hairline)',
    'card-border': 'var(--ls-card-border)',
    tint: 'var(--ls-tint)',
    'divider-accent': 'var(--ls-divider-accent)',
    focus: 'rgb(var(--ls-focus-rgb) / <alpha-value>)',
    danger: 'rgb(var(--ls-danger-rgb) / <alpha-value>)',
    terminal: 'rgb(var(--ls-terminal-rgb) / <alpha-value>)',
    'terminal-ink': 'rgb(var(--ls-terminal-ink-rgb) / <alpha-value>)',
    open: 'rgb(var(--ls-open-rgb) / <alpha-value>)',
    'open-bg': 'var(--ls-open-bg)',
    progress: 'rgb(var(--ls-progress-rgb) / <alpha-value>)',
    'progress-bg': 'var(--ls-progress-bg)',
    waiting: 'rgb(var(--ls-waiting-rgb) / <alpha-value>)',
    'waiting-bg': 'var(--ls-waiting-bg)',
    closed: 'rgb(var(--ls-closed-rgb) / <alpha-value>)',
    'closed-bg': 'var(--ls-closed-bg)',
    ok: 'rgb(var(--ls-ok-rgb) / <alpha-value>)',
    'ok-bg': 'var(--ls-ok-bg)',
    bad: 'rgb(var(--ls-bad-rgb) / <alpha-value>)',
    'bad-bg': 'var(--ls-bad-bg)',
};

// The legacy palette, remapped onto the tokens so screens that have not been
// rewritten yet still render in the Latte colours. Each scale keeps its shape;
// only the values behind it change.
const surface = {
    50: 'var(--ls-paper)',
    100: 'var(--ls-ink)',
    200: 'var(--ls-ink)',
    300: 'var(--ls-ink-70)',
    400: 'var(--ls-ink-50)',
    500: 'var(--ls-border-strong)',
    600: 'var(--ls-tint)',
    700: 'var(--ls-paper)',
    800: 'var(--ls-ground)',
    900: 'var(--ls-sidebar)',
};

const brand = {
    50: 'var(--ls-tint)',
    100: 'var(--ls-tint)',
    200: 'var(--ls-accent)',
    300: 'var(--ls-accent)',
    400: 'var(--ls-accent)',
    500: 'var(--ls-primary)',
    600: 'var(--ls-primary)',
    700: 'var(--ls-primary-hover)',
    800: 'var(--ls-primary-hover)',
    900: 'var(--ls-primary-hover)',
    950: 'var(--ls-sidebar)',
};

module.exports = {
    content: [
        './resources/scripts/**/*.{js,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Lato', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
                header: ['Lato', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
                mono: ['ui-monospace', '"Cascadia Mono"', 'Consolas', 'monospace'],
            },
            colors: {
                ls: ls,
                // The terminal keeps its own colour in both themes.
                black: 'var(--ls-terminal)',
                // "primary" and "neutral" are deprecated, prefer the use of "ls"
                // in new code.
                primary: brand,
                blue: brand,
                cyan: brand,
                gray: surface,
                neutral: surface,
            },
            fontSize: {
                '2xs': '0.625rem',
            },
            borderRadius: {
                pill: 'var(--ls-radius-pill)',
                card: 'var(--ls-radius-card)',
                input: 'var(--ls-radius-input)',
            },
            height: {
                row: 'var(--ls-row-h)',
                topbar: 'var(--ls-topbar-h)',
            },
            width: {
                sidebar: 'var(--ls-sidebar-w)',
            },
            boxShadow: {
                card: 'var(--ls-shadow-card)',
            },
            transitionDuration: {
                250: '250ms',
            },
            borderColor: theme => ({
                default: theme('colors.ls.border', 'currentColor'),
            }),
        },
    },
    plugins: [
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ]
};
