import React from 'react';
import classNames from 'classnames';
import styles from './StatCard.module.css';
import { StatusTone } from './status';

const barClass: Record<StatusTone, string> = {
    open: styles.barOpen,
    progress: styles.barProgress,
    waiting: styles.barWaiting,
    closed: styles.barClosed,
    ok: styles.barOk,
    bad: styles.barBad,
};

/** A reading above the ceiling still fills the bar, it never overflows it. */
const clamp = (percent: number): number => Math.round(Math.min(100, Math.max(0, percent)));

export interface StatCardProps {
    label: React.ReactNode;
    value: React.ReactNode;
    unit?: React.ReactNode;
    hint?: React.ReactNode;
    /** 20px value instead of 28px, for the row of cards above the console. */
    compact?: boolean;
    /** Percentage between 0 and 100. Omit to leave the bar out. */
    percent?: number;
    tone?: StatusTone;
    className?: string;
    children?: React.ReactNode;
}

const StatCard = ({ label, value, unit, hint, compact, percent, tone, className, children }: StatCardProps) => (
    <div className={classNames(styles.card, { [styles.compact]: compact }, className)}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
            {value}
            {unit && <span className={styles.unit}>{unit}</span>}
        </span>
        {hint && <span className={styles.hint}>{hint}</span>}
        {percent !== undefined && (
            <div
                className={styles.track}
                role={'progressbar'}
                aria-valuenow={clamp(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={classNames(styles.bar, tone && barClass[tone])}
                    style={{ width: `${clamp(percent)}%` }}
                />
            </div>
        )}
        {children}
    </div>
);

export default StatCard;
