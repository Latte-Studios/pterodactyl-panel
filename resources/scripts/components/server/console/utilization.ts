import { HostPressureLevel } from '@/api/server/hostStats';

/**
 * Returns the background color a stat block should use for a value, or undefined
 * when the value is low enough that the block keeps its default styling.
 */
export const getBackgroundColor = (value: number, max: number | null): string | undefined => {
    const delta = !max ? 0 : value / max;

    if (delta > 0.8) {
        if (delta > 0.9) {
            return 'bg-red-500';
        }
        return 'bg-yellow-500';
    }

    return undefined;
};

/**
 * Returns the background color for a level that the daemon already resolved,
 * which uses the thresholds configured for that node rather than the fixed
 * percentages a container is measured against.
 */
export const getLevelColor = (level: HostPressureLevel): string | undefined => {
    switch (level) {
        case 'critical':
            return 'bg-red-500';
        case 'warning':
            return 'bg-yellow-500';
        default:
            return undefined;
    }
};
