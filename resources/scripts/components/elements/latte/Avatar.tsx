import React from 'react';
import classNames from 'classnames';
import styles from './Avatar.module.css';

const palette = [styles.primary, styles.secondary, styles.mocha];

/** Stable across reloads and machines: the same identity always gets the same colour. */
const hash = (value: string): number => {
    let total = 0;

    for (let i = 0; i < value.length; i++) {
        total = (total * 31 + value.charCodeAt(i)) >>> 0;
    }

    return total;
};

export const initials = (name: string): string => {
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    if (parts.length === 1) {
        return parts[0]!.slice(0, 2);
    }

    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`;
};

export interface AvatarProps {
    /** Shown as up to two initials. */
    name: string;
    /** Picks the colour. Falls back to the name when there is no identifier. */
    identifier?: string;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

const Avatar = ({ name, identifier, size = 'medium', className }: AvatarProps) => (
    <span
        aria-hidden
        title={name}
        className={classNames(
            styles.avatar,
            palette[hash(identifier ?? name) % palette.length],
            { [styles.small]: size === 'small', [styles.large]: size === 'large' },
            className,
        )}
    >
        {initials(name)}
    </span>
);

export default Avatar;
