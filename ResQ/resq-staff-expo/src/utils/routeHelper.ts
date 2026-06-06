/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Synthesizes an elegant 4-segment/5-checkpoint municipal grid street route 
 * and interpolates smooth sub-steps between them to simulate realistic road navigation.
 */
export function generateWaypoints(
  l1: number,
  o1: number,
  l2: number,
  o2: number,
  stepsPerSegment = 12
): [number, number][] {
  const corners: [number, number][] = [];
  corners.push([l1, o1]);
  const laDiff = l2 - l1;
  const loDiff = o2 - o1;

  // 5 key street-block corner coordinate turns (identical layout logic)
  corners.push([l1 + laDiff * 0.35, o1]);
  corners.push([l1 + laDiff * 0.35, o1 + loDiff * 0.7]);
  corners.push([l1 + laDiff * 0.85, o1 + loDiff * 0.7]);
  corners.push([l1 + laDiff * 0.85, o2]);
  corners.push([l2, o2]);

  const points: [number, number][] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const start = corners[i];
    const end = corners[i + 1];
    for (let j = 0; j < stepsPerSegment; j++) {
      const t = j / stepsPerSegment;
      const lat = start[0] + (end[0] - start[0]) * t;
      const lon = start[1] + (end[1] - start[1]) * t;
      points.push([lat, lon]);
    }
  }
  points.push([l2, o2]); // terminal destination anchor
  return points;
}
