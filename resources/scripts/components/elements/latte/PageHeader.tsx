import React from 'react';
import classNames from 'classnames';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
    /** The area this screen belongs to, in caps above the title. */
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** At most two buttons; at most one of them contained. */
    actions?: React.ReactNode;
    className?: string;
}

const PageHeader = ({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) => (
    <header className={classNames(styles.header, className)}>
        <div>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
    </header>
);

export default PageHeader;
