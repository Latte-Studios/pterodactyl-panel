import { HostPressureLevel } from '@/api/server/hostStats';
import { StatusTone } from '@/components/elements/latte/status';

/**
 * Returns the tone a reading should carry, or undefined when the value is low
 * enough that it keeps the default ink. Colours come from the tone, never from
 * a class name picked here.
 */
export const getTone = (value: number, max: number | null): StatusTone | undefined => {
    const delta = !max ? 0 : value / max;

    if (delta > 0.9) {
        return 'bad';
    }

    if (delta > 0.8) {
        return 'waiting';
    }

    return undefined;
};

/**
 * Returns the tone for a level the daemon already resolved, which uses the
 * thresholds configured for that node rather than the fixed percentages a
 * container is measured against.
 */
export const getLevelTone = (level: HostPressureLevel): StatusTone | undefined => {
    switch (level) {
        case 'critical':
            return 'bad';
        case 'warning':
            return 'waiting';
        default:
            return undefined;
    }
};
