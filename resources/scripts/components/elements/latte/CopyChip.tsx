import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import { CheckIcon, ClipboardCopyIcon } from '@heroicons/react/outline';
import styles from './CopyChip.module.css';

export interface CopyChipProps {
    /** The text placed on the clipboard. Defaults to the label. */
    value: string;
    label?: React.ReactNode;
    /** Rendered at 16px in cards and tables, 14px inline. */
    icon?: React.ComponentType<{ className?: string }>;
    size?: 'default' | 'inline';
    className?: string;
}

const CopyChip = ({ value, label, icon: Icon, size = 'default', className }: CopyChipProps) => {
    const [copied, setCopied] = useState(false);
    const timeout = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(timeout.current), []);

    const onClick = () => {
        copy(value);
        setCopied(true);

        clearTimeout(timeout.current);
        timeout.current = setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type={'button'}
            onClick={onClick}
            title={value}
            aria-label={`Copy ${value}`}
            className={classNames(
                styles.chip,
                { [styles.inline]: size === 'inline', [styles.copied]: copied },
                className,
            )}
        >
            {Icon && <Icon className={styles.leading} />}
            <span className={styles.value}>{label ?? value}</span>
            {copied ? <CheckIcon className={styles.copy} /> : <ClipboardCopyIcon className={styles.copy} />}
        </button>
    );
};

export default CopyChip;
