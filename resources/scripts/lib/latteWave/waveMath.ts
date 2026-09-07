/**
 * Port of the Latte Studios wave generator, v1.0.2 seed contract.
 *
 * Every function here is a transcription of its Python counterpart in
 * `latte_wave_generator_v1_0_2.py`, in the same order of operations, so a
 * seed produces the same points on both sides (see `waveMath.test.ts`, which
 * checks against fixtures exported from the Python module). The pipeline is
 * `(seed, config) -> points -> cubic Béziers -> SVG path data`; the only
 * randomness is the MT19937 stream in `PyRandom`, consumed in the exact
 * order the Python does:
 *
 *   wave rng   : N × uniform(-1, 1), then uniform(0, 2π), then choice([-1, 1])
 *   shape rng  : uniform for amplitude ONLY IF amplitude_variation > 0,
 *                then uniform for cycles ONLY IF cycles_min != cycles_max
 *   side rng   : choice for start side ONLY IF randomized, then choice for
 *                edge side ONLY IF randomized
 *
 * Animation is layered on top without touching the draws: `WaveMotion` adds
 * a phase offset and an amplitude scale AFTER the random values are taken,
 * so `motion = {0, 1}` reproduces v1.0.2 exactly and any other value is the
 * same wave, displaced in time.
 */

import { PyRandom } from './pyrandom';

export type Point = [number, number];
export type StartSide = 'left' | 'right';
export type EdgeSide = 'top' | 'bottom' | 'nearest';

const EPSILON = 1e-7;
const GEOMETRIC_EPSILON = 0.5;

export interface WaveConfig {
    width: number;
    height: number;
    seed: number;
    centerY: number;
    amplitude: number;
    edgeBias: number;
    cycles: number;
    points: number;
    irregularity: number;
    smoothness: number;
    peakSoftness: number;
    smoothing: number;
    startSide: StartSide;
    edgeSide: EdgeSide;
    edgeReach: number | null;
    strokeWidth: number;
}

export interface WaveSetConfig {
    waves: number;
    width: number;
    height: number;
    seed: number;
    centerY: number;
    marginY: number;
    amplitude: number;
    amplitudeVariation: number;
    edgeBias: number;
    cycles: number;
    cyclesMin: number | null;
    cyclesMax: number | null;
    points: number;
    irregularity: number;
    smoothness: number;
    peakSoftness: number;
    smoothing: number;
    startSide: StartSide;
    edgeSide: EdgeSide;
    edgeReach: number | null;
    randomizeStartSide: boolean;
    randomizeEdgeSide: boolean;
    strokeWidth: number;
    mergeWaves: boolean;
}

export const WAVE_DEFAULTS: WaveConfig = {
    width: 1600,
    height: 1000,
    seed: 42,
    centerY: 0.78,
    amplitude: 0.13,
    edgeBias: 0.08,
    cycles: 1.45,
    points: 16,
    irregularity: 0.28,
    smoothness: 0.68,
    peakSoftness: 0.7,
    smoothing: 0.0,
    startSide: 'left',
    edgeSide: 'nearest',
    edgeReach: null,
    strokeWidth: 9.0,
};

export const WAVE_SET_DEFAULTS: WaveSetConfig = {
    waves: 1,
    width: 1600,
    height: 1000,
    seed: 42,
    centerY: 0.78,
    marginY: 0.12,
    amplitude: 0.13,
    amplitudeVariation: 0.0,
    edgeBias: 0.08,
    cycles: 1.45,
    cyclesMin: null,
    cyclesMax: null,
    points: 16,
    irregularity: 0.28,
    smoothness: 0.68,
    peakSoftness: 0.7,
    smoothing: 0.0,
    startSide: 'left',
    edgeSide: 'nearest',
    edgeReach: null,
    randomizeStartSide: false,
    randomizeEdgeSide: false,
    strokeWidth: 9.0,
    mergeWaves: false,
};

