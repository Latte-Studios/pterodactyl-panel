import { useEffect, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { SocketEvent } from '@/components/server/events';
import { HostStats, rawDataToHostStats } from '@/api/server/hostStats';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';

/**
 * The number of milliseconds a sample stays on screen without a newer one
 * arriving. The daemon samples every two seconds, so a gap this long means the
 * connection went away rather than the host going quiet.
 */
const STALE_AFTER = 10_000;

/**
 * Returns the most recent utilization sample of the machine this server runs on,
 * or null when the current user is not an administrator. The daemon only emits
 * these events for a token carrying the admin.websocket.host permission, but the
 * subscription is skipped outright for everybody else so no listener is held for
 * an event that can never arrive.
 */
const useHostStats = (): HostStats | null => {
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [stats, setStats] = useState<HostStats | null>(null);
    const [receivedAt, setReceivedAt] = useState<number | null>(null);

    useWebsocketEvent(
        SocketEvent.HOST_STATS,
        (data) => {
            const parsed = rawDataToHostStats(data);
            if (parsed === null) {
                return;
            }

            setStats(parsed);
            setReceivedAt(Date.now());
        },
        rootAdmin
    );

    useEffect(() => {
        if (receivedAt === null) {
            return;
        }

        const timeout = setTimeout(() => {
            setStats(null);
            setReceivedAt(null);
        }, STALE_AFTER);

        return () => clearTimeout(timeout);
    }, [receivedAt]);

    return stats;
};

export default useHostStats;
