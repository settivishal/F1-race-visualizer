import { describe, expect, it } from 'vitest';
import { checkHealth } from './health';

const now = new Date('2026-09-08T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

const base = {
  activeSeason: 2026,
  lastRun: { status: 'SUCCESS', startedAt: hoursAgo(6) },
  now,
};

describe('checkHealth', () => {
  it('is healthy when every race that has run is imported', () => {
    const report = checkHealth({
      ...base,
      races: [
        { slug: '2026-monza', date: hoursAgo(50), status: 'COMPLETED' },
        { slug: '2026-madring', date: hoursAgo(-120), status: 'SCHEDULED' },
      ],
    });

    expect(report.ok).toBe(true);
    expect(report.problems).toEqual([]);
  });

  it('stays quiet between races, which is the normal state', () => {
    // Nothing has happened for a fortnight and nothing is due. That is a
    // calendar gap, not a broken job — the reason "the last run is old" is the
    // wrong check.
    const report = checkHealth({
      ...base,
      lastRun: { status: 'SUCCESS', startedAt: hoursAgo(14 * 24) },
      races: [{ slug: '2026-monza', date: hoursAgo(15 * 24), status: 'COMPLETED' }],
    });

    expect(report.ok).toBe(true);
  });

  it('catches a race that ran and was never imported', () => {
    const report = checkHealth({
      ...base,
      races: [{ slug: '2026-monza', date: hoursAgo(72), status: 'SCHEDULED' }],
    });

    expect(report.ok).toBe(false);
    expect(report.overdue).toEqual(['2026-monza']);
  });

  it('gives a race two days before calling it overdue', () => {
    // Upstream publishes results progressively and the cron waits on that, so a
    // race that finished this morning is not yet a problem.
    const report = checkHealth({
      ...base,
      races: [{ slug: '2026-monza', date: hoursAgo(20), status: 'SCHEDULED' }],
    });

    expect(report.ok).toBe(true);
  });

  it('does not count a cancelled race as never imported', () => {
    const report = checkHealth({
      ...base,
      races: [{ slug: '2026-sakhir', date: hoursAgo(3000), status: 'CANCELLED' }],
    });

    expect(report.ok).toBe(true);
  });

  it('catches the failure that actually happened: a season with nothing in it', () => {
    // The cron ran daily against 2025 for six months, found nothing to import,
    // and reported success every time.
    const report = checkHealth({ ...base, races: [] });

    expect(report.ok).toBe(false);
    expect(report.problems[0]).toContain('no races at all');
  });

  it('reports a failed run even when nothing is overdue', () => {
    const report = checkHealth({
      ...base,
      lastRun: { status: 'FAILED', startedAt: hoursAgo(2) },
      races: [{ slug: '2026-monza', date: hoursAgo(50), status: 'COMPLETED' }],
    });

    expect(report.ok).toBe(false);
    expect(report.problems).toContain('the most recent ingest run failed');
  });

  it('is healthy on a database that has never ingested anything but has a calendar', () => {
    const report = checkHealth({
      ...base,
      lastRun: null,
      races: [{ slug: '2026-madring', date: hoursAgo(-24), status: 'SCHEDULED' }],
    });

    expect(report.ok).toBe(true);
    expect(report.lastRun).toBeNull();
  });
});
