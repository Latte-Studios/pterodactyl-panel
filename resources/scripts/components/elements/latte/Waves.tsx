import React from 'react';

export interface WavesProps {
    className?: string;
    /** Waves sit at 14% on an empty state and full strength behind auth. */
    opacity?: number;
}

/**
 * The brand waves from section 8. They are drawn in multiply so they read as
 * part of the ground, and they are always positioned behind content — never
 * across a button label, a number or a piece of contact information.
 */
const Waves = ({ className, opacity = 1 }: WavesProps) => (
    <svg
        aria-hidden
        className={className}
        viewBox={'0 0 1440 900'}
        preserveAspectRatio={'xMidYMid slice'}
        style={{ mixBlendMode: 'multiply', opacity }}
    >
        <path
            d={'M0 640C240 560 400 720 720 660C1040 600 1200 700 1440 620V900H0V640Z'}
            fill={'var(--ls-accent)'}
            fillOpacity={0.35}
        />
        <path
            d={'M0 720C260 660 420 800 760 740C1100 680 1260 780 1440 710V900H0V720Z'}
            fill={'var(--ls-sidebar-ink-strong)'}
            fillOpacity={0.14}
        />
        <path
            d={'M0 180C220 120 380 240 660 190C940 140 1140 220 1440 150V0H0V180Z'}
            fill={'var(--ls-accent)'}
            fillOpacity={0.22}
        />
    </svg>
);

export default Waves;
