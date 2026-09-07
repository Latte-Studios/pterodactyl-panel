import React, { useEffect, useMemo, useState } from 'react';
import Spinner from '@/components/elements/Spinner';
import { useFlashKey } from '@/plugins/useFlash';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import createServerAllocation from '@/api/server/network/createServerAllocation';
import Can from '@/components/elements/Can';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import getServerAllocations from '@/api/swr/getServerAllocations';
import isEqual from 'react-fast-compare';
import { useDeepCompareEffect } from '@/plugins/useDeepCompareEffect';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import CopyChip from '@/components/elements/latte/CopyChip';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import StatusChip from '@/components/elements/latte/StatusChip';
import { Allocation } from '@/api/server/getServer';
import { ip } from '@/lib/formatters';
import { AllocationActions, AllocationNotes } from '@/components/server/network/AllocationCells';

const host = (allocation: Allocation): string => allocation.alias || ip(allocation.ip);

const NetworkContainer = () => {
    const [loading, setLoading] = useState(false);
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const allocationLimit = ServerContext.useStoreState((state) => state.server.data!.featureLimits.allocations);
    const allocations = ServerContext.useStoreState((state) => state.server.data!.allocations, isEqual);
    const setServerFromState = ServerContext.useStoreActions((actions) => actions.server.setServerFromState);

    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');
    const { data, error, mutate } = getServerAllocations();

    useEffect(() => {
        mutate(allocations);
    }, []);

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    useDeepCompareEffect(() => {
        if (!data) return;

        setServerFromState((state) => ({ ...state, allocations: data }));
    }, [data]);

    const onCreateAllocation = () => {
        clearFlashes();

        setLoading(true);
        createServerAllocation(uuid)
            .then((allocation) => {
                setServerFromState((s) => ({ ...s, allocations: s.allocations.concat(allocation) }));
                return mutate(data?.concat(allocation), false);
            })
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setLoading(false));
    };

    const columns: DataTableColumn<Allocation>[] = useMemo(
        () => [
            {
                key: 'address',
                header: 'Address',
                render: (allocation) => <CopyChip value={`${host(allocation)}:${allocation.port}`} />,
            },
            {
                key: 'host',
                header: 'Hostname',
                render: (allocation) => host(allocation),
            },
            {
                key: 'port',
                header: 'Port',
                align: 'right',
                width: '96px',
                render: (allocation) => allocation.port,
            },
            {
                key: 'notes',
                header: 'Notes',
                render: (allocation) => <AllocationNotes allocation={allocation} />,
            },
            {
                key: 'actions',
                header: '',
                align: 'right',
                width: '220px',
                render: (allocation) => <AllocationActions allocation={allocation} />,
            },
        ],
        []
    );

    const canCreate = allocationLimit > 0 && data !== undefined && allocationLimit > data.length;

    return (
        <ServerContentBlock
            showFlashKey={'server:network'}
            title={'Network'}
            eyebrow={'Server'}
            heading={'Network'}
            subtitle={
                allocationLimit > 0
                    ? `You are currently using ${
                          data?.length ?? 0
                      } of ${allocationLimit} allowed allocations for this server.`
                    : 'Allocations cannot be created for this server.'
            }
            actions={
                canCreate ? (
                    <Can action={'allocation.create'}>
                        <Button variant={'contained'} onClick={onCreateAllocation} disabled={loading}>
                            Create Allocation
                        </Button>
                    </Can>
                ) : undefined
            }
        >
            <SpinnerOverlay visible={loading} />
            {!data ? (
                <Spinner size={'large'} centered />
            ) : (
                <Card flush>
                    <DataTable
                        columns={columns}
                        rows={data}
                        keyOf={(allocation) => String(allocation.id)}
                        empty={'There are no allocations assigned to this server.'}
                        mobile={{
                            title: (allocation) => `${host(allocation)}:${allocation.port}`,
                            subtitle: (allocation) => allocation.notes,
                            status: (allocation) =>
                                allocation.isDefault ? <StatusChip tone={'ok'}>Primary</StatusChip> : null,
                        }}
                    />
                </Card>
            )}
        </ServerContentBlock>
    );
};

export default NetworkContainer;
