import React, { useCallback, useState } from 'react';
import { debounce } from 'debounce';
import InputSpinner from '@/components/elements/InputSpinner';
import Can from '@/components/elements/Can';
import Button from '@/components/elements/latte/Button';
import StatusChip from '@/components/elements/latte/StatusChip';
import { Textarea } from '@/components/elements/latte/Input';
import { Allocation } from '@/api/server/getServer';
import setServerAllocationNotes from '@/api/server/network/setServerAllocationNotes';
import setPrimaryServerAllocation from '@/api/server/network/setPrimaryServerAllocation';
import getServerAllocations from '@/api/swr/getServerAllocations';
import DeleteAllocationButton from '@/components/server/network/DeleteAllocationButton';
import { useFlashKey } from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import styles from './network.module.css';

/** The note is saved as it is typed, so the cell carries its own state. */
export const AllocationNotes = ({ allocation }: { allocation: Allocation }) => {
    const [loading, setLoading] = useState(false);
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { mutate } = getServerAllocations();

    const onNotesChanged = useCallback((id: number, notes: string) => {
        mutate((data) => data?.map((a) => (a.id === id ? { ...a, notes } : a)), false);
    }, []);

    const save = debounce((notes: string) => {
        setLoading(true);
        clearFlashes();

        setServerAllocationNotes(uuid, allocation.id, notes)
            .then(() => onNotesChanged(allocation.id, notes))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setLoading(false));
    }, 750);

    return (
        <InputSpinner visible={loading}>
            <Textarea
                rows={2}
                className={styles.notes}
                placeholder={'Notes'}
                aria-label={`Notes for ${allocation.ip}:${allocation.port}`}
                defaultValue={allocation.notes || undefined}
                onChange={(e) => save(e.currentTarget.value)}
            />
        </InputSpinner>
    );
};

export const AllocationActions = ({ allocation }: { allocation: Allocation }) => {
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { mutate } = getServerAllocations();

    const setPrimary = () => {
        clearFlashes();
        mutate((data) => data?.map((a) => ({ ...a, isDefault: a.id === allocation.id })), false);

        setPrimaryServerAllocation(uuid, allocation.id).catch((error) => {
            clearAndAddHttpError(error);
            mutate();
        });
    };

    if (allocation.isDefault) {
        return <StatusChip tone={'ok'}>Primary</StatusChip>;
    }

    return (
        <div className={styles.actions}>
            <Can action={'allocation.update'}>
                <Button size={'small'} variant={'text'} onClick={setPrimary}>
                    Make Primary
                </Button>
            </Can>
            <Can action={'allocation.delete'}>
                <DeleteAllocationButton allocation={allocation.id} />
            </Can>
        </div>
    );
};
