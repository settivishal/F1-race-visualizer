import { ImageResponse } from 'next/og';

/**
 * The site's default share card, inherited by every route that does not draw
 * its own. Only `races/[slug]` draws its own.
 *
 * Same construction as that one — hard-coded dark-theme colours, because Satori
 * resolves no CSS variables and no stylesheet — but no data, so it prerenders
 * once and costs nothing.
 */
export const alt = 'RaceLines';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#07080b',
          color: '#f3f5f8',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 12, height: 56, borderRadius: 6, background: '#ff2016' }} />
          <div style={{ fontSize: 30, letterSpacing: 6, textTransform: 'uppercase' }}>RaceLines</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 32, color: '#ff2016', letterSpacing: 4 }}>FORMULA 1, REPLAYED</div>
          <div style={{ fontSize: 84, fontWeight: 700, marginTop: 16, lineHeight: 1.1 }}>
            Every position change, lap by lap.
          </div>
        </div>

        <div style={{ fontSize: 28, color: '#9aa4b4' }}>
          Replays, standings and race analysis from 2018 on.
        </div>
      </div>
    ),
    size,
  );
}
