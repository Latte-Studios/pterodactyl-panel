import React from 'react';
import classNames from 'classnames';
import styles from './Alert.module.css';
import { StatusTone } from './status';

export interface AlertProps {
    tone: StatusTone;
    title?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
    /** Toolbar sized buttons, 32px. */
    actions?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}

const Alert = ({ tone, title, icon: Icon, actions, className, children }: AlertProps) => (
    <div role={'status'} data-tone={tone} className={classNames(styles.alert, styles[tone], className)}>
        {Icon && <Icon className={styles.icon} />}
        <div className={styles.content}>
            {title && <p className={styles.title}>{title}</p>}
            {children}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
    </div>
);

export default Alert;
