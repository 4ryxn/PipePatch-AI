export type Viewport = { width: number; height: number };
export function contentWidth(width: number): number { return Math.min(Math.max(width - 48, 0), 640); }
export function reviewImageHeight({ width, height }: Viewport): number { return Math.min(Math.max(Math.round(Math.min(width - 48, height * 0.42)), 180), 360); }
export function isCompact({ height }: Viewport): boolean { return height < 640; }
export type ImageLayout = { left: number; top: number; width: number; height: number };
export type ImagePoint = { x: number; y: number };
export function containLayout(container: Viewport, image: Viewport): ImageLayout { const scale = Math.min(container.width / image.width, container.height / image.height); const width = image.width * scale; const height = image.height * scale; return { left: (container.width - width) / 2, top: (container.height - height) / 2, width, height }; }
export function displayToImagePoint(point: ImagePoint, layout: ImageLayout, image: Viewport): ImagePoint | null { if (point.x < layout.left || point.x > layout.left + layout.width || point.y < layout.top || point.y > layout.top + layout.height) return null; return { x: (point.x - layout.left) * image.width / layout.width, y: (point.y - layout.top) * image.height / layout.height }; }
