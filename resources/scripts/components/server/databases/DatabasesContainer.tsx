import React, { useEffect, useMemo, useState } from 'react';
import getServerDatabases from '@/api/server/databases/getServerDatabases';
import { ServerContext } from '@/state/server';
import { httpErrorToHuman } from '@/api/http';
import Spinner from '@/components/elements/Spinner';
import CreateDatabaseButton from '@/components/server/databases/CreateDatabaseButton';
import DatabaseActions from '@/components/server/databases/DatabaseActions';
import Can from '@/components/elements/Can';
import useFlash from '@/plugins/useFlash';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { useDeepMemoize } from '@/plugins/useDeepMemoize';
import Card from '@/components/elements/latte/Card';
import CopyChip from '@/components/elements/latte/CopyChip';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import { ServerDatabase } from '@/api/server/databases/getServerDatabases';
import styles from './databases.module.css';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const databaseLimit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.databases);

    const { addError, clearFlashes } = useFlash();
    const [loading, setLoading] = useState(true);

    const databases = useDeepMemoize(ServerContext.useStoreState((state) => state.databases.data));
    const setDatabases = ServerContext.useStoreActions((state) => state.databases.setDatabases);

    useEffect(() => {
        setLoading(!databases.length);
        clearFlashes('databases');

        getServerDatabases(uuid)
            .then((databases) => setDatabases(databases))
            .catch((error) => {
                console.error(error);
                addError({ key: 'databases', message: httpErrorToHuman(error) });
            })
            .then(() => setLoading(false));
    }, []);

    const columns: DataTableColumn<ServerDatabase>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Database',
                render: (database) => <span className={styles.name}>{database.name}</span>,
            },
            {
                key: 'endpoint',
                header: 'Endpoint',
                render: (database) => <CopyChip value={database.connectionString} />,
            },
            {
                key: 'from',
                header: 'Connections from',
                render: (database) => database.allowConnectionsFrom,
            },
            {
                key: 'username',
                header: 'Username',
                render: (database) => <CopyChip value={database.username} />,
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '96px',
                render: (database) => <DatabaseActions database={database} />,
            },
        ],
        []
    );

    const canCreate = databaseLimit > 0 && databaseLimit !== databases.length;

    return (
        <ServerContentBlock
            title={'Databases'}
            eyebrow={'Server'}
            heading={'Databases'}
            subtitle={
                databaseLimit > 0
                    ? `${databases.length} of ${databaseLimit} databases have been allocated to this server.`
                    : 'Databases cannot be created for this server.'
            }
            showFlashKey={'databases'}
            actions={
                canCreate ? (
                    <Can action={'database.create'}>
                        <CreateDatabaseButton />
                    </Can>
                ) : undefined
            }
        >
            {!databases.length && loading ? (
                <Spinner size={'large'} centered />
            ) : (
                <Card flush>
                    <DataTable
                        columns={columns}
                        rows={databases}
                        keyOf={(database) => database.id}
                        empty={
                            databaseLimit > 0
                                ? 'It looks like you have no databases.'
                                : 'Databases cannot be created for this server.'
                        }
                        mobile={{
                            title: (database) => database.name,
                            subtitle: (database) => database.connectionString,
                            kpis: (database) => [{ label: 'Username', value: database.username }],
                        }}
                    />
                </Card>
            )}
        </ServerContentBlock>
    );
};
