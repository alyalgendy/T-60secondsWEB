import type { CSSProperties } from 'react';

/** Lets components pass CSS custom properties without using `any`. */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
