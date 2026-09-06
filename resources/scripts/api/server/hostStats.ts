export type HostPressureLevel = 'ok' | 'warning' | 'critical';

export type HostPressureResource = 'cpu' | 'memory' | 'disk';

export interface HostDisk {
    labels: string[];
    path: string;
    totalBytes: number;
    usedBytes: number;
    percent: number;
}

export interface HostStats {
    timestamp: string;
    cpu: {
        threads: number;
        percent: number;
        loadPercent: number;
        load: { 1: number; 5: number; 15: number };
    };
    memory: {
        totalBytes: number;
        usedBytes: number;
        percent: number;
    };
    swap: {
        totalBytes: number;
        usedBytes: number;
        percent: number;
    };
    disks: HostDisk[];
    servers: {
        total: number;
        running: number;
        unlimited: number;
        memoryBytes: number;
        cpuAbsolute: number;
        memoryAllocatedBytes: number;
        cpuAllocatedPercent: number;
    };
    pressure: {
        level: HostPressureLevel;
        resources: Record<HostPressureResource, HostPressureLevel>;
        thresholds: { warningPercent: number; criticalPercent: number };
    };
}

/**
 * Converts a raw "host stats" websocket payload into the shape used throughout
 * the console. Returns null when the payload is not something we understand,
 * which keeps a daemon sending an unexpected body from breaking the page.
 */
export const rawDataToHostStats = (data: string): HostStats | null => {
    let parsed: any;

    try {
        parsed = JSON.parse(data);
    } catch (e) {
        return null;
    }

    if (!parsed || !parsed.cpu || !parsed.memory || !parsed.pressure) {
        return null;
    }

    return {
        timestamp: parsed.timestamp,
        cpu: {
            threads: parsed.cpu.threads,
            percent: parsed.cpu.percent,
            loadPercent: parsed.cpu.load_percent,
            load: {
                1: parsed.cpu.load?.['1'] ?? 0,
                5: parsed.cpu.load?.['5'] ?? 0,
                15: parsed.cpu.load?.['15'] ?? 0,
            },
        },
        memory: {
            totalBytes: parsed.memory.total_bytes,
            usedBytes: parsed.memory.used_bytes,
            percent: parsed.memory.percent,
        },
        swap: {
            totalBytes: parsed.swap?.total_bytes ?? 0,
            usedBytes: parsed.swap?.used_bytes ?? 0,
            percent: parsed.swap?.percent ?? 0,
        },
        disks: (parsed.disks ?? []).map((disk: any) => ({
            labels: disk.labels ?? [],
            path: disk.path,
            totalBytes: disk.total_bytes,
            usedBytes: disk.used_bytes,
            percent: disk.percent,
        })),
        servers: {
            total: parsed.servers?.total ?? 0,
            running: parsed.servers?.running ?? 0,
            unlimited: parsed.servers?.unlimited ?? 0,
            memoryBytes: parsed.servers?.memory_bytes ?? 0,
            cpuAbsolute: parsed.servers?.cpu_absolute ?? 0,
            memoryAllocatedBytes: parsed.servers?.memory_allocated_bytes ?? 0,
            cpuAllocatedPercent: parsed.servers?.cpu_allocated_percent ?? 0,
        },
        pressure: {
            level: parsed.pressure.level,
            resources: {
                cpu: parsed.pressure.resources?.cpu ?? 'ok',
                memory: parsed.pressure.resources?.memory ?? 'ok',
                disk: parsed.pressure.resources?.disk ?? 'ok',
            },
            thresholds: {
                warningPercent: parsed.pressure.thresholds?.warning_percent ?? 0,
                criticalPercent: parsed.pressure.thresholds?.critical_percent ?? 0,
            },
        },
    };
};
