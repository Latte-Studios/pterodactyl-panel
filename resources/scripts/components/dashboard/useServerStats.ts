import { useEffect, useRef, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerStats } from '@/api/server/getServerResourceUsage';

export type ServerStatsMap = Record<string, ServerStats>;

const INTERVAL = 30000;

/**
 * Polls the resource usage of every server on the current page from one place.
 * The old row component polled per row, which is the same number of requests
 * but leaves the table cells unable to be plain functions.
 *
 * Suspended servers and servers on a node under maintenance are skipped: there
 * is nothing to report and the request would fail anyway.
 */
export const useServerStats = (servers: Server[]): ServerStatsMap => {
    const [stats, setStats] = useState<ServerStatsMap>({});
    const timer = useRef<ReturnType<typeof setInterval>>();

    const uuids = servers
        .filter((server) => server.status !== 'suspended' && !server.isNodeUnderMaintenance)
        .map((server) => server.uuid)
        .join(',');

    useEffect(() => {
        if (uuids.length === 0) {
            return;
        }

        let cancelled = false;

        const poll = () =>
            Promise.all(
                uuids.split(',').map((uuid) =>
                    getServerResourceUsage(uuid)
                        .then((data) => [uuid, data] as const)
                        .catch((error) => {
                            console.error(error);

                            return null;
                        })
                )
            ).then((results) => {
                if (cancelled) {
                    return;
                }

                setStats(Object.fromEntries(results.filter((entry): entry is [string, ServerStats] => entry !== null)));
            });

        poll();
        timer.current = setInterval(poll, INTERVAL);

        return () => {
            cancelled = true;
            clearInterval(timer.current);
        };
    }, [uuids]);

    return stats;
};
