import React from 'react';
import { ExclamationIcon } from '@heroicons/react/outline';
import Alert from '@/components/elements/latte/Alert';
import { HostPressureResource, HostStats } from '@/api/server/hostStats';

const RESOURCE_LABELS: Record<HostPressureResource, string> = {
    cpu: 'CPU',
    memory: 'memory',
    disk: 'disk',
};

/**
 * Returns the utilization that a resource level was resolved from, so the alert
 * can say how bad it actually is rather than only that something is wrong.
 */
const percentFor = (stats: HostStats, resource: HostPressureResource): number => {
    switch (resource) {
        case 'cpu':
            return Math.max(stats.cpu.percent, stats.cpu.loadPercent);
        case 'memory':
            return stats.memory.percent;
        case 'disk':
            return stats.disks.reduce((worst, disk) => Math.max(worst, disk.percent), 0);
    }
};

const HostPressureAlert = ({ stats }: { stats: HostStats | null }) => {
    if (stats === null || stats.pressure.level === 'ok') {
        return null;
    }

    const strained = (Object.keys(stats.pressure.resources) as HostPressureResource[])
        .filter((resource) => stats.pressure.resources[resource] !== 'ok')
        .map((resource) => `${RESOURCE_LABELS[resource]} at ${percentFor(stats, resource).toFixed(1)}%`);

    return (
        <Alert tone={stats.pressure.level === 'critical' ? 'bad' : 'waiting'} icon={ExclamationIcon}>
            The machine this server runs on is under pressure ({strained.join(', ')}). The readings above only measure
            this server, so they can look healthy while the host itself is saturated.
        </Alert>
    );
};

export default HostPressureAlert;
