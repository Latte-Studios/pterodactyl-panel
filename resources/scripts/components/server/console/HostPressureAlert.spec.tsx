/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import HostPressureAlert from '@/components/server/console/HostPressureAlert';
import { HostPressureLevel, HostStats } from '@/api/server/hostStats';

const stats = (level: HostPressureLevel, resources: Partial<HostStats['pressure']['resources']> = {}): HostStats => ({
    timestamp: '2026-09-06T21:00:00Z',
    cpu: { threads: 32, percent: 87.4, loadPercent: 90.2, load: { 1: 28.1, 5: 25, 15: 20.3 } },
    memory: { totalBytes: 1024, usedBytes: 960, percent: 93.75 },
    swap: { totalBytes: 0, usedBytes: 0, percent: 0 },
    disks: [{ labels: ['data'], path: '/var/lib/pterodactyl', totalBytes: 100, usedBytes: 60, percent: 60 }],
    servers: {
        total: 1,
        running: 1,
        unlimited: 0,
        memoryBytes: 0,
        cpuAbsolute: 0,
        memoryAllocatedBytes: 0,
        cpuAllocatedPercent: 0,
    },
    pressure: {
        level,
        resources: { cpu: 'ok', memory: 'ok', disk: 'ok', ...resources },
        thresholds: { warningPercent: 85, criticalPercent: 95 },
    },
});

describe('HostPressureAlert.tsx', () => {
    it('renders nothing when the host is healthy', () => {
        const { container } = render(<HostPressureAlert stats={stats('ok')} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing without a sample', () => {
        const { container } = render(<HostPressureAlert stats={null} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('names the resources that are under pressure', () => {
        const { container } = render(<HostPressureAlert stats={stats('warning', { cpu: 'warning' })} />);

        // The CPU pressure follows the worse of the sampled usage and the load.
        expect(container).toHaveTextContent('CPU at 90.2%');
        expect(container).not.toHaveTextContent('disk at');
    });

    it('reports the worst filesystem for disk pressure', () => {
        const critical = stats('critical', { disk: 'critical' });
        critical.disks.push({ labels: ['root'], path: '/', totalBytes: 100, usedBytes: 97, percent: 97 });

        const { container } = render(<HostPressureAlert stats={critical} />);

        expect(container).toHaveTextContent('disk at 97.0%');
    });
});
