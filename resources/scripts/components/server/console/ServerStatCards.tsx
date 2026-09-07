import React, { useEffect, useMemo, useState } from 'react';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import { ServerContext } from '@/state/server';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import UptimeDuration from '@/components/server/UptimeDuration';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import CopyChip from '@/components/elements/latte/CopyChip';
import StatCard from '@/components/elements/latte/StatCard';
import { StatusTone } from '@/components/elements/latte/status';
import { GlobeAltIcon } from '@heroicons/react/outline';
import styles from './console.module.css';

type Stats = Record<'memory' | 'cpu' | 'disk' | 'uptime' | 'rx' | 'tx', number>;

/**
 * A reading is only ever tinted when it is close to its ceiling; below that the
 * card stays in the default ink so the row does not read as an alarm panel.
 */
const toneFor = (value: number, max: number | null): StatusTone | undefined => {
    if (!max) {
        return undefined;
    }

    const delta = value / max;

    return delta > 0.9 ? 'bad' : delta > 0.8 ? 'waiting' : undefined;
};

const percentFor = (value: number, max: number | null): number | undefined => (max ? (value / max) * 100 : undefined);

/**
 * The row of six readings above the terminal. The address takes two of the
 * seven columns because it carries a copyable chip rather than a number.
 */
const ServerStatCards = () => {
    const [stats, setStats] = useState<Stats>({ memory: 0, cpu: 0, disk: 0, uptime: 0, tx: 0, rx: 0 });

    const status = ServerContext.useStoreState((state) => state.status.value as string | null);
    const connected = ServerContext.useStoreState((state) => state.socket.connected);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const limits = ServerContext.useStoreState((state) => state.server.data!.limits);

    const ceilings = useMemo(
        () => ({
            cpu: limits?.cpu || null,
            memory: limits?.memory ? mbToBytes(limits.memory) : null,
            disk: limits?.disk ? mbToBytes(limits.disk) : null,
        }),
        [limits]
    );

    const allocation = ServerContext.useStoreState((state) => {
        const match = state.server.data!.allocations.find((allocation) => allocation.isDefault);

        return !match ? null : `${match.alias || ip(match.ip)}:${match.port}`;
    });

    useEffect(() => {
        if (!connected || !instance) {
            return;
        }

        instance.send(SocketRequest.SEND_STATS);
    }, [instance, connected]);

    useWebsocketEvent(SocketEvent.STATS, (data) => {
        // The daemon sends the payload as a JSON string; there is no shape to
        // check against here beyond the fields read below.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any;

        try {
            parsed = JSON.parse(data);
        } catch (e) {
            return;
        }

        setStats({
            memory: parsed.memory_bytes,
            cpu: parsed.cpu_absolute,
            disk: parsed.disk_bytes,
            tx: parsed.network.tx_bytes,
            rx: parsed.network.rx_bytes,
            uptime: parsed.uptime || 0,
        });
    });

    const offline = status === 'offline' || status === null;

    return (
        <div className={styles.stats}>
            <StatCard
                compact
                className={styles.address}
                label={'Address'}
                value={
                    allocation ? (
                        <CopyChip value={allocation} icon={GlobeAltIcon} />
                    ) : (
                        <span className={styles.muted}>None</span>
                    )
                }
            />
            <StatCard
                compact
                label={'Uptime'}
                value={
                    offline ? (
                        <span className={styles.muted}>Offline</span>
                    ) : stats.uptime > 0 ? (
                        <UptimeDuration uptime={stats.uptime / 1000} />
                    ) : (
                        status ?? 'Offline'
                    )
                }
            />
            <StatCard
                compact
                label={'CPU'}
                value={offline ? <span className={styles.muted}>Offline</span> : stats.cpu.toFixed(2)}
                unit={offline ? undefined : '%'}
                hint={ceilings.cpu ? `of ${ceilings.cpu}%` : 'Unlimited'}
                percent={offline ? undefined : percentFor(stats.cpu, ceilings.cpu)}
                tone={toneFor(stats.cpu, ceilings.cpu)}
            />
            <StatCard
                compact
                label={'Memory'}
                value={offline ? <span className={styles.muted}>Offline</span> : bytesToString(stats.memory)}
                hint={ceilings.memory ? `of ${bytesToString(ceilings.memory)}` : 'Unlimited'}
                percent={offline ? undefined : percentFor(stats.memory, ceilings.memory)}
                tone={toneFor(stats.memory, ceilings.memory)}
            />
            <StatCard
                compact
                label={'Disk'}
                value={bytesToString(stats.disk)}
                hint={ceilings.disk ? `of ${bytesToString(ceilings.disk)}` : 'Unlimited'}
                percent={percentFor(stats.disk, ceilings.disk)}
                tone={toneFor(stats.disk, ceilings.disk)}
            />
            <StatCard
                compact
                label={'Network'}
                value={offline ? <span className={styles.muted}>Offline</span> : bytesToString(stats.rx)}
                hint={offline ? undefined : `${bytesToString(stats.tx)} sent`}
            />
        </div>
    );
};

export default ServerStatCards;
