import { describe, expect, it } from 'vitest';
import { markOutliers, median, summarizePace } from './pace';

const steady = (count: number, time: number, from = 1) =>
  Array.from({ length: count }, (_, i) => ({ lap: from + i, time }));

describe('median', () => {
  it('averages the middle pair on an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('is null for no laps, which is not the same as zero', () => {
    expect(median([])).toBeNull();
  });
});

describe('markOutliers', () => {
  it('excludes the in-lap and the out-lap around a stop', () => {
    const laps = [...steady(10, 90)];
    laps[4] = { lap: 5, time: 115 };  // pitted
    laps[5] = { lap: 6, time: 96 };   // out-lap, cold tyres

    const marked = markOutliers(laps, [5]);
    expect(marked.find((l) => l.lap === 5)?.isOutlier).toBe(true);
    expect(marked.find((l) => l.lap === 6)?.isOutlier).toBe(true);
    expect(marked.find((l) => l.lap === 7)?.isOutlier).toBe(false);
  });

  it('judges a driver against their own median, not the field', () => {
    // A backmarker four seconds off the winner is still driving to their own
    // limit; every lap here is representative.
    const marked = markOutliers(steady(12, 94));
    expect(marked.every((l) => !l.isOutlier)).toBe(true);
  });

  it('drops a safety-car lap without being told a safety car happened', () => {
    const laps = [...steady(10, 90)];
    laps[7] = { lap: 8, time: 120 };
    expect(markOutliers(laps).find((l) => l.lap === 8)?.isOutlier).toBe(true);
  });

  it('treats the next recorded lap as the out-lap when laps are missing', () => {
    // 2025-miami has no laps 2-24 upstream. A stop on lap 1 there has its
    // out-lap at lap 25, and "pit lap + 1" would exclude a lap that does not
    // exist while counting the one that does.
    const laps = [{ lap: 1, time: 115 }, { lap: 25, time: 96 }, { lap: 26, time: 90 }];
    const marked = markOutliers(laps, [1]);
    expect(marked.find((l) => l.lap === 25)?.isOutlier).toBe(true);
    expect(marked.find((l) => l.lap === 26)?.isOutlier).toBe(false);
  });

  it('does not let the stops themselves set the baseline', () => {
    // Three stops in ten laps: if the pit laps counted toward the median, the
    // median would rise far enough to call them all normal.
    const laps = [...steady(10, 90)];
    for (const lap of [3, 6, 9]) laps[lap - 1] = { lap, time: 118 };

    const marked = markOutliers(laps, [3, 6, 9]);
    for (const lap of [3, 6, 9]) {
      expect(marked.find((l) => l.lap === lap)?.isOutlier).toBe(true);
    }
  });
});

describe('summarizePace', () => {
  it('keeps the best lap even when it would be an outlier the other way', () => {
    const laps = [...steady(10, 90), { lap: 11, time: 88 }];
    expect(summarizePace(laps).best).toBe(88);
  });

  it('reports how many laps it threw away', () => {
    const laps = [...steady(10, 90)];
    laps[4] = { lap: 5, time: 115 };
    const summary = summarizePace(laps, [5]);

    expect(summary.lapsExcluded).toBe(2);      // the stop and its out-lap
    expect(summary.lapsCounted).toBe(8);
    expect(summary.median).toBe(90);
  });

  it('has no consistency figure from a single lap', () => {
    const summary = summarizePace([{ lap: 1, time: 90 }]);
    expect(summary.consistency).toBeNull();
    expect(summary.median).toBe(90);
  });

  it('is all nulls for a driver who set no time at all', () => {
    const summary = summarizePace([]);
    expect(summary.best).toBeNull();
    expect(summary.median).toBeNull();
    expect(summary.lapsCounted).toBe(0);
  });
});
