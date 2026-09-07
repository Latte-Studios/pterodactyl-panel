import React from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/outline';
import useTheme from '@/plugins/useTheme';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import styles from './shell.module.css';

/**
 * Sits in the sidebar footer next to the other icon actions. The first press
 * moves off the system preference and pins the opposite of whatever is on
 * screen.
 */
const ThemeToggle = () => {
    const { theme, toggle } = useTheme();
    const label = theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme';

    return (
        <Tooltip placement={'top'} content={label}>
            <button type={'button'} onClick={toggle} aria-label={label} className={styles.iconButton}>
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
        </Tooltip>
    );
};

export default ThemeToggle;
