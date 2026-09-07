import React from 'react';
import classNames from 'classnames';
import styles from './Switch.module.css';

export interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: React.ReactNode;
    disabled?: boolean;
    name?: string;
    className?: string;
}

const Switch = ({ checked, onChange, label, disabled, name, className }: SwitchProps) => (
    <label className={classNames(styles.wrapper, { [styles.disabled]: disabled }, className)}>
        <button
            type={'button'}
            role={'switch'}
            name={name}
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={classNames(styles.track, { [styles.on]: checked })}
        >
            <span className={styles.knob} />
        </button>
        {label && <span className={styles.label}>{label}</span>}
    </label>
);

export default Switch;
