import React from 'react';
import classNames from 'classnames';
import styles from './Toolbar.module.css';

export interface ToolbarProps {
    className?: string;
    children?: React.ReactNode;
}

const Toolbar = ({ className, children }: ToolbarProps) => (
    <div className={classNames(styles.toolbar, className)}>{children}</div>
);

const Search = ({ className, children }: ToolbarProps) => (
    <div className={classNames(styles.search, className)}>{children}</div>
);

const Divider = () => <span className={styles.divider} />;

const Spacer = () => <span className={styles.spacer} />;

const Chips = ({ className, children }: ToolbarProps) => (
    <div className={classNames(styles.chips, className)}>{children}</div>
);

export interface ToolbarChipProps {
    active?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
}

const Chip = ({ active, onClick, children, className }: ToolbarChipProps) => (
    <button
        type={'button'}
        onClick={onClick}
        aria-pressed={!!active}
        className={classNames(styles.chip, { [styles.chipActive]: active }, className)}
    >
        {children}
    </button>
);

export default Object.assign(Toolbar, { Search, Divider, Spacer, Chips, Chip });
