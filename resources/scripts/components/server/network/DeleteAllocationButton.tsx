import React, { useState } from 'react';
import { ExclamationIcon, TrashIcon } from '@heroicons/react/outline';
import { ServerContext } from '@/state/server';
import deleteServerAllocation from '@/api/server/network/deleteServerAllocation';
import getServerAllocations from '@/api/swr/getServerAllocations';
import { useFlashKey } from '@/plugins/useFlash';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';

interface Props {
    allocation: number;
}

const DeleteAllocationButton = ({ allocation }: Props) => {
    const [confirm, setConfirm] = useState(false);

    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const setServerFromState = ServerContext.useStoreActions((actions) => actions.server.setServerFromState);

    const { mutate } = getServerAllocations();
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('server:network');

    const deleteAllocation = () => {
        clearFlashes();
        setConfirm(false);

        mutate((data) => data?.filter((a) => a.id !== allocation), false);
        setServerFromState((s) => ({ ...s, allocations: s.allocations.filter((a) => a.id !== allocation) }));

        deleteServerAllocation(uuid, allocation).catch((error) => {
            clearAndAddHttpError(error);
            mutate();
        });
    };

    return (
        <>
            <Dialog
                open={confirm}
                onClose={() => setConfirm(false)}
                title={'Remove Allocation'}
                description={'This allocation will be immediately removed from your server.'}
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={deleteAllocation}>
                            Delete
                        </Button>
                    </>
                }
            />
            <Button
                size={'small'}
                variant={'danger'}
                iconOnly
                aria-label={'Remove allocation'}
                onClick={() => setConfirm(true)}
            >
                <TrashIcon width={16} height={16} />
            </Button>
        </>
    );
};

export default DeleteAllocationButton;
