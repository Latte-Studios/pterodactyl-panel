import React from 'react';
import classNames from 'classnames';
import { bytesToString } from '@/lib/formatters';
import { ServerContext } from '@/state/server';
import Card from '@/components/elements/latte/Card';
import { getLevelTone } from '@/components/server/console/utilization';
import { HostStats } from '@/api/server/hostStats';
import { StatusTone } from '@/components/elements/latte/status';
import styles from './console.module.css';

/**
 * Returns the filesystem the server volumes live on, which is the only one an
 * administrator looking at a single server cares about. It is the first entry
 * the daemon reports, since that listing always starts at the data directory.
 */
const volumeDisk = (stats: HostStats) => stats.disks[0] ?? null;

interface MeterProps {
    label: string;
    value: React.ReactNode;
    limit?: React.ReactNode;
    percent: number;
    tone?: StatusTone;
}

const Meter = ({ label, value, limit, percent, tone }: MeterProps) => {
    const width = Math.round(Math.min(100, Math.max(0, percent)));

    return (
        <div className={styles.hostMeter}>
            <span className={styles.hostLabel}>{label}</span>
            <span className={styles.hostValue}>{value}</span>
            {limit && <span className={styles.hostLimit}>{limit}</span>}
            <div
                className={styles.hostTrack}
                role={'progressbar'}
                aria-valuenow={width}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={classNames(styles.hostBar, {
                        [styles.hostBarWaiting]: tone === 'waiting',
                        [styles.hostBarBad]: tone === 'bad',
                    })}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
};

const HostStatsBlock = ({ stats, className }: { stats: HostStats | null; className?: string }) => {
    const node = ServerContext.useStoreState((state) => state.server.data!.node);

    if (stats === null) {
        return null;
    }

    const disk = volumeDisk(stats);
    const cpu = Math.max(stats.cpu.percent, stats.cpu.loadPercent);
    const swap = stats.swap;

    return (
        <Card title={'Host'} subtitle={`Node: ${node}`} className={className}>
            <div className={styles.host}>
                <Meter
                    label={'CPU'}
                    value={`${cpu.toFixed(1)}%`}
                    limit={`${stats.cpu.threads} threads`}
                    percent={cpu}
                    tone={getLevelTone(stats.pressure.resources.cpu)}
                />
                <Meter
                    label={'Memory'}
                    value={bytesToString(stats.memory.usedBytes)}
                    limit={`of ${bytesToString(stats.memory.totalBytes)}`}
                    percent={stats.memory.percent}
                    tone={getLevelTone(stats.pressure.resources.memory)}
                />
                <Meter
                    label={'Disk'}
                    value={disk === null ? 'Unknown' : bytesToString(disk.usedBytes)}
                    limit={disk === null ? undefined : `of ${bytesToString(disk.totalBytes)}`}
                    percent={disk?.percent ?? 0}
                    tone={getLevelTone(stats.pressure.resources.disk)}
                />
                <Meter
                    label={'Swap'}
                    value={swap.totalBytes === 0 ? 'Off' : bytesToString(swap.usedBytes)}
                    limit={swap.totalBytes === 0 ? undefined : `of ${bytesToString(swap.totalBytes)}`}
                    percent={swap.percent}
                />
            </div>
        </Card>
    );
};

export default HostStatsBlock;