/** Time-dependent displacement applied after the random draws. */
export interface WaveMotion {
    /** Added to the carrier phase, in radians. 0 reproduces v1.0.2. */
    phaseOffset: number;
    /** Multiplies the oscillation amplitude. 1 reproduces v1.0.2. */
    amplitudeScale: number;
    /**
     * Width, in canvas pixels, over which "this node is a local extremum"
     * fades in instead of switching. The generator decides extrema with a
     * boolean, which is fine for one still frame but pops when a moving
     * wave crosses the threshold: a neighbour jumps by 28% of the step and
     * a tangent snaps to horizontal. With a blend the same decisions become
     * continuous in y; 0 (the default) keeps the exact v1.0.2 behaviour.
     */
    extremumBlend?: number;
}

export const STILL: WaveMotion = { phaseOffset: 0, amplitudeScale: 1 };

function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(high, value));
}

function smoothstep(t: number): number {
    t = clamp(t, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

/**
 * How much `y1` is a local extremum between `y0` and `y2`: exactly 0 or 1
 * with no blend (the generator's boolean), otherwise a smoothstep of how far
 * `y1` clears both neighbours, so the weight is continuous in every y.
 */
function extremumWeight(y0: number, y1: number, y2: number, blend: number): number {
    if (!(blend > 0)) {
        return (y1 > y0 && y1 > y2) || (y1 < y0 && y1 < y2) ? 1 : 0;
    }
    const above = Math.min(y1 - y0, y1 - y2);
    const below = Math.min(y0 - y1, y2 - y1);
    return smoothstep(Math.max(above, below) / blend);
}

function validateWaveConfig(cfg: WaveConfig): void {
    if (cfg.width <= 0 || cfg.height <= 0) throw new RangeError('width and height must be positive');
    if (cfg.points < 4) throw new RangeError('points must be >= 4');
    if (cfg.amplitude < 0) throw new RangeError('amplitude must be >= 0');
    if (cfg.cycles <= 0) throw new RangeError('cycles must be > 0');
    if (cfg.edgeReach !== null && !(cfg.edgeReach > 0.0 && cfg.edgeReach <= 1.0)) {
        throw new RangeError('edgeReach must be in (0, 1]');
    }
}

function validateWaveSetConfig(cfg: WaveSetConfig): void {
    if (cfg.waves <= 0) throw new RangeError('waves must be >= 1');
    if (cfg.width <= 0 || cfg.height <= 0) throw new RangeError('width and height must be positive');
    if (cfg.marginY < 0 || cfg.marginY >= 0.5) throw new RangeError('marginY must be in [0, 0.5)');
    if (cfg.amplitudeVariation < 0 || cfg.amplitudeVariation > 1) {
        throw new RangeError('amplitudeVariation must be in [0, 1]');
    }
    if (cfg.cycles <= 0) throw new RangeError('cycles must be > 0');
    if (cfg.cyclesMin !== null && cfg.cyclesMin <= 0) throw new RangeError('cyclesMin must be > 0');
    if (cfg.cyclesMax !== null && cfg.cyclesMax <= 0) throw new RangeError('cyclesMax must be > 0');
    const effectiveMin = cfg.cyclesMin === null ? cfg.cycles : cfg.cyclesMin;
    const effectiveMax = cfg.cyclesMax === null ? cfg.cycles : cfg.cyclesMax;
    if (effectiveMin > effectiveMax) throw new RangeError('cyclesMin must be <= cyclesMax');
    if (cfg.edgeReach !== null && !(cfg.edgeReach > 0.0 && cfg.edgeReach <= 1.0)) {
        throw new RangeError('edgeReach must be in (0, 1]');
    }
}

function resolveEdgeSide(cfg: WaveConfig, point: Point): 'top' | 'bottom' {
    if (cfg.edgeSide === 'top' || cfg.edgeSide === 'bottom') return cfg.edgeSide;
    return Math.abs(point[1]) <= Math.abs(point[1] - cfg.height) ? 'top' : 'bottom';
}

/**
 * Open local maxima/minima without moving the canvas-entry endpoints.
 *
 * With a `blend`, a node's pull on its neighbours is scaled by its
 * extremum weight and eases in over the neighbour's current value rather
 * than overwriting it, so nothing jumps as the wave moves.
 */
export function softenExtrema(points: readonly Point[], amount: number, blend = 0): Point[] {
    amount = clamp(amount, 0.0, 1.0);
    if (amount === 0 || points.length < 5) return points.map((p) => [p[0], p[1]]);

    const result: Point[] = points.map((p) => [p[0], p[1]]);
    for (let i = 1; i < points.length - 1; i++) {
        if (i - 1 === 0 || i + 1 === points.length - 1) continue;
        const y0 = points[i - 1][1];
        const y1 = points[i][1];
        const y2 = points[i + 1][1];
        const w = extremumWeight(y0, y1, y2, blend);
        if (w === 0) continue;

        const spread = 0.28 * amount;
        if (w === 1) {
            result[i - 1] = [result[i - 1][0], y0 + (y1 - y0) * spread];
            result[i + 1] = [result[i + 1][0], y2 + (y1 - y2) * spread];
        } else {
            const prev = result[i - 1][1];
            const next = result[i + 1][1];
            result[i - 1] = [result[i - 1][0], prev + (y0 + (y1 - y0) * spread - prev) * w];
            result[i + 1] = [result[i + 1][0], next + (y2 + (y1 - y2) * spread - next) * w];
        }
    }
    return result;
}

/** One explicit step of the discrete heat equation, kernel [1, 2, 1] / 4. */
export function applyPointSmoothing(points: readonly Point[], amount: number): Point[] {
    amount = clamp(amount, 0.0, 1.0);
    if (amount === 0 || points.length < 3) return points.map((p) => [p[0], p[1]]);
    const result: Point[] = points.map((p) => [p[0], p[1]]);
    for (let i = 1; i < points.length - 1; i++) {
        const y = (points[i - 1][1] + 2.0 * points[i][1] + points[i + 1][1]) / 4.0;
        result[i] = [points[i][0], points[i][1] * (1.0 - amount) + y * amount];
    }
    return result;
}

const f = (v: number): string => v.toFixed(2);

/**
 * Catmull-Rom spline as cubic Béziers (`C` commands). Tangents are scaled
 * by `smoothness`, and a node that is a local extremum in y gets a
 * horizontal tangent on both sides, which removes the overshoot at peaks.
 */
export function catmullRomToBezier(points: readonly Point[], smoothness: number, blend = 0): string {
    if (points.length < 2) throw new RangeError('At least two points are required');

    const s = clamp(smoothness, 0.0, 1.0);
    const path: string[] = [`M ${f(points[0][0])} ${f(points[0][1])}`];

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i + 2 < points.length ? points[i + 2] : p2;

        // The vertical tangent fades out as a node becomes an extremum. At
        // weight 1 it is exactly zero, as in the generator.
        const w1 = i > 0 ? extremumWeight(p0[1], p1[1], p2[1], blend) : 0;
        const w2 = i + 1 < points.length - 1 ? extremumWeight(p1[1], p2[1], p3[1], blend) : 0;

        const t1x = ((p2[0] - p0[0]) / 6.0) * s;
        const t1y = w1 === 1 ? 0.0 : ((p2[1] - p0[1]) / 6.0) * s * (1 - w1);
        const t2x = ((p3[0] - p1[0]) / 6.0) * s;
        const t2y = w2 === 1 ? 0.0 : ((p3[1] - p1[1]) / 6.0) * s * (1 - w2);

        const c1x = p1[0] + t1x;
        const c1y = p1[1] + t1y;
        const c2x = p2[0] - t2x;
        const c2y = p2[1] - t2y;
        path.push(`C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(p2[0])} ${f(p2[1])}`);
    }

    return path.join(' ');
}

function bleedDistance(cfg: WaveConfig): number {
    return Math.max(8.0, cfg.strokeWidth * 2.0);
}

/** Drive the organic tail into the selected edge and add a small escape. */
export function applyEdgeReach(points: readonly Point[], cfg: WaveConfig, bleed: number): Point[] {
    if (cfg.edgeReach === null) return points.map((p) => [p[0], p[1]]);

    const result: Point[] = points.map((p) => [p[0], p[1]]);
    const chosen = resolveEdgeSide(cfg, result[result.length - 1]);
    const targetY = chosen === 'top' ? 0.0 : cfg.height;

    // Blend from each point's own organic y, so local motion survives while
    // the tail is gradually redirected to the chosen edge.
    const blendStart = Math.max(1, Math.trunc((result.length - 1) * 0.62));
    const original = result.map((p) => [p[0], p[1]] as Point);
    for (let i = blendStart; i < result.length; i++) {
        const u = (i - blendStart) / Math.max(1, result.length - 1 - blendStart);
        const eased = smoothstep(u);
        const y = original[i][1] * (1.0 - eased) + targetY * eased;
        result[i] = [result[i][0], y];
    }

    // Contact with the canvas is exact.
    result[result.length - 1] = [result[result.length - 1][0], targetY];

    // Continue straight through the reached edge; keeping x fixed avoids a
    // sideways kink at the escape point.
    const lastX = result[result.length - 1][0];
    result.push([lastX, chosen === 'top' ? targetY - bleed : targetY + bleed]);
    return result;
}

/** Everything the wave rng decides, taken once so frames need no draws. */
export interface PreparedWave {
    cfg: WaveConfig;
    jitter: number[];
    phase: number;
    biasDir: number;
    bleed: number;
    usable: number;
}

/**
 * Consume the wave's random stream. Order is part of the seed contract:
 * N uniforms for the jitter, then the phase, then the bias direction.
 */
export function prepareWave(cfg: WaveConfig): PreparedWave {
    validateWaveConfig(cfg);
    const rng = new PyRandom(cfg.seed);

    const rawJitter: number[] = [];
    for (let i = 0; i < cfg.points; i++) rawJitter.push(rng.uniform(-1.0, 1.0));
    const jitter: number[] = [];
    for (let i = 0; i < rawJitter.length; i++) {
        const value = rawJitter[i];
        const left = i ? rawJitter[i - 1] : value;
        const right = i + 1 < rawJitter.length ? rawJitter[i + 1] : value;
        jitter.push(0.25 * left + 0.5 * value + 0.25 * right);
    }

    const phase = rng.uniform(0.0, 2.0 * Math.PI);
    const biasDir = rng.choice([-1.0, 1.0]);
    const usable = cfg.edgeReach === null ? 1.0 : clamp(cfg.edgeReach, 0.0001, 1.0);

    return { cfg, jitter, phase, biasDir, bleed: bleedDistance(cfg), usable };
}

/** The point scaffold for a prepared wave, optionally displaced in time. */
export function evaluateWave(wave: PreparedWave, motion: WaveMotion = STILL): Point[] {
    const { cfg, jitter, phase, biasDir, bleed, usable } = wave;

    const ampPx = cfg.height * cfg.amplitude * motion.amplitudeScale;
    const baseY = cfg.height * cfg.centerY;
    const edgePx = cfg.height * cfg.edgeBias;

    let logical: Point[] = [];
    for (let i = 0; i < cfg.points; i++) {
        const tFull = i / (cfg.points - 1);
        const t = tFull * usable;

        // Start outside the canvas. With edge-reach, the final constructed
        // point lands at width * edgeReach; without it, it exits past width.
        const x =
            cfg.edgeReach === null
                ? -bleed + (cfg.width + 2.0 * bleed) * tFull
                : -bleed + (cfg.width * usable + bleed) * tFull;

        // The carrier runs over the travelled span, so shortening the wave
        // does not squeeze the same cycles into less space.
        const theta = 2.0 * Math.PI * cfg.cycles * t + phase + motion.phaseOffset;
        const carrier = Math.sin(theta);
        const harmonic = 0.34 * Math.sin(theta * 0.47 + 1.3);
        const envelope = 0.82 + 0.18 * Math.sin(Math.PI * tFull);
        const randomTerm = jitter[i] * cfg.irregularity;
        const offset = ampPx * (carrier + harmonic + randomTerm) * envelope;

        const edgeWeight = Math.sin(Math.PI * tFull);
        const y = baseY + offset + edgePx * (1.0 - edgeWeight) * 0.5 * biasDir;
        logical.push([x, y]);
    }

    if (cfg.peakSoftness) logical = softenExtrema(logical, cfg.peakSoftness, motion.extremumBlend ?? 0);
    if (cfg.smoothing) logical = applyPointSmoothing(logical, cfg.smoothing);
    if (cfg.edgeReach !== null) logical = applyEdgeReach(logical, cfg, bleed);
    if (cfg.startSide === 'right') logical = logical.map(([x, y]) => [cfg.width - x, y]);

    return logical;
}

export function generatePoints(cfg: WaveConfig, motion: WaveMotion = STILL): Point[] {
    return evaluateWave(prepareWave(cfg), motion);
}

export function generateWavePath(cfg: WaveConfig, motion: WaveMotion = STILL): string {
    return catmullRomToBezier(generatePoints(cfg, motion), cfg.smoothness, motion.extremumBlend ?? 0);
}

export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | null {
    const r: Point = [b[0] - a[0], b[1] - a[1]];
    const s: Point = [d[0] - c[0], d[1] - c[1]];
    const denom = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(denom) < EPSILON) return null;
    const q: Point = [c[0] - a[0], c[1] - a[1]];
    const t = (q[0] * s[1] - q[1] * s[0]) / denom;
    const u = (q[0] * r[1] - q[1] * r[0]) / denom;
    if (t >= 0.0 && t <= 1.0 && u >= 0.0 && u <= 1.0) {
        return [a[0] + t * r[0], a[1] + t * r[1]];
    }
    return null;
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function findFirstIntersection(a: readonly Point[], b: readonly Point[]): [number, number, Point] | null {
    for (let i = 0; i < a.length - 1; i++) {
        for (let j = 0; j < b.length - 1; j++) {
            const hit = segmentIntersection(a[i], a[i + 1], b[j], b[j + 1]);
            if (hit === null) continue;
            // A pure duplicate contact at the same outside endpoint is not a
            // merge event; an interior intersection is.
            if (distance(hit, a[0]) <= GEOMETRIC_EPSILON && distance(hit, b[0]) <= GEOMETRIC_EPSILON) {
                continue;
            }
            return [i, j, hit];
        }
    }
    return null;
}

function truncateAtIntersection(path: readonly Point[], segmentIndex: number, hit: Point): Point[] {
    const prefix = path.slice(0, segmentIndex + 1).map((p) => [p[0], p[1]] as Point);
    if (prefix.length === 0 || distance(prefix[prefix.length - 1], hit) > GEOMETRIC_EPSILON) {
        prefix.push(hit);
    } else {
        prefix[prefix.length - 1] = hit;
    }
    return prefix;
}

function insertIntersection(path: readonly Point[], segmentIndex: number, hit: Point): Point[] {
    const result = path.map((p) => [p[0], p[1]] as Point);
    const insertAt = segmentIndex + 1;
    if (insertAt < result.length && distance(result[insertAt], hit) <= GEOMETRIC_EPSILON) {
        result[insertAt] = hit;
    } else if (insertAt > 0 && distance(result[insertAt - 1], hit) <= GEOMETRIC_EPSILON) {
        result[insertAt - 1] = hit;
    } else {
        result.splice(insertAt, 0, hit);
    }
    return result;
}

/** Merge waves only where their polylines genuinely intersect. */
export function mergePolylines(polylines: readonly (readonly Point[])[]): Point[][] {
    const paths = polylines.map((p) => p.map((q) => [q[0], q[1]] as Point));
    const mergedPairs = new Set<string>();

    for (;;) {
        let changed = false;
        outer: for (let i = 0; i < paths.length; i++) {
            for (let j = i + 1; j < paths.length; j++) {
                const pair = `${i},${j}`;
                if (mergedPairs.has(pair)) continue;

                const hit = findFirstIntersection(paths[i], paths[j]);
                if (hit === null) continue;

                mergedPairs.add(pair);
                const [ia, ib, point] = hit;
                const remA = paths[i].length - ia;
                const remB = paths[j].length - ib;
                if (remA <= remB) {
                    paths[i] = truncateAtIntersection(paths[i], ia, point);
                    paths[j] = insertIntersection(paths[j], ib, point);
                } else {
                    paths[j] = truncateAtIntersection(paths[j], ib, point);
                    paths[i] = insertIntersection(paths[i], ia, point);
                }
                changed = true;
                break outer;
            }
        }
        if (!changed) return paths;
    }
}

/**
 * Derive one wave's config from the set. The seed offsets and multipliers
 * are the v1.0.2 contract; the conditional draws matter as much as the
 * formulas, since a skipped draw shifts the whole stream.
 */
export function waveConfigFromSet(cfg: WaveSetConfig, index: number): WaveConfig {
    validateWaveSetConfig(cfg);

    const shapeRng = new PyRandom(cfg.seed + index * 7919 + 104729);
    const sideRng = new PyRandom(cfg.seed + index * 10007 + 1299709);

    let startSide: StartSide = cfg.startSide;
    let edgeSide: EdgeSide = cfg.edgeSide;
    if (cfg.randomizeStartSide) startSide = sideRng.choice<StartSide>(['left', 'right']);
    if (cfg.randomizeEdgeSide) edgeSide = sideRng.choice<EdgeSide>(['top', 'bottom']);

    const centerY =
        cfg.waves === 1
            ? clamp(cfg.centerY, 0.0, 1.0)
            : cfg.marginY + (1.0 - 2.0 * cfg.marginY) * (index / (cfg.waves - 1));

    const amplitude = cfg.amplitudeVariation
        ? Math.max(0.0, cfg.amplitude * shapeRng.uniform(1.0 - cfg.amplitudeVariation, 1.0 + cfg.amplitudeVariation))
        : cfg.amplitude;

    const cyclesMin = cfg.cyclesMin === null ? cfg.cycles : cfg.cyclesMin;
    const cyclesMax = cfg.cyclesMax === null ? cfg.cycles : cfg.cyclesMax;
    const cycles = cyclesMin !== cyclesMax ? shapeRng.uniform(cyclesMin, cyclesMax) : cyclesMin;

    return {
        width: cfg.width,
        height: cfg.height,
        seed: cfg.seed + index * 9973,
        centerY,
        amplitude,
        edgeBias: cfg.edgeBias,
        cycles,
        points: cfg.points,
        irregularity: cfg.irregularity,
        smoothness: cfg.smoothness,
        peakSoftness: cfg.peakSoftness,
        smoothing: cfg.smoothing,
        startSide,
        edgeSide,
        edgeReach: cfg.edgeReach,
        strokeWidth: cfg.strokeWidth,
    };
}

export function prepareWaveSet(cfg: WaveSetConfig): PreparedWave[] {
    validateWaveSetConfig(cfg);
    const waves: PreparedWave[] = [];
    for (let i = 0; i < cfg.waves; i++) waves.push(prepareWave(waveConfigFromSet(cfg, i)));
    return waves;
}

/** Point scaffolds for every wave in the set, merged where configured. */
export function generateWavePolylines(cfg: WaveSetConfig, motion: WaveMotion = STILL): Point[][] {
    let polylines = prepareWaveSet(cfg).map((w) => evaluateWave(w, motion));
    if (cfg.mergeWaves && polylines.length > 1) polylines = mergePolylines(polylines);
    return polylines;
}

export function generateWavePaths(cfg: WaveSetConfig, motion: WaveMotion = STILL): string[] {
    const configs: WaveConfig[] = [];
    for (let i = 0; i < cfg.waves; i++) configs.push(waveConfigFromSet(cfg, i));
    return generateWavePolylines(cfg, motion).map((points, i) =>
        catmullRomToBezier(points, configs[Math.min(i, configs.length - 1)].smoothness, motion.extremumBlend ?? 0)
    );
}
