import { ImageResponse } from 'next/og'

export const alt = 'The Next Decade Hackathon 2026'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Next.js will automatically use the public URL in production
// but for development we need to handle it.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://passionseed.org'

export default async function Image() {
  const logoUrl = `${baseUrl}/hackathon/HackLogo.png`
  const jellyfishUrl = `${baseUrl}/hackathon/Creature/Jellyfish%201.svg`
  
  // Define colors from themes
  const hackBlue = '#91C4E3'
  const hackPurple = '#A594BA'
  const dawnRose = '#f472b6'
  const deepBlack = '#03050a'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: deepBlack,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(145, 196, 227, 0.1) 0%, transparent 80%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative Glows */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '40%',
          height: '40%',
          borderRadius: '100%',
          background: 'radial-gradient(circle, rgba(145, 196, 227, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '100%',
          background: 'radial-gradient(circle, rgba(165, 148, 186, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />

        {/* Floating Jellyfish - Left */}
        <img
          src={jellyfishUrl}
          style={{
            position: 'absolute',
            top: '-40px',
            left: '-60px',
            width: '450px',
            height: '450px',
            opacity: 0.3,
            filter: 'blur(2px)',
          }}
        />

        {/* Floating Jellyfish - Right */}
        <img
          src={jellyfishUrl}
          style={{
            position: 'absolute',
            bottom: '-80px',
            right: '-100px',
            width: '550px',
            height: '550px',
            opacity: 0.25,
            transform: 'scaleX(-1) rotate(25deg)',
            filter: 'blur(3px)',
          }}
        />

        {/* Border Glow Mask effect */}
        <div style={{
            position: 'absolute',
            inset: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '40px',
            pointerEvents: 'none',
        }} />

        {/* Main Content Area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          {/* Main Logo Container */}
          <div style={{
            display: 'flex',
            padding: '20px',
            marginBottom: '40px',
          }}>
            <img
              src={logoUrl}
              style={{
                width: '640px',
                filter: 'drop-shadow(0 0 40px rgba(145, 196, 227, 0.4))',
              }}
            />
          </div>

          {/* Tagline / Subtitle */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
                fontSize: '44px',
                fontWeight: 600,
                color: 'white',
                opacity: 0.95,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textAlign: 'center',
                textShadow: '0 0 20px rgba(145, 196, 227, 0.4)',
            }}>
                Preventive & Predictive Healthcare
            </div>
            
            {/* Divider */}
            <div style={{
                width: '80px',
                height: '4px',
                borderRadius: '2px',
                background: `linear-gradient(to right, ${hackBlue}, ${hackPurple})`,
                margin: '15px 0',
            }} />

            {/* Date/Location or Themes */}
            <div style={{
                display: 'flex',
                gap: '24px',
                marginTop: '10px'
            }}>
                <div style={{
                    color: hackBlue,
                    fontSize: '28px',
                    fontWeight: 500,
                    letterSpacing: '1px',
                }}>
                    #Healthcare
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '28px' }}>•</div>
                <div style={{
                    color: hackPurple,
                    fontSize: '28px',
                    fontWeight: 500,
                    letterSpacing: '1px',
                }}>
                    #MentalHealth
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '28px' }}>•</div>
                <div style={{
                    color: dawnRose,
                    fontSize: '28px',
                    fontWeight: 500,
                    letterSpacing: '1px',
                }}>
                    #Wellness
                </div>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 30px',
            borderRadius: '100px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
        }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
            <div style={{ color: 'white', fontSize: '20px', opacity: 0.8, letterSpacing: '0.5px' }}>
                Open for Registration
            </div>
        </div>

        {/* Bottom Accent Gradient */}
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '10px',
            backgroundImage: `linear-gradient(to right, ${hackBlue}, ${hackPurple}, ${dawnRose})`,
        }} />
      </div>
    ),
    {
      ...size,
    }
  )
}
