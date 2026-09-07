import React, { useState } from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import deleteSchedule from '@/api/server/schedules/deleteSchedule';
import { ServerContext } from '@/state/server';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { httpErrorToHuman } from '@/api/http';
import Button from '@/components/elements/latte/Button';
import Dialog from '@/components/elements/latte/Dialog';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';

interface Props {
    scheduleId: number;
    onDeleted: () => void;
}

export default ({ scheduleId, onDeleted }: Props) => {
    const [visible, setVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const { addError, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const onDelete = () => {
        setIsLoading(true);
        clearFlashes('schedules');
        deleteSchedule(uuid, scheduleId)
            .then(() => {
                setIsLoading(false);
                onDeleted();
            })
            .catch(error => {
                console.error(error);

                addError({ key: 'schedules', message: httpErrorToHuman(error) });
                setIsLoading(false);
                setVisible(false);
            });
    };

    return (
        <>
            <SpinnerOverlay visible={isLoading} />
            <Dialog
                open={visible}
                onClose={() => setVisible(false)}
                title={'Delete Schedule'}
                description={'All tasks will be removed and any running processes will be terminated.'}
                icon={ExclamationIcon}
                danger
                footer={
                    <>
                        <Button variant={'text'} onClick={() => setVisible(false)}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} onClick={onDelete}>
                            Delete
                        </Button>
                    </>
                }
            />
            <Button variant={'danger'} onClick={() => setVisible(true)}>
                Delete
            </Button>
        </>
    );
};
