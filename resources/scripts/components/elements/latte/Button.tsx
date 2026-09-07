import React, { forwardRef } from 'react';
import classNames from 'classnames';
import styles from './Button.module.css';

export type ButtonVariant = 'contained' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export type ButtonProps = JSX.IntrinsicElements['button'] & {
    /** Only one contained button belongs on a screen. */
    variant?: ButtonVariant;
    /** 32px for toolbars, alerts and table rows, 40px for cards, 48px for auth. */
    size?: ButtonSize;
    block?: boolean;
    iconOnly?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'outline', size = 'medium', block, iconOnly, className, type, children, ...rest }, ref) => (
        <button
            ref={ref}
            type={type ?? 'button'}
            className={classNames(
                styles.button,
                styles[variant],
                {
                    [styles.small]: size === 'small',
                    [styles.large]: size === 'large',
                    [styles.block]: block,
                    [styles.iconOnly]: iconOnly,
                },
                className
            )}
            {...rest}
        >
            {children}
        </button>
    )
);
Button.displayName = 'Button';

export default Button;
