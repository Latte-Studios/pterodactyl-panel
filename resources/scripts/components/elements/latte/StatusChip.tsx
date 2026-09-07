import React from 'react';
import classNames from 'classnames';
import styles from './StatusChip.module.css';
import { StatusTone } from './status';

export interface StatusChipProps {
    tone: StatusTone;
    children: React.ReactNode;
    /** Hidden by default; useful where the chip sits next to other chips. */
    dot?: boolean;
    className?: string;
}

const StatusChip = ({ tone, children, dot = true, className }: StatusChipProps) => (
    <span className={classNames(styles.chip, styles[tone], className)} data-tone={tone}>
        {dot && <span className={styles.dot} />}
        {children}
    </span>
);

export default StatusChip;
