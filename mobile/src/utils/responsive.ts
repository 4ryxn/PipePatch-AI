export type Viewport = { width: number; height: number };
export function contentWidth(width: number): number { return Math.min(Math.max(width - 48, 0), 640); }
export function reviewImageHeight({ width, height }: Viewport): number { return Math.min(Math.max(Math.round(Math.min(width - 48, height * 0.42)), 180), 360); }
export function isCompact({ height }: Viewport): boolean { return height < 640; }
