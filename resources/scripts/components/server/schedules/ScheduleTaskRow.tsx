import React, { useState } from 'react';
import { Schedule, Task } from '@/api/server/schedules/getServerSchedules';
import {
    ArchiveIcon,
    ClockIcon,
    CodeIcon,
    PencilIcon,
    SwitchHorizontalIcon,
    TrashIcon,
} from '@heroicons/react/outline';
import deleteScheduleTask from '@/api/server/schedules/deleteScheduleTask';
import { httpErrorToHuman } from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import TaskDetailsModal from '@/components/server/schedules/TaskDetailsModal';
import Can from '@/components/elements/Can';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import Button from '@/components/elements/latte/Button';
import StatusChip from '@/components/elements/latte/StatusChip';
import styles from './scheduleTask.module.css';

interface Props {
    schedule: Schedule;
    task: Task;
    /** Position in the real sequence, counted from one. */
    index: number;
}

type IconComponent = React.ComponentType<{ className?: string }>;

const getActionDetails = (action: string): [string, IconComponent] => {
    switch (action) {
        case 'command':
            return ['Send Command', CodeIcon];
        case 'power':
            return ['Send Power Action', SwitchHorizontalIcon];
        case 'backup':
            return ['Create Backup', ArchiveIcon];
        default:
            return ['Unknown Action', CodeIcon];
    }
};

export default ({ schedule, task, index }: Props) => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, addError } = useFlash();
    const [visible, setVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const appendSchedule = ServerContext.useStoreActions((actions) => actions.schedules.appendSchedule);

    const onConfirmDeletion = () => {
        setIsLoading(true);
        clearFlashes('schedules');
        deleteScheduleTask(uuid, schedule.id, task.id)
            .then(() =>
                appendSchedule({
                    ...schedule,
                    tasks: schedule.tasks.filter((t) => t.id !== task.id),
                })
            )
            .catch((error) => {
                console.error(error);
                setIsLoading(false);
                addError({ message: httpErrorToHuman(error), key: 'schedules' });
            });
    };

    const [title, Icon] = getActionDetails(task.action);

    return (
        <div className={styles.task}>
            <SpinnerOverlay visible={isLoading} fixed size={'large'} />
            <TaskDetailsModal
                schedule={schedule}
                task={task}
                visible={isEditing}
                onModalDismissed={() => setIsEditing(false)}
            />
            <ConfirmationModal
                title={'Confirm task deletion'}
                buttonText={'Delete Task'}
                onConfirmed={onConfirmDeletion}
                visible={visible}
                onModalDismissed={() => setVisible(false)}
            >
                Are you sure you want to delete this task? This action cannot be undone.
            </ConfirmationModal>
            <span className={styles.index} aria-hidden>
                {index}
            </span>
            <div className={styles.main}>
                <p className={styles.title}>
                    <Icon className={styles.icon} />
                    {title}
                </p>
                {task.payload && (
                    <div className={styles.payloadWrapper}>
                        {task.action === 'backup' && <p className={styles.payloadLabel}>Ignoring files & folders:</p>}
                        <div className={styles.payload}>{task.payload}</div>
                    </div>
                )}
                <div className={styles.chips}>
                    {task.continueOnFailure && <StatusChip tone={'waiting'}>Continues on failure</StatusChip>}
                    {index > 1 && task.timeOffset > 0 && (
                        <StatusChip tone={'closed'}>
                            <ClockIcon className={styles.chipIcon} />
                            {task.timeOffset}s later
                        </StatusChip>
                    )}
                </div>
            </div>
            <Can action={'schedule.update'}>
                <div className={styles.actions}>
                    <Button
                        size={'small'}
                        iconOnly
                        aria-label={'Edit scheduled task'}
                        onClick={() => setIsEditing(true)}
                    >
                        <PencilIcon width={16} height={16} />
                    </Button>
                    <Button
                        size={'small'}
                        variant={'danger'}
                        iconOnly
                        aria-label={'Delete scheduled task'}
                        onClick={() => setVisible(true)}
                    >
                        <TrashIcon width={16} height={16} />
                    </Button>
                </div>
            </Can>
        </div>
    );
};
