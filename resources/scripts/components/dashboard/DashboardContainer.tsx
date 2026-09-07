import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import useSWR from 'swr';
import classNames from 'classnames';
import { useStoreState } from 'easy-peasy';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import { PaginatedResult } from '@/api/http';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import Pagination from '@/components/elements/Pagination';
import useFlash from '@/plugins/useFlash';
import { usePersistedState } from '@/plugins/usePersistedState';
import Card from '@/components/elements/latte/Card';
import CopyChip from '@/components/elements/latte/CopyChip';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import StatusChip from '@/components/elements/latte/StatusChip';
import Toolbar from '@/components/elements/latte/Toolbar';
import { Input } from '@/components/elements/latte/Input';
import { serverTone } from '@/components/elements/latte/status';
import { ServerStatsMap, useServerStats } from './useServerStats';
import styles from './dashboard.module.css';

const labels: Record<string, string> = {
    running: 'Running',
    starting: 'Starting',
    stopping: 'Stopping',
    offline: 'Offline',
    suspended: 'Suspended',
    installing: 'Installing',
    install_failed: 'Install failed',
    reinstall_failed: 'Reinstall failed',
    transferring: 'Transferring',
    restoring_backup: 'Restoring backup',
    node_maintenance: 'Under maintenance',
};

/** Everything a row shows about a server's state comes out of here. */
const stateOf = (server: Server, stats: ServerStatsMap): string => {
    if (server.status === 'suspended' || stats[server.uuid]?.isSuspended) {
        return 'suspended';
    }

    if (server.isNodeUnderMaintenance) {
        return 'node_maintenance';
    }

    if (server.isTransferring) {
        return 'transferring';
    }

    return server.status ?? stats[server.uuid]?.status ?? 'offline';
};

const address = (server: Server): string => {
    const allocation = server.allocations.find(alloc => alloc.isDefault);

    if (!allocation) {
        return '';
    }

    return `${allocation.alias || ip(allocation.ip)}:${allocation.port}`;
};

const alarming = (used: number, limitInMb: number): boolean => limitInMb > 0 && used / mbToBytes(limitInMb) >= 0.9;

interface UsageProps {
    value: string;
    limit: string;
    alarm?: boolean;
}

const Usage = ({ value, limit, alarm }: UsageProps) => (
    <span className={styles.usage}>
        <span className={classNames({ [styles.alarm]: alarm })}>{value}</span>
        <span className={styles.limit}>of {limit}</span>
    </span>
);

