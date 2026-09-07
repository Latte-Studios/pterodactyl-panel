import React, { useState } from 'react';
import { SelectorIcon } from '@heroicons/react/outline';
import SearchModal from '@/components/dashboard/search/SearchModal';
import { ServerContext } from '@/state/server';
import StatusChip from '@/components/elements/latte/StatusChip';
import { serverTone } from '@/components/elements/latte/status';
import styles from './ContextCard.module.css';

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
    restoring_backup: 'Restoring',
    node_maintenance: 'Node under maintenance',
};

/**
 * Shown at the top of the sidebar on a server screen only. It replaces the
 * search icon the old topbar carried: pressing it opens the same server search.
 */
const ContextCard = () => {
    const [searching, setSearching] = useState(false);

    const name = ServerContext.useStoreState(state => state.server.data?.name);
    // The store types this as the lifecycle status, but the websocket handler
    // writes the power state into it, which is what the console reads too.
    const power = ServerContext.useStoreState(state => state.status.value as string | null);
    const lifecycle = ServerContext.useStoreState(state => state.server.data?.status);
    const isTransferring = ServerContext.useStoreState(state => state.server.data?.isTransferring);
    const underMaintenance = ServerContext.useStoreState(state => state.server.data?.isNodeUnderMaintenance);

    if (!name) {
        return null;
    }

    const state = lifecycle
        ? lifecycle
        : isTransferring
          ? 'transferring'
          : underMaintenance
            ? 'node_maintenance'
            : (power ?? 'offline');

    return (
        <>
            {searching && <SearchModal appear visible onDismissed={() => setSearching(false)} />}
            <button
                type={'button'}
                onClick={() => setSearching(true)}
                aria-label={'Switch server'}
                className={styles.card}
            >
                <span className={styles.main}>
                    <span className={styles.eyebrow}>Server</span>
                    <span className={styles.name}>{name}</span>
                    <span className={styles.meta}>
                        <StatusChip tone={serverTone(state)}>
                            {labels[state] ?? state.charAt(0).toUpperCase() + state.slice(1)}
                        </StatusChip>
                    </span>
                </span>
                <SelectorIcon className={styles.chevron} />
            </button>
        </>
    );
};

export default ContextCard;
