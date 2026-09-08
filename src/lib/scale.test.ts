import { describe, expect, it } from 'vitest';
import { formatLapTime, linePath, linearScale, niceTicks } from './scale';

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const scale = linearScale([0, 10], [0, 100]);
    expect(scale(0)).toBe(0);
    expect(scale(5)).toBe(50);
    expect(scale(10)).toBe(100);
  });

  it('inverts happily, which is how an SVG y axis is built', () => {
    const y = linearScale([90, 100], [300, 0]);
    expect(y(90)).toBe(300);
    expect(y(100)).toBe(0);
  });

  it('puts a single-valued domain in the middle instead of dividing by zero', () => {
    // A driver with one timed lap has min === max, and that must not be NaN.
    expect(linearScale([92, 92], [0, 200])(92)).toBe(100);
  });
});

describe('niceTicks', () => {
  it('chooses round steps', () => {
    expect(niceTicks([0, 100], 5)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('does not accumulate floating-point noise', () => {
    // 90.3 must not come back as 90.30000000000001 and be rendered that way.
    for (const tick of niceTicks([90, 91], 5)) {
      expect(String(tick).length).toBeLessThanOrEqual(5);
    }
  });

  it('survives a flat domain', () => {
    expect(niceTicks([92, 92])).toEqual([92]);
  });
});

describe('linePath', () => {
  it('moves once and then draws', () => {
    expect(linePath([{ x: 0, y: 1 }, { x: 2, y: 3 }])).toBe('M0.00 1.00 L2.00 3.00');
  });
});

describe('formatLapTime', () => {
  it('reads as a lap time, with a padded seconds field', () => {
    expect(formatLapTime(92.412)).toBe('1:32.412');
    expect(formatLapTime(63.09)).toBe('1:03.090');
  });

  it('drops the minute when there is not one', () => {
    expect(formatLapTime(42.5)).toBe('42.500');
  });
});
