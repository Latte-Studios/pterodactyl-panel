import React from 'react';
import classNames from 'classnames';
import styles from './Card.module.css';

export interface CardProps {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Header actions. Card headers use 40px buttons. */
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    /** Drops the body padding, for a table that reaches the card edges. */
    flush?: boolean;
    className?: string;
    bodyClassName?: string;
    children?: React.ReactNode;
}

const Card = ({ title, subtitle, actions, footer, flush, className, bodyClassName, children }: CardProps) => (
    <section className={classNames(styles.card, className)}>
        {(title || actions) && (
            <header className={styles.header}>
                <div>
                    {title && <h2 className={styles.title}>{title}</h2>}
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </header>
        )}
        <div className={classNames(styles.body, { [styles.flush]: flush }, bodyClassName)}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
);

export default Card;
