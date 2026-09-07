import { catmullRomToBezier, evaluateWave } from './waveMath';
import type { Point, PreparedWave, WaveMotion } from './waveMath';

/**
 * One wave, mid-glitch.
 *
 * A burst is decided once when it opens and then held for its duration, so the
 * wave is consistently wrong rather than noisy: the same corner, the same
 * spike, the same colour separation for as long as it lasts.
 */
export interface WaveBurst {
    /** Jump in carrier phase, radians. */
    phaseKick: number;
    /** Multiplies the amplitude for the duration. */
    ampKick: number;
    /** Chromatic separation of the ghosts, canvas units. */
    split: number;
    /** Index of the node pulled off the carrier, and by how much. */
    spikeAt: number;
    spikeBy: number;
}

/** How long a burst lasts, and how long the wave behaves before the next. */
export const BURST_SECONDS: readonly [number, number] = [0.05, 0.22];
export const CALM_SECONDS: readonly [number, number] = [0.6, 4.2];

export const between = ([low, high]: readonly [number, number]) => low + Math.random() * (high - low);

/**
 * The composition is seeded and reproducible; when a wave breaks is not, and
 * must not be — a glitch on a timetable stops reading as one.
 */
export function openBurst(wave: PreparedWave, spikeHeight: number): WaveBurst {
    return {
        phaseKick: (Math.random() - 0.5) * 2.4,
        ampKick: 1 + Math.random() * 0.4,
        split: (6 + Math.random() * 26) * (Math.random() < 0.5 ? -1 : 1),
        spikeAt: 1 + Math.floor(Math.random() * (wave.cfg.points - 2)),
        spikeBy: (Math.random() - 0.5) * 2 * spikeHeight,
    };
}

/**
 * The `d` of one wave for one frame.
 *
 * Mid-burst the smoothness collapses, which pulls every Bézier control point
 * onto its node: the curve stops being a curve and becomes a polyline with
 * hard corners. The extremum blend goes with it — straight segments have no
 * tangents to keep continuous — and one node is yanked into a spike.
 */
export function drawWave(wave: PreparedWave, motion: WaveMotion, burst: WaveBurst | null): string {
    const points: Point[] = evaluateWave(wave, motion);
    if (burst) {
        const node = points[burst.spikeAt];
        points[burst.spikeAt] = [node[0], node[1] + burst.spikeBy];
    }
    return catmullRomToBezier(
        points,
        burst ? wave.cfg.smoothness * 0.06 : wave.cfg.smoothness,
        motion.extremumBlend ?? 0
    );
}
