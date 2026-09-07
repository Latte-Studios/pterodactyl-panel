import {
    AdjustmentsIcon,
    ClipboardListIcon,
    ClockIcon,
    CogIcon,
    DatabaseIcon,
    FolderIcon,
    KeyIcon,
    LibraryIcon,
    ServerIcon,
    ShareIcon,
    TerminalIcon,
    UserCircleIcon,
    UsersIcon,
    ViewGridIcon,
} from '@heroicons/react/outline';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import routes from '@/routers/routes';
import { ShellNavGroup, ShellNavItem } from './types';

type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Icons and grouping live here rather than in routes.ts so the route table
 * stays the upstream file it is and merges cleanly.
 */
const icons: Record<string, IconComponent> = {
    Console: TerminalIcon,
    Files: FolderIcon,
    Databases: DatabaseIcon,
    Schedules: ClockIcon,
    Users: UsersIcon,
    Backups: LibraryIcon,
    Network: ShareIcon,
    Startup: AdjustmentsIcon,
    Settings: CogIcon,
    Activity: ClipboardListIcon,
    Account: UserCircleIcon,
    'API Credentials': KeyIcon,
    'SSH Keys': KeyIcon,
};

const groupOf: Record<string, string | undefined> = {
    Console: undefined,
    Files: 'Manage',
    Databases: 'Manage',
    Backups: 'Manage',
    Schedules: 'Manage',
    Network: 'Configure',
    Startup: 'Configure',
    Settings: 'Configure',
    Users: 'Configure',
    Activity: 'Configure',
};

/** Keeps the groups in a fixed order regardless of the order routes.ts lists. */
const order = [undefined, 'Manage', 'Configure'];

const collect = (items: (ShellNavItem & { group?: string })[]): ShellNavGroup[] =>
    order
        .map((label) => ({ label, items: items.filter((item) => item.group === label) }))
        .filter((group) => group.items.length > 0);

const join = (base: string, path: string): string => `${base}/${path}`.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');

/**
 * Server navigation, filtered by what the current user may actually reach. The
 * permissions of every route are checked in one call so the hook count stays
 * fixed no matter which routes are visible.
 */
export const useServerNavigation = (basePath: string): { groups: ShellNavGroup[]; subnav: ShellNavItem[] } => {
    const named = routes.server.filter((route) => !!route.name);
    const flattened = named.flatMap((route) =>
        route.permission === null ? [] : Array.isArray(route.permission) ? route.permission : [route.permission]
    );

    const granted = usePermissions(flattened);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);
    const internalId = ServerContext.useStoreState((state) => state.server.data?.internalId);

    let cursor = 0;
    const allowed = named.filter((route) => {
        if (route.permission === null) {
            return true;
        }

        const count = Array.isArray(route.permission) ? route.permission.length : 1;
        const slice = granted.slice(cursor, cursor + count);

        cursor += count;

        // The sub-navigation matched any of the listed permissions, not all.
        return slice.some(Boolean);
    });

    const items = allowed.map((route) => ({
        to: join(basePath, route.path),
        label: route.name!,
        icon: icons[route.name!] ?? ServerIcon,
        exact: route.exact,
        group: groupOf[route.name!],
    }));

    const groups = collect(items);

    if (rootAdmin && internalId) {
        groups.push({
            label: 'Admin',
            items: [
                { to: '/', label: 'Dashboard', icon: ViewGridIcon, exact: true },
                {
                    to: `/admin/servers/view/${internalId}`,
                    label: 'Admin panel',
                    icon: CogIcon,
                    external: true,
                },
            ],
        });
    } else {
        groups.push({ items: [{ to: '/', label: 'Dashboard', icon: ViewGridIcon, exact: true }] });
    }

    // The group only decides which sidebar section an item lands in, so the
    // sub navigation drops it.
    return { groups, subnav: items.map(({ group: _group, ...item }) => item) };
};

/** Dashboard and account navigation. There are no per-server permissions here. */
export const useDashboardNavigation = (): { groups: ShellNavGroup[]; subnav: ShellNavItem[] } => {
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);

    const account = routes.account
        .filter((route) => !!route.name)
        .map((route) => ({
            to: join('/account', route.path),
            label: route.name!,
            icon: icons[route.name!] ?? UserCircleIcon,
            exact: route.exact,
        }));

    const groups: ShellNavGroup[] = [
        { items: [{ to: '/', label: 'Dashboard', icon: ViewGridIcon, exact: true }] },
        { label: 'Account', items: account },
    ];

    if (rootAdmin) {
        groups.push({
            label: 'Admin',
            items: [{ to: '/admin', label: 'Admin panel', icon: CogIcon, external: true }],
        });
    }

    return { groups, subnav: account };
};
