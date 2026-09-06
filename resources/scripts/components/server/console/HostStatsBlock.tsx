import React from 'react';
import { faHdd, faMemory, faMicrochip } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import { bytesToString } from '@/lib/formatters';
import { ServerContext } from '@/state/server';
import StatBlock from '@/components/server/console/StatBlock';
import { getLevelColor } from '@/components/server/console/utilization';
import { HostStats } from '@/api/server/hostStats';

/**
 * Returns the filesystem the server volumes live on, which is the only one an
 * administrator looking at a single server cares about. It is the first entry
 * the daemon reports, since that listing always starts at the data directory.
 */
const volumeDisk = (stats: HostStats) => stats.disks[0] ?? null;

const HostStatsBlock = ({ stats, className }: { stats: HostStats | null; className?: string }) => {
    const node = ServerContext.useStoreState((state) => state.server.data!.node);

    if (stats === null) {
        return null;
    }

    const disk = volumeDisk(stats);
    const cpu = Math.max(stats.cpu.percent, stats.cpu.loadPercent);

    return (
        <div className={className}>
            <p className={'font-header font-medium text-sm text-gray-300 mb-2'}>Node: {node}</p>
            <div className={classNames('grid grid-cols-3 gap-2 md:gap-4')}>
                <StatBlock icon={faMicrochip} title={'Host CPU'} color={getLevelColor(stats.pressure.resources.cpu)}>
                    {cpu.toFixed(1)}%
                </StatBlock>
                <StatBlock icon={faMemory} title={'Host Memory'} color={getLevelColor(stats.pressure.resources.memory)}>
                    {bytesToString(stats.memory.usedBytes)}
                    <span className={'ml-1 text-gray-300 text-[70%] select-none'}>
                        / {bytesToString(stats.memory.totalBytes)}
                    </span>
                </StatBlock>
                <StatBlock icon={faHdd} title={'Host Disk'} color={getLevelColor(stats.pressure.resources.disk)}>
                    {disk === null ? (
                        <span className={'text-gray-400'}>Unknown</span>
                    ) : (
                        <>
                            {bytesToString(disk.usedBytes)}
                            <span className={'ml-1 text-gray-300 text-[70%] select-none'}>
                                / {bytesToString(disk.totalBytes)}
                            </span>
                        </>
                    )}
                </StatBlock>
            </div>
        </div>
    );
};

export default HostStatsBlock;
