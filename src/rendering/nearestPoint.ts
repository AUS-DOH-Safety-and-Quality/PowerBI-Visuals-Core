export type NearestPoint = {
  readonly index: number;
  readonly x: number;
  readonly y: number;
};
export type PointPosition = (index: number) => { readonly x: number; readonly y: number };

/** Nearest of `count` points by horizontal distance, adding vertical distance when asked */
export function nearestPoint(count: number, position: PointPosition, targetX: number, targetY: number, includeVertical: boolean): NearestPoint | undefined {
  let nearest: NearestPoint | undefined;
  let nearestDistance = Infinity;
  for (let i = 0; i < count; i++) {
    const point = position(i);
    const distance = Math.abs(point.x - targetX) + (includeVertical ? Math.abs(point.y - targetY) : 0);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { index: i, x: point.x, y: point.y };
    }
  }
  return nearest;
}
