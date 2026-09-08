import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import circuitsPayload from './__fixtures__/circuits-2025-ergast.json';
import { fetchSeasonCircuits } from './ergast';

/**
 * The circuits endpoint, against its real payload.
 *
 * `fetch` is stubbed rather than the module: what is worth testing here is the
 * envelope, and Ergast's circuits endpoint nests under a `CircuitTable` where
 * every other endpoint this client calls nests under a `RaceTable`. That
 * difference is invisible until it breaks, and it breaks at the one moment
 * nobody is watching — a seed run against a database that has no circuits yet,
 * whose emptiness fails a production build rather than a page.
 */
const originalFetch = globalThis.fetch;

function respondWith(body: unknown, status = 200) {
  const stub = vi.fn(async (_input: URL | RequestInfo) =>
    new Response(JSON.stringify(body), { status }));
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchSeasonCircuits', () => {
  it('reads the CircuitTable envelope, not the RaceTable one', async () => {
    const stub = respondWith(circuitsPayload);
    const circuits = await fetchSeasonCircuits(2025);

    expect(circuits).toHaveLength(24);
    expect(circuits[0]).toMatchObject({
      circuitId: 'albert_park',
      circuitName: 'Albert Park Grand Prix Circuit',
      Location: { locality: 'Melbourne', country: 'Australia' },
    });

    // The season belongs in the path, and the page size has to be asked for —
    // Ergast defaults to 30, which would silently drop circuits from a season
    // that has more.
    const url = new URL(String(stub.mock.calls[0][0]));
    expect(url.pathname).toBe('/ergast/f1/2025/circuits.json');
    expect(url.searchParams.get('limit')).toBe('100');
  });

  it('rejects a payload shaped like the other endpoints rather than returning nothing', async () => {
    // The failure this guards: a response that parses as JSON, carries no
    // circuits, and would otherwise seed zero rows and report success.
    respondWith({ MRData: { total: '24', RaceTable: { Races: [] } } });

    await expect(fetchSeasonCircuits(2025)).rejects.toThrow(/unrecognised envelope/);
  });

  it('gives up on a client error instead of retrying it', async () => {
    const stub = respondWith({}, 404);

    await expect(fetchSeasonCircuits(1949)).rejects.toThrow(/returned 404/);
    // 404 is not in the retryable set: a season that does not exist will not
    // start existing on the fourth attempt.
    expect(stub).toHaveBeenCalledTimes(1);
  });
});
