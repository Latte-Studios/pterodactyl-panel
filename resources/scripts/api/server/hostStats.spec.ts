import { rawDataToHostStats } from '@/api/server/hostStats';

const payload = {
    timestamp: '2026-09-06T21:00:00Z',
    interval_seconds: 2,
    cpu: { threads: 32, percent: 87.4, load: { 1: 28.1, 5: 25, 15: 20.3 }, load_percent: 87.8 },
    memory: { total_bytes: 1024, used_bytes: 512, available_bytes: 512, percent: 50 },
    swap: { total_bytes: 256, used_bytes: 16, percent: 6.25 },
    disks: [
        { labels: ['data', 'backups'], path: '/var/lib/pterodactyl', total_bytes: 100, used_bytes: 77, percent: 77 },
    ],
    servers: {
        total: 40,
        running: 31,
        unlimited: 2,
        memory_bytes: 64,
        cpu_absolute: 12.5,
        memory_allocated_bytes: 128,
        cpu_allocated_percent: 3200,
    },
    pressure: {
        level: 'critical',
        resources: { cpu: 'warning', memory: 'critical', disk: 'ok' },
        thresholds: { warning_percent: 85, critical_percent: 95 },
    },
};

describe('@/api/server/hostStats.ts', () => {
    describe('rawDataToHostStats()', () => {
        it('converts a daemon payload', () => {
            const stats = rawDataToHostStats(JSON.stringify(payload))!;

            expect(stats.cpu).toStrictEqual({
                threads: 32,
                percent: 87.4,
                loadPercent: 87.8,
                load: { 1: 28.1, 5: 25, 15: 20.3 },
            });
            expect(stats.memory.usedBytes).toBe(512);
            expect(stats.swap.percent).toBe(6.25);
            expect(stats.disks).toStrictEqual([
                {
                    labels: ['data', 'backups'],
                    path: '/var/lib/pterodactyl',
                    totalBytes: 100,
                    usedBytes: 77,
                    percent: 77,
                },
            ]);
            expect(stats.servers.memoryAllocatedBytes).toBe(128);
            expect(stats.servers.cpuAllocatedPercent).toBe(3200);
            expect(stats.pressure.level).toBe('critical');
            expect(stats.pressure.resources.memory).toBe('critical');
            expect(stats.pressure.thresholds).toStrictEqual({ warningPercent: 85, criticalPercent: 95 });
        });

        it('defaults the optional parts of a payload', () => {
            const stats = rawDataToHostStats(
                JSON.stringify({ ...payload, swap: undefined, disks: undefined, servers: undefined })
            )!;

            expect(stats.swap).toStrictEqual({ totalBytes: 0, usedBytes: 0, percent: 0 });
            expect(stats.disks).toStrictEqual([]);
            expect(stats.servers.total).toBe(0);
        });

        it('returns null for data that is not a snapshot', () => {
            expect(rawDataToHostStats('not json')).toBeNull();
            expect(rawDataToHostStats('null')).toBeNull();
            expect(rawDataToHostStats(JSON.stringify({ cpu: { percent: 1 } }))).toBeNull();
        });
    });
});
