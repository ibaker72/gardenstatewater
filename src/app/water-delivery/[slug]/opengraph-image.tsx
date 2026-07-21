import { ImageResponse } from 'next/og';
import { getTownBySlug } from '@/lib/marketing';

/**
 * Per-town Open Graph card: brand-styled, generated on demand. A shared link
 * to /water-delivery/short-hills-nj previews with the town's own name — much
 * higher social CTR than one generic site image.
 */

export const revalidate = 86400;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Garden State Water — local 5-gallon water delivery';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const town = await getTownBySlug(slug);
  const heading = town ? `Water delivery in ${town.town}, ${town.state}` : 'Water delivery, done for you';
  const sub = town
    ? `5-gallon spring water · weekly jug exchange · free delivery`
    : '5-gallon spring water across NJ & NY';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #F4FBFD 0%, #DFF6FC 55%, #AEE4F3 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: '#149BC2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 40,
            }}
          >
            💧
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#0B2945' }}>Garden State Water</div>
            <div style={{ fontSize: 22, color: '#52677A' }}>NJ & NY spring water delivery</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, color: '#0B2945', lineHeight: 1.05, maxWidth: 1000 }}>
            {heading}
          </div>
          <div style={{ fontSize: 30, color: '#1c6081' }}>{sub}</div>
        </div>

        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            background: '#0B2945',
            color: 'white',
            fontSize: 28,
            fontWeight: 700,
            padding: '18px 34px',
            borderRadius: 16,
          }}
        >
          First delivery 50% off → gardenstatewater.com
        </div>
      </div>
    ),
    size
  );
}
