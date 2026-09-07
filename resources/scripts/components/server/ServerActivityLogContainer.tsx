import React, { useEffect, useState } from 'react';
import { useActivityLogs } from '@/api/server/activity';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { useFlashKey } from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import ActivityLogEntry from '@/components/elements/activity/ActivityLogEntry';
import PaginationFooter from '@/components/elements/table/PaginationFooter';
import { ActivityLogFilters } from '@/api/account/activity';
import { ClipboardListIcon } from '@heroicons/react/outline';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import Toolbar from '@/components/elements/latte/Toolbar';
import ScreenBlock from '@/components/elements/ScreenBlock';
import useLocationHash from '@/plugins/useLocationHash';

export default () => {
    const { hash } = useLocationHash();
    const { clearAndAddHttpError } = useFlashKey('server:activity');
    const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1, sorts: { timestamp: -1 } });

    const { data, isValidating, error } = useActivityLogs(filters, {
        revalidateOnMount: true,
        revalidateOnFocus: false,
    });

    useEffect(() => {
        setFilters((value) => ({ ...value, filters: { ip: hash.ip, event: hash.event } }));
    }, [hash]);

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [error]);

    return (
        <ServerContentBlock
            title={'Activity Log'}
            eyebrow={'Server'}
            heading={'Activity'}
            showFlashKey={'server:activity'}
        >
            {(filters.filters?.event || filters.filters?.ip) && (
                <Toolbar>
                    <Toolbar.Spacer />
                    <Button
                        size={'small'}
                        variant={'text'}
                        onClick={() => setFilters((value) => ({ ...value, filters: {} }))}
                    >
                        Clear filters
                    </Button>
                </Toolbar>
            )}
            {!data && isValidating ? (
                <Spinner centered />
            ) : !data?.items.length ? (
                <ScreenBlock
                    title={'No activity yet'}
                    message={'No activity logs available for this server.'}
                    waves
                    icon={ClipboardListIcon}
                />
            ) : (
                <Card flush>
                    {data?.items.map((activity) => (
                        <ActivityLogEntry key={activity.id} activity={activity}>
                            <span />
                        </ActivityLogEntry>
                    ))}
                </Card>
            )}
            {data && (
                <PaginationFooter
                    pagination={data.pagination}
                    onPageSelect={(page) => setFilters((value) => ({ ...value, page }))}
                />
            )}
        </ServerContentBlock>
    );
};
