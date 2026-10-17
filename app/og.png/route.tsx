/**
 * The link-preview image every page shares (lib/seo/page-metadata.ts),
 * 1200 × 630, drawn once by the build in the site's dark colours. It holds no
 * figures: sites that show previews cache them for weeks. The bars are a
 * motif, not data.
 */
import { ImageResponse } from 'next/og';
import { OG_IMAGE_SIZE } from '@/lib/seo/page-metadata';

export const dynamic = 'force-static';

const BARS = [3, 5, 4, 7, 6, 9, 8, 12, 10, 14, 13, 17, 15, 19, 18, 22];

export function GET(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: '#0a0a0a',
        color: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', fontSize: 34, color: '#a1a1aa' }}>hlcharts.com</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 600 }}>
          <div style={{ display: 'flex', fontSize: 132, letterSpacing: -5 }}>hlcharts</div>
          <div style={{ display: 'flex', fontSize: 42, color: '#d4d4d8', lineHeight: 1.25 }}>
            Hyperliquid markets, funding and open interest, live
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 260 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: h * 11,
                borderRadius: 4,
                background: i === BARS.length - 1 ? '#3b82f6' : '#27272a',
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    OG_IMAGE_SIZE
  );
}
