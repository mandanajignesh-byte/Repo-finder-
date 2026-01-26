import { ReactNode } from 'react';
import { ParticlesBackground } from './ParticlesBackground';

interface SignatureCardProps {
  children: ReactNode;
  className?: string;
  showLayers?: boolean;
  layerOffsetX?: number;
  layerOffsetY?: number;
  showParticles?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function SignatureCard({
  children,
  className = '',
  showLayers = true,
  layerOffsetX = 8,
  layerOffsetY = 8,
  showParticles = true,
  onClick,
  style,
}: SignatureCardProps) {
  return (
    <div className="relative">
      {/* Pink shadow layer (furthest back) */}
      {showLayers && (
        <div
          className="absolute inset-0 bg-pink-400 rounded-[28px]"
          style={{
            transform: `translate(${layerOffsetX * 2}px, ${layerOffsetY * 2}px)`,
            zIndex: 0,
          }}
        />
      )}
      
      {/* Cyan shadow layer (middle) */}
      {showLayers && (
        <div
          className="absolute inset-0 bg-cyan-400 rounded-[28px]"
          style={{
            transform: `translate(${layerOffsetX}px, ${layerOffsetY}px)`,
            zIndex: 1,
          }}
        />
      )}
      
      {/* Gradient border wrapper with dark colors */}
      <div
        className="relative rounded-[28px] p-[2px]"
        style={{
          background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(31, 41, 55, 0.8) 100%)',
          zIndex: 2,
        }}
      >
        {/* Main card with glassmorphism effect and particles background */}
        <div
          className={`relative rounded-[26px] shadow-lg overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
          style={{ 
            background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.85) 0%, rgba(17, 24, 39, 0.9) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: `
              0 8px 32px 0 rgba(0, 0, 0, 0.37),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
            `,
            ...style,
          }}
          onClick={onClick}
        >
        {/* Particles background - optimized for performance */}
        {showParticles && (
          <div className="absolute inset-0 rounded-[26px] overflow-hidden" style={{ zIndex: 0 }}>
            <ParticlesBackground 
              id={`card-particles-${Math.random().toString(36).substr(2, 9)}`}
              config={{
                particles: {
                  number: { 
                    value: 30, // Reduced from 80 to 30 for better performance
                    density: { enable: true, value_area: 600 }
                  },
                  color: { value: ['#22d3ee', '#ec4899'] }, // Cyan and pink
                  shape: { type: 'circle' },
                  opacity: { 
                    value: 0.3, // Reduced opacity
                    random: true 
                  },
                  size: { 
                    value: 2, // Smaller particles
                    random: true 
                  },
                  line_linked: {
                    enable: true,
                    distance: 150, // Increased distance
                    color: '#22d3ee',
                    opacity: 0.2, // Reduced opacity
                    width: 1
                  },
                  move: {
                    enable: true,
                    speed: 0.6, // Slower movement
                    direction: 'none',
                    random: false,
                    out_mode: 'out'
                  }
                },
                interactivity: {
                  detect_on: 'canvas',
                  events: {
                    onhover: { enable: false, mode: 'repulse' }, // Disable hover for cards
                    onclick: { enable: false, mode: 'push' }, // Disable click for cards
                    resize: true
                  }
                },
                retina_detect: false // Disabled for better performance
              }}
              className="rounded-[26px]"
              style={{ zIndex: 0 }}
            />
          </div>
        )}
        
        {/* Overlay gradient for depth */}
        <div 
          className="absolute inset-0 rounded-[26px] pointer-events-none opacity-40"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 40%)
            `,
            zIndex: 1,
          }}
        />
        <div className="relative z-10">
          {children}
        </div>
        </div>
      </div>
    </div>
  );
}
