import React from 'react';
import classNames from 'classnames';
import buttonStyles from '@/components/elements/latte/Button.module.css';
import type { ButtonSize } from '@/components/elements/latte/Button';

interface Props {
    /** Where to land after signing in; same-site paths only. */
    redirect?: string;
    size?: ButtonSize;
    block?: boolean;
    children?: React.ReactNode;
    className?: string;
}

/**
 * The Google "G" in its four brand colours, the one mark on the auth screens
 * that is not in the palette: Google's sign-in guidelines require it, and it
 * lives inside the button only.
 */
export const GoogleMark = () => (
    <svg width={18} height={18} viewBox={'0 0 18 18'} aria-hidden={'true'} focusable={'false'}>
        <path
            fill={'#4285F4'}
            d={
                'M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z'
            }
        />
        <path
            fill={'#34A853'}
            d={
                'M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z'
            }
        />
        <path
            fill={'#FBBC05'}
            d={
                'M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z'
            }
        />
        <path
            fill={'#EA4335'}
            d={
                'M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z'
            }
        />
    </svg>
);

/**
 * A full-page link, not a fetch: the panel answers with a redirect to Google
 * and the browser has to follow it. Styled as the outline button so the one
 * contained button on the screen stays the primary action.
 */
export default ({ redirect, size = 'medium', block, children = 'Continue with Google', className }: Props) => {
    const href = '/auth/sso/google' + (redirect ? '?redirect=' + encodeURIComponent(redirect) : '');

    return (
        <a
            href={href}
            className={classNames(
                buttonStyles.button,
                buttonStyles.outline,
                {
                    [buttonStyles.small]: size === 'small',
                    [buttonStyles.large]: size === 'large',
                    [buttonStyles.block]: block,
                },
                className
            )}
        >
            <GoogleMark />
            {children}
        </a>
    );
};
