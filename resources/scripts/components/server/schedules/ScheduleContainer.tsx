import React, { useEffect, useMemo, useState } from 'react';
import getServerSchedules, { Schedule } from '@/api/server/schedules/getServerSchedules';
import { ServerContext } from '@/state/server';
import Spinner from '@/components/elements/Spinner';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { format } from 'date-fns';
import { httpErrorToHuman } from '@/api/http';
import EditScheduleModal from '@/components/server/schedules/EditScheduleModal';
import Can from '@/components/elements/Can';
import useFlash from '@/plugins/useFlash';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import DataTable, { DataTableColumn } from '@/components/elements/latte/DataTable';
import StatusChip from '@/components/elements/latte/StatusChip';
import { scheduleTone } from '@/components/elements/latte/status';
import styles from './schedules.module.css';

type State = 'active' | 'processing' | 'inactive';

const stateOf = (schedule: Schedule): State =>
    schedule.isProcessing ? 'processing' : schedule.isActive ? 'active' : 'inactive';

const labels: Record<State, string> = {
    active: 'Active',
    processing: 'Processing',
    inactive: 'Inactive',
};

const expression = (cron: Schedule['cron']): string =>
    `${cron.minute} ${cron.hour} ${cron.dayOfMonth} ${cron.month} ${cron.dayOfWeek}`;

const lastRun = (schedule: Schedule): string =>
    schedule.lastRunAt ? format(schedule.lastRunAt, "MMM do 'at' h:mma") : 'never';

export default () => {
    const match = useRouteMatch();
    const history = useHistory();

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const { clearFlashes, addError } = useFlash();
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    const schedules = ServerContext.useStoreState(state => state.schedules.data);
    const setSchedules = ServerContext.useStoreActions(actions => actions.schedules.setSchedules);

    useEffect(() => {
        clearFlashes('schedules');
        getServerSchedules(uuid)
            .then(schedules => setSchedules(schedules))
            .catch(error => {
                addError({ message: httpErrorToHuman(error), key: 'schedules' });
                console.error(error);
            })
            .then(() => setLoading(false));
    }, []);

    const columns: DataTableColumn<Schedule>[] = useMemo(
        () => [
            {
                key: 'name',
                header: 'Schedule',
                render: schedule => (
                    <div>
                        <p className={styles.name}>{schedule.name}</p>
                        <p className={styles.lastRun}>Last run at: {lastRun(schedule)}</p>
                    </div>
                ),
            },
            {
                key: 'cron',
                header: 'Expression',
                render: schedule => <span className={styles.cron}>{expression(schedule.cron)}</span>,
            },
            {
                key: 'status',
                header: 'Status',
                align: 'right',
                width: '140px',
                render: schedule => {
                    const state = stateOf(schedule);

                    return <StatusChip tone={scheduleTone(state)}>{labels[state]}</StatusChip>;
                },
            },
        ],
        [],
    );

    return (
        <ServerContentBlock
            title={'Schedules'}
            eyebrow={'Server'}
            heading={'Schedules'}
            subtitle={'Tasks this server runs on a cron expression.'}
            showFlashKey={'schedules'}
            actions={
                <Can action={'schedule.create'}>
                    <Button variant={'contained'} onClick={() => setVisible(true)}>
                        Create schedule
                    </Button>
                </Can>
            }
        >
            <Can action={'schedule.create'}>
                <EditScheduleModal visible={visible} onModalDismissed={() => setVisible(false)} />
            </Can>
            {!schedules.length && loading ? (
                <Spinner size={'large'} centered />
            ) : (
                <Card flush>
                    <DataTable
                        columns={columns}
                        rows={schedules}
                        keyOf={schedule => String(schedule.id)}
                        onRowClick={schedule => history.push(`${match.url}/${schedule.id}`)}
                        empty={'There are no schedules configured for this server.'}
                        mobile={{
                            title: schedule => schedule.name,
                            subtitle: schedule => expression(schedule.cron),
                            status: schedule => {
                                const state = stateOf(schedule);

                                return <StatusChip tone={scheduleTone(state)}>{labels[state]}</StatusChip>;
                            },
                            kpis: schedule => [{ label: 'Last run', value: lastRun(schedule) }],
                        }}
                    />
                </Card>
            )}
        </ServerContentBlock>
    );
};
