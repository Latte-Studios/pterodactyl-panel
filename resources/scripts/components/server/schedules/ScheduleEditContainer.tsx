import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import getServerSchedule from '@/api/server/schedules/getServerSchedule';
import Spinner from '@/components/elements/Spinner';
import EditScheduleModal from '@/components/server/schedules/EditScheduleModal';
import NewTaskButton from '@/components/server/schedules/NewTaskButton';
import DeleteScheduleButton from '@/components/server/schedules/DeleteScheduleButton';
import Can from '@/components/elements/Can';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import PageContentBlock from '@/components/elements/PageContentBlock';
import ScheduleTaskRow from '@/components/server/schedules/ScheduleTaskRow';
import isEqual from 'react-fast-compare';
import { format } from 'date-fns';
import RunScheduleButton from '@/components/server/schedules/RunScheduleButton';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import StatCard from '@/components/elements/latte/StatCard';
import StatusChip from '@/components/elements/latte/StatusChip';
import { scheduleTone } from '@/components/elements/latte/status';
import styles from './scheduleEdit.module.css';

interface Params {
    id: string;
}

const when = (value: Date | null): string => (value ? format(value, "MMM do 'at' h:mma") : 'n/a');

export default () => {
    const history = useHistory();
    const { id: scheduleId } = useParams<Params>();

    const id = ServerContext.useStoreState(state => state.server.data!.id);
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const [isLoading, setIsLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);

    const schedule = ServerContext.useStoreState(
        st => st.schedules.data.find(s => s.id === Number(scheduleId)),
        isEqual,
    );
    const appendSchedule = ServerContext.useStoreActions(actions => actions.schedules.appendSchedule);

    useEffect(() => {
        if (schedule?.id === Number(scheduleId)) {
            setIsLoading(false);
            return;
        }

        clearFlashes('schedules');
        getServerSchedule(uuid, Number(scheduleId))
            .then(schedule => appendSchedule(schedule))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ error, key: 'schedules' });
            })
            .then(() => setIsLoading(false));
    }, [scheduleId]);

    const toggleEditModal = useCallback(() => {
        setShowEditModal(s => !s);
    }, []);

    if (!schedule || isLoading) {
        return (
            <PageContentBlock title={'Schedules'} showFlashKey={'schedules'}>
                <Spinner size={'large'} centered />
            </PageContentBlock>
        );
    }

    const state = schedule.isProcessing ? 'processing' : schedule.isActive ? 'active' : 'inactive';
    const tasks = [...schedule.tasks].sort((a, b) =>
        a.sequenceId === b.sequenceId ? 0 : a.sequenceId > b.sequenceId ? 1 : -1,
    );

    return (
        <PageContentBlock
            title={'Schedules'}
            eyebrow={'Schedule'}
            heading={schedule.name}
            subtitle={`Last run at: ${when(schedule.lastRunAt)} · Next run at: ${when(schedule.nextRunAt)}`}
            showFlashKey={'schedules'}
            actions={
                <Can action={'schedule.update'}>
                    <Button variant={'outline'} onClick={toggleEditModal}>
                        Edit
                    </Button>
                    <NewTaskButton schedule={schedule} />
                </Can>
            }
        >
            <div className={styles.status}>
                <StatusChip tone={scheduleTone(state)}>
                    {state === 'processing' ? 'Processing' : state === 'active' ? 'Active' : 'Inactive'}
                </StatusChip>
            </div>
            <div className={styles.cron}>
                <StatCard compact label={'Minute'} value={schedule.cron.minute} />
                <StatCard compact label={'Hour'} value={schedule.cron.hour} />
                <StatCard compact label={'Day (Month)'} value={schedule.cron.dayOfMonth} />
                <StatCard compact label={'Month'} value={schedule.cron.month} />
                <StatCard compact label={'Day (Week)'} value={schedule.cron.dayOfWeek} />
            </div>
            <Card title={'Tasks'} subtitle={'Numbered in the order they actually run.'} flush>
                {tasks.length === 0 ? (
                    <p className={styles.empty}>This schedule has no tasks yet.</p>
                ) : (
                    tasks.map((task, index) => (
                        <ScheduleTaskRow
                            key={`${schedule.id}_${task.id}`}
                            task={task}
                            schedule={schedule}
                            index={index + 1}
                        />
                    ))
                )}
            </Card>
            <EditScheduleModal visible={showEditModal} schedule={schedule} onModalDismissed={toggleEditModal} />
            <div className={styles.footer}>
                <Can action={'schedule.delete'}>
                    <DeleteScheduleButton
                        scheduleId={schedule.id}
                        onDeleted={() => history.push(`/server/${id}/schedules`)}
                    />
                </Can>
                {tasks.length > 0 && (
                    <Can action={'schedule.update'}>
                        <RunScheduleButton schedule={schedule} />
                    </Can>
                )}
            </div>
        </PageContentBlock>
    );
};
