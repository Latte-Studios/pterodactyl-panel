import React, { useEffect, useMemo, useRef } from 'react';
import { WAVE_SET_DEFAULTS, prepareWaveSet } from '@/lib/latteWave';
import type { WaveSetConfig } from '@/lib/latteWave';
import { drawWave } from '@/lib/latteWave/waveDraw';

/**
 * The same composition Paitickets runs, so the two products draw the same
 * waves rather than two drawings of the same idea. The seed is what makes them
 * identical: everything else here is how fast it moves and how loud it is.
 */
const AUTH_WAVES: Partial<WaveSetConfig> = {
    seed: 503,
    waves: 3,
    marginY: 0.12,
    amplitude: 0.09,
    cycles: 1.6,
    startSide: 'left',
    strokeWidth: 10,
};

/** Carrier drift, radians per second, before each wave's own detune. */
const BASE_SPEED = 0.25;

/** Seconds to cover about 63% of the distance to a new opacity. */
const OPACITY_TAU = 0.18;

export interface WaveFieldProps {
    className?: string;
    /** Where the field settles. It is eased, not cut, so it can be turned down mid-motion. */
    opacity?: number;
}

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The brand waves, drawn live rather than as fixed paths.
 *
 * They blend with `difference`, which is what lets one white stroke read over
 * both the Wolf Expresso ground and anything laid on top of it: the stroke
 * inverts whatever it crosses instead of needing a colour per surface. That
 * only holds while nothing inside the field paints an opaque background, so the
 * field is a bare SVG and the ground stays behind it.
 *
 * The phase is integrated rather than derived from the clock, so a change of
 * speed or a paused tab never makes the waves jump.
 */
const WaveField = ({ className, opacity = 1 }: WaveFieldProps) => {
    const svg = useRef<SVGSVGElement>(null);
    const paths = useRef<(SVGPathElement | null)[]>([]);
    /** Read by the loop, which is not re-created when the target changes. */
    const target = useRef(opacity);
    target.current = opacity;

    const config = useMemo<WaveSetConfig>(() => ({ ...WAVE_SET_DEFAULTS, ...AUTH_WAVES, mergeWaves: false }), []);
    const prepared = useMemo(() => prepareWaveSet(config), [config]);

    useEffect(() => {
        const blend = config.height * config.amplitude * 0.15;

        const draw = (phase: number) =>
            prepared.forEach((wave, index) => {
                // Detuned per wave so no two are ever in step.
                const motion = { phaseOffset: phase * (1 + index * 0.19), amplitudeScale: 1, extremumBlend: blend };
                paths.current[index]?.setAttribute('d', drawWave(wave, motion, null));
            });

        if (prefersReducedMotion()) {
            draw(0);
            if (svg.current) svg.current.style.opacity = target.current.toFixed(3);
            return;
        }

        let frame = 0;
        let last = performance.now();
        let phase = 0;
        let current = target.current;

        const tick = (now: number) => {
            // Capped so a tab returning from the background advances by one
            // frame rather than by however long it was away.
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;

            phase += dt * BASE_SPEED;
            current += (target.current - current) * (1 - Math.exp(-dt / OPACITY_TAU));

            if (svg.current) svg.current.style.opacity = current.toFixed(3);
            draw(phase);

            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [prepared, config.amplitude, config.height]);

    return (
        <svg
            ref={svg}
            className={className}
            viewBox={`0 0 ${config.width} ${config.height}`}
            preserveAspectRatio={'xMidYMid slice'}
            aria-hidden
            focusable={'false'}
            style={{ mixBlendMode: 'difference', opacity: 0 }}
        >
            {prepared.map((_, index) => (
                <path
                    key={index}
                    ref={(el) => {
                        paths.current[index] = el;
                    }}
                    fill={'none'}
                    strokeWidth={config.strokeWidth}
                    strokeLinecap={'round'}
                    strokeLinejoin={'round'}
                    style={{ stroke: 'var(--ls-sidebar-ink-strong)' }}
                />
            ))}
        </svg>
    );
};

export default WaveField;
