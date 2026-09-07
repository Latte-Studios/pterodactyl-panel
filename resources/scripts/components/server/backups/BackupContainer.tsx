import React, { useContext, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import Spinner from '@/components/elements/Spinner';
import useFlash from '@/plugins/useFlash';
import Can from '@/components/elements/Can';
import CreateBackupButton from '@/components/server/backups/CreateBackupButton';
import BackupContextMenu from '@/components/server/backups/BackupContextMenu';
import BackupCompletionListener from '@/components/server/backups/BackupCompletionListener';
import getServerBackups, { Context as ServerBackupContext } from '@/api/swr/getServerBackups';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Pagination from '@/components/elements/Pagination';
import Card from '@/components/elements/latte/Card';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import StatusChip from '@/components/elements/latte/StatusChip';
import { backupTone } from '@/components/elements/latte/status';
import { bytesToString } from '@/lib/formatters';
import { ServerBackup } from '@/api/server/types';
import styles from './backups.module.css';

type State = 'completed' | 'in_progress' | 'failed';

const stateOf = (backup: ServerBackup): State =>
    backup.completedAt === null ? 'in_progress' : backup.isSuccessful ? 'completed' : 'failed';

const labels: Record<State, string> = {
    completed: 'Completed',
    in_progress: 'In progress',
    failed: 'Failed',
};

const BackupContainer = () => {
    const { page, setPage } = useContext(ServerBackupContext);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { data: backups, error, isValidating } = getServerBackups();

    const backupLimit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.backups);

    useEffect(() => {
        if (!error) {
            clearFlashes('backups');

            return;
        }

        clearAndAddHttpError({ error, key: 'backups' });
    }, [error]);

    const columns: DataTableColumn<ServerBackup>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Backup',
                render: (backup) => (
                    <div>
                        <p className={styles.name}>
                            {backup.name}
                            {backup.isLocked && <span className={styles.locked}>Locked</span>}
                        </p>
                        {!!backup.checksum && <p className={styles.checksum}>{backup.checksum}</p>}
                    </div>
                ),
            },
            {
                key: 'status',
                header: 'Status',
                render: (backup) => {
                    const state = stateOf(backup);

                    return <StatusChip tone={backupTone(state)}>{labels[state]}</StatusChip>;
                },
            },
            {
                key: 'size',
                header: 'Size',
                align: 'right',
                render: (backup) =>
                    backup.completedAt !== null && backup.isSuccessful ? (
                        bytesToString(backup.bytes)
                    ) : (
                        <span className={styles.muted}>&mdash;</span>
                    ),
            },
            {
                key: 'created',
                header: 'Created',
                align: 'right',
                render: (backup) => (
                    <span title={format(backup.createdAt, 'ddd, MMMM do, yyyy HH:mm:ss')}>
                        {formatDistanceToNow(backup.createdAt, { includeSeconds: true, addSuffix: true })}
                    </span>
                ),
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '56px',
                render: (backup) =>
                    backup.completedAt ? (
                        <Can action={['backup.download', 'backup.restore', 'backup.delete']} matchAny>
                            <BackupContextMenu backup={backup} />
                        </Can>
                    ) : (
                        <Spinner size={'small'} />
                    ),
            },
        ],
        []
    );

    if (!backups || (error && isValidating)) {
        return <Spinner size={'large'} centered />;
    }

    const canCreate = backupLimit > 0 && backupLimit > backups.backupCount;

    return (
        <ServerContentBlock
            title={'Backups'}
            eyebrow={'Server'}
            heading={'Backups'}
            subtitle={
                backupLimit === 0
                    ? 'Backups cannot be created for this server because the backup limit is set to 0.'
                    : `${backups.backupCount} of ${backupLimit} backups have been created for this server.`
            }
            showFlashKey={'backups'}
            actions={
                canCreate ? (
                    <Can action={'backup.create'}>
                        <CreateBackupButton />
                    </Can>
                ) : undefined
            }
        >
            {backups.items.map((backup) => (
                <BackupCompletionListener key={backup.uuid} backup={backup} />
            ))}
            <Pagination data={backups} onPageSelect={setPage}>
                {({ items }) => (
                    <Card flush>
                        <DataTable
                            columns={columns}
                            rows={items}
                            keyOf={(backup) => backup.uuid}
                            empty={
                                page > 1
                                    ? "Looks like we've run out of backups to show you, try going back a page."
                                    : 'It looks like there are no backups currently stored for this server.'
                            }
                            mobile={{
                                title: (backup) => backup.name,
                                subtitle: (backup) =>
                                    formatDistanceToNow(backup.createdAt, { includeSeconds: true, addSuffix: true }),
                                status: (backup) => {
                                    const state = stateOf(backup);

                                    return <StatusChip tone={backupTone(state)}>{labels[state]}</StatusChip>;
                                },
                                kpis: (backup) =>
                                    backup.completedAt !== null && backup.isSuccessful
                                        ? [{ label: 'Size', value: bytesToString(backup.bytes) }]
                                        : [],
                            }}
                        />
                    </Card>
                )}
            </Pagination>
        </ServerContentBlock>
    );
};

export default () => {
    const [page, setPage] = useState<number>(1);

    return (
        <ServerBackupContext.Provider value={{ page, setPage }}>
            <BackupContainer />
        </ServerBackupContext.Provider>
    );
};
