import React, { useEffect, useState } from 'react';
import { ActivityLogFilters, useActivityLogs } from '@/api/account/activity';
import { useFlashKey } from '@/plugins/useFlash';
import PageContentBlock from '@/components/elements/PageContentBlock';
import PaginationFooter from '@/components/elements/table/PaginationFooter';
import { DesktopComputerIcon } from '@heroicons/react/solid';
import Spinner from '@/components/elements/Spinner';
import Button from '@/components/elements/latte/Button';
import Card from '@/components/elements/latte/Card';
import Toolbar from '@/components/elements/latte/Toolbar';
import ActivityLogEntry from '@/components/elements/activity/ActivityLogEntry';
import Tooltip from '@/components/elements/tooltip/Tooltip';
import useLocationHash from '@/plugins/useLocationHash';

export default () => {
    const { hash } = useLocationHash();
    const { clearAndAddHttpError } = useFlashKey('account');
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
        <PageContentBlock
            title={'Account Activity Log'}
            eyebrow={'Account'}
            heading={'Activity'}
            showFlashKey={'account'}
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
            ) : (
                <Card flush>
                    {data?.items.map((activity) => (
                        <ActivityLogEntry key={activity.id} activity={activity}>
                            {typeof activity.properties.useragent === 'string' && (
                                <Tooltip content={activity.properties.useragent} placement={'top'}>
                                    <span>
                                        <DesktopComputerIcon />
                                    </span>
                                </Tooltip>
                            )}
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
        </PageContentBlock>
    );
};
