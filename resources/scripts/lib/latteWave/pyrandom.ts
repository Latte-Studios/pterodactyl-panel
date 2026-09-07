/**
 * A clone of CPython's `random.Random` — the MT19937 Mersenne Twister with
 * the same seeding and the same consumption pattern.
 *
 * The Latte Studios wave generator (`latte_wave_generator_v1_0_2.py`) is a
 * pure function of its seed, and the brand keeps a catalogue of approved
 * compositions by version + seed. Reproducing those in the browser means
 * reproducing the PRNG bit for bit; `Math.random()` is not seedable and a
 * different generator would need its own catalogue. So this is the CPython
 * one: `init_by_array` seeding, 53-bit `random()` from two 32-bit words,
 * `getrandbits(k)` from one word, and `choice` through rejection sampling.
 *
 * All arithmetic is exact: the 32-bit steps use `Math.imul` and `>>> 0`, and
 * the 53-bit double is assembled as `(a * 2^26 + b) / 2^53`, which cannot
 * lose precision in a binary64.
 */

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class PyRandom {
    private readonly mt = new Uint32Array(N);
    private index = N;

    /**
     * @param seed a non-negative integer below 2^53. CPython takes `abs()`
     *             of a negative seed, so the same is done here.
     */
    constructor(seed: number) {
        if (!Number.isInteger(seed)) {
            throw new RangeError('PyRandom seed must be an integer');
        }
        // CPython splits |seed| into 32-bit words, least significant first.
        let n = Math.abs(seed);
        const key: number[] = [];
        do {
            key.push(n % 0x100000000);
            n = Math.floor(n / 0x100000000);
        } while (n > 0);
        this.initByArray(key);
    }

    private initGenrand(s: number): void {
        const mt = this.mt;
        mt[0] = s >>> 0;
        for (let i = 1; i < N; i++) {
            const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
        }
        this.index = N;
    }

    private initByArray(key: number[]): void {
        this.initGenrand(19650218);
        const mt = this.mt;
        let i = 1;
        let j = 0;
        for (let k = Math.max(N, key.length); k > 0; k--) {
            const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = (((mt[i] ^ Math.imul(prev, 1664525)) >>> 0) + key[j] + j) >>> 0;
            i++;
            j++;
            if (i >= N) {
                mt[0] = mt[N - 1];
                i = 1;
            }
            if (j >= key.length) j = 0;
        }
        for (let k = N - 1; k > 0; k--) {
            const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
            mt[i] = (((mt[i] ^ Math.imul(prev, 1566083941)) >>> 0) - i) >>> 0;
            i++;
            if (i >= N) {
                mt[0] = mt[N - 1];
                i = 1;
            }
        }
        mt[0] = 0x80000000;
        this.index = N;
    }

    private twist(): void {
        const mt = this.mt;
        for (let i = 0; i < N; i++) {
            const y = ((mt[i] & UPPER_MASK) | (mt[(i + 1) % N] & LOWER_MASK)) >>> 0;
            let v = mt[(i + M) % N] ^ (y >>> 1);
            if (y & 1) v ^= MATRIX_A;
            mt[i] = v >>> 0;
        }
        this.index = 0;
    }

    /** One tempered 32-bit word: `genrand_uint32`. */
    genrand(): number {
        if (this.index >= N) this.twist();
        let y = this.mt[this.index++];
        y ^= y >>> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >>> 18;
        return y >>> 0;
    }

    /** `random()`: a double in [0, 1) with 53 bits, consuming TWO words. */
    random(): number {
        const a = this.genrand() >>> 5;
        const b = this.genrand() >>> 6;
        return (a * 67108864 + b) * (1 / 9007199254740992);
    }

    /** `uniform(lo, hi)`: `lo + (hi - lo) * random()`. */
    uniform(lo: number, hi: number): number {
        return lo + (hi - lo) * this.random();
    }

    /** `getrandbits(k)` for 0 < k <= 32: the top k bits of ONE word. */
    getrandbits(k: number): number {
        if (k <= 0 || k > 32) {
            throw new RangeError('PyRandom.getrandbits supports 1..32 bits');
        }
        return this.genrand() >>> (32 - k);
    }

    /** `_randbelow(n)`: rejection sampling over `bit_length(n)` bits. */
    randbelow(n: number): number {
        if (!Number.isInteger(n) || n <= 0 || n > 0xffffffff) {
            throw new RangeError('PyRandom.randbelow needs 0 < n <= 2^32 - 1');
        }
        const k = 32 - Math.clz32(n);
        let r = this.getrandbits(k);
        while (r >= n) r = this.getrandbits(k);
        return r;
    }

    /** `choice(seq)`. */
    choice<T>(seq: readonly T[]): T {
        if (seq.length === 0) {
            throw new RangeError('PyRandom.choice on an empty sequence');
        }
        return seq[this.randbelow(seq.length)];
    }
}