export default () => {
    const { search } = useLocation();
    const history = useHistory();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const [query, setQuery] = useState('');
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState(state => state.user.data!.uuid);
    const rootAdmin = useStoreState(state => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page],
        () => getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined }),
    );

    const stats = useServerStats(servers?.items ?? []);

    useEffect(() => {
        setPage(1);
    }, [showOnlyAdmin]);

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        // Don't use react-router to handle changing this part of the URL, otherwise it
        // triggers a needless re-render. We just want to track this in the URL incase the
        // user refreshes the page.
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    const columns: DataTableColumn<Server>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Server',
                render: server => (
                    <div>
                        <p className={styles.name}>{server.name}</p>
                        {!!server.description && <p className={styles.description}>{server.description}</p>}
                    </div>
                ),
            },
            {
                key: 'address',
                header: 'Address',
                render: server => {
                    const value = address(server);

                    return value ? <CopyChip value={value} /> : <span className={styles.muted}>None</span>;
                },
            },
            {
                key: 'status',
                header: 'Status',
                render: server => {
                    const state = stateOf(server, stats);

                    return <StatusChip tone={serverTone(state)}>{labels[state] ?? state}</StatusChip>;
                },
            },
            {
                key: 'cpu',
                header: 'CPU',
                align: 'right',
                render: server => {
                    const usage = stats[server.uuid];

                    if (!usage) {
                        return <span className={styles.muted}>&mdash;</span>;
                    }

                    return (
                        <Usage
                            value={`${usage.cpuUsagePercent.toFixed(2)} %`}
                            limit={server.limits.cpu === 0 ? 'Unlimited' : `${server.limits.cpu} %`}
                            alarm={server.limits.cpu > 0 && usage.cpuUsagePercent >= server.limits.cpu * 0.9}
                        />
                    );
                },
            },
            {
                key: 'memory',
                header: 'Memory',
                align: 'right',
                render: server => {
                    const usage = stats[server.uuid];

                    if (!usage) {
                        return <span className={styles.muted}>&mdash;</span>;
                    }

                    return (
                        <Usage
                            value={bytesToString(usage.memoryUsageInBytes)}
                            limit={
                                server.limits.memory === 0
                                    ? 'Unlimited'
                                    : bytesToString(mbToBytes(server.limits.memory))
                            }
                            alarm={alarming(usage.memoryUsageInBytes, server.limits.memory)}
                        />
                    );
                },
            },
            {
                key: 'disk',
                header: 'Disk',
                align: 'right',
                render: server => {
                    const usage = stats[server.uuid];

                    if (!usage) {
                        return <span className={styles.muted}>&mdash;</span>;
                    }

                    return (
                        <Usage
                            value={bytesToString(usage.diskUsageInBytes)}
                            limit={
                                server.limits.disk === 0 ? 'Unlimited' : bytesToString(mbToBytes(server.limits.disk))
                            }
                            alarm={alarming(usage.diskUsageInBytes, server.limits.disk)}
                        />
                    );
                },
            },
        ],
        [stats],
    );

    const matches = (server: Server): boolean => {
        const needle = query.trim().toLowerCase();

        if (needle.length === 0) {
            return true;
        }

        return (
            server.name.toLowerCase().includes(needle) ||
            (server.description ?? '').toLowerCase().includes(needle) ||
            address(server).toLowerCase().includes(needle)
        );
    };

    return (
        <PageContentBlock
            title={'Dashboard'}
            eyebrow={'Overview'}
            heading={'Servers'}
            subtitle={showOnlyAdmin ? 'Every server on this panel.' : 'The servers you have access to.'}
            showFlashKey={'dashboard'}
        >
            <Toolbar>
                <Toolbar.Search>
                    <Input
                        type={'search'}
                        value={query}
                        placeholder={'Search servers'}
                        aria-label={'Search servers'}
                        onChange={event => setQuery(event.currentTarget.value)}
                    />
                </Toolbar.Search>
                {rootAdmin && (
                    <>
                        <Toolbar.Divider />
                        <Toolbar.Chips>
                            <Toolbar.Chip active={!showOnlyAdmin} onClick={() => setShowOnlyAdmin(false)}>
                                Mine
                            </Toolbar.Chip>
                            <Toolbar.Chip active={showOnlyAdmin} onClick={() => setShowOnlyAdmin(true)}>
                                All
                            </Toolbar.Chip>
                        </Toolbar.Chips>
                    </>
                )}
            </Toolbar>
            {!servers ? (
                <Spinner centered size={'large'} />
            ) : (
                <Pagination data={servers} onPageSelect={setPage}>
                    {({ items }) => (
                        <Card flush>
                            <DataTable
                                columns={columns}
                                rows={items.filter(matches)}
                                keyOf={server => server.uuid}
                                onRowClick={server => history.push(`/server/${server.id}`)}
                                empty={
                                    query.trim().length > 0
                                        ? 'No server matches that search.'
                                        : showOnlyAdmin
                                          ? 'There are no other servers to display.'
                                          : 'There are no servers associated with your account.'
                                }
                                mobile={{
                                    title: server => server.name,
                                    subtitle: server => address(server) || server.description,
                                    status: server => {
                                        const state = stateOf(server, stats);

                                        return (
                                            <StatusChip tone={serverTone(state)}>{labels[state] ?? state}</StatusChip>
                                        );
                                    },
                                    kpis: server => {
                                        const usage = stats[server.uuid];

                                        if (!usage) {
                                            return [];
                                        }

                                        return [
                                            { label: 'CPU', value: `${usage.cpuUsagePercent.toFixed(2)} %` },
                                            { label: 'Memory', value: bytesToString(usage.memoryUsageInBytes) },
                                            { label: 'Disk', value: bytesToString(usage.diskUsageInBytes) },
                                        ];
                                    },
                                }}
                            />
                        </Card>
                    )}
                </Pagination>
            )}
        </PageContentBlock>
    );
};
