import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import classNames from 'classnames';
import { useStoreState } from 'easy-peasy';
import { LogoutIcon, MenuIcon, SearchIcon, XIcon } from '@heroicons/react/outline';
import { ApplicationStore } from '@/state';
import http from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import SearchModal from '@/components/dashboard/search/SearchModal';
import Avatar from '@/components/elements/latte/Avatar';
import ThemeToggle from './ThemeToggle';
import { ShellNavGroup, ShellNavItem } from './types';
import styles from './shell.module.css';

export interface ShellProps {
    groups: ShellNavGroup[];
    /** Rendered under the brand. Only server screens pass one. */
    context?: React.ReactNode;
    /** Section links, shown as scrollable tabs below 640px. */
    subnav?: ShellNavItem[];
    children: React.ReactNode;
}

const Item = ({ item, onNavigate }: { item: ShellNavItem; onNavigate: () => void }) => {
    const content = (
        <>
            <item.icon className={styles.itemIcon} />
            <span className={styles.itemLabel}>{item.label}</span>
        </>
    );

    if (item.external) {
        return (
            <a href={item.to} rel={'noreferrer'} className={styles.item}>
                {content}
            </a>
        );
    }

    return (
        <NavLink
            to={item.to}
            exact={item.exact}
            onClick={onNavigate}
            className={styles.item}
            activeClassName={styles.itemActive}
        >
            {content}
        </NavLink>
    );
};

const Shell = ({ groups, context, subnav, children }: ShellProps) => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const user = useStoreState((state: ApplicationStore) => state.user.data!);

    const onLogout = () => {
        setLoggingOut(true);
        http.post('/auth/logout').finally(() => {
            window.location.href = '/';
        });
    };

    const closeDrawer = () => setDrawerOpen(false);

    return (
        <div className={styles.shell}>
            <SpinnerOverlay visible={loggingOut} />
            {searching && <SearchModal appear visible onDismissed={() => setSearching(false)} />}
            {drawerOpen && <div className={styles.drawer} onClick={closeDrawer} />}
            <aside className={classNames(styles.sidebar, { [styles.drawerOpen]: drawerOpen })}>
                <Link to={'/'} onClick={closeDrawer} className={styles.brand}>
                    <span className={styles.brandMark} aria-hidden>
                        {name.slice(0, 1)}
                    </span>
                    <span className={styles.brandName}>{name}</span>
                </Link>
                {context && <div className={styles.context}>{context}</div>}
                <nav className={styles.nav}>
                    {groups.map((group, index) => (
                        <div key={group.label ?? index} className={styles.group}>
                            {group.label && <p className={styles.groupLabel}>{group.label}</p>}
                            {group.items.map((item) => (
                                <Item key={item.to} item={item} onNavigate={closeDrawer} />
                            ))}
                        </div>
                    ))}
                </nav>
                <div className={styles.footer}>
                    <Link to={'/account'} onClick={closeDrawer} className={styles.user}>
                        <Avatar name={user.username} identifier={user.uuid} size={'small'} />
                        <span className={styles.userText}>
                            <span className={styles.userName}>{user.username}</span>
                            <span className={styles.userEmail}>{user.email}</span>
                        </span>
                    </Link>
                    <div className={styles.footerRow}>
                        <Tooltip placement={'top'} content={'Search servers'}>
                            <button
                                type={'button'}
                                onClick={() => setSearching(true)}
                                aria-label={'Search servers'}
                                className={styles.iconButton}
                            >
                                <SearchIcon />
                            </button>
                        </Tooltip>
                        <ThemeToggle />
                        <span className={styles.footerSpacer} />
                        <Tooltip placement={'top'} content={'Sign out'}>
                            <button
                                type={'button'}
                                onClick={onLogout}
                                aria-label={'Sign out'}
                                className={styles.iconButton}
                            >
                                <LogoutIcon />
                            </button>
                        </Tooltip>
                    </div>
                    <p className={styles.credit}>
                        <a rel={'noopener nofollow noreferrer'} href={'https://pterodactyl.io'} target={'_blank'}>
                            Pterodactyl&reg;
                        </a>
                        &nbsp;&copy; 2015 - {new Date().getFullYear()}
                    </p>
                </div>
            </aside>
            <div className={styles.main}>
                <header className={styles.topbar}>
                    <button
                        type={'button'}
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        aria-label={drawerOpen ? 'Close the menu' : 'Open the menu'}
                        aria-expanded={drawerOpen}
                        className={styles.iconButton}
                    >
                        {drawerOpen ? <XIcon /> : <MenuIcon />}
                    </button>
                    <span className={styles.topbarTitle}>{name}</span>
                </header>
                {subnav && subnav.length > 0 && (
                    <nav className={styles.tabs}>
                        {subnav.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                exact={item.exact}
                                className={styles.tab}
                                activeClassName={styles.tabActive}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                )}
                <main className={styles.content}>{children}</main>
            </div>
        </div>
    );
};

export default Shell;
