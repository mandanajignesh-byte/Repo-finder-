import { Loader2 } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { ParticlesBackground } from './ParticlesBackground';
import { TypedText } from './TypedText';

export function SplashScreen() {
  // Optimized particles for splash screen (reduced from 200 to 100 for performance)
  const splashParticlesConfig = {
    particles: {
      number: { 
        value: 100,
        density: { enable: true, value_area: 800 }
      },
      color: { value: ['#22d3ee', '#ec4899'] }, // Cyan and pink
      shape: { type: 'circle' },
      opacity: { 
        value: 0.7,
        random: true 
      },
      size: { 
        value: 5,
        random: true 
      },
      line_linked: {
        enable: true,
        distance: 150,
        color: '#22d3ee',
        opacity: 0.4,
        width: 1
      },
      move: {
        enable: true,
        speed: 2,
        direction: 'none',
        random: false,
        out_mode: 'out'
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'repulse' },
        onclick: { enable: true, mode: 'push' },
        resize: true
      },
      modes: {
        repulse: { distance: 150 },
        push: { particles_nb: 6 }
      }
    },
    retina_detect: true
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-8 relative overflow-hidden" style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ParticlesBackground 
        id="splash-particles" 
        config={splashParticlesConfig}
        className="fixed inset-0"
        style={{ zIndex: 0, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      />
      <div className="flex flex-col items-center gap-8 w-full max-w-md relative z-10">
        {/* Layered signature card */}
        <SignatureCard className="p-12 w-full">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            
            <div className="text-center">
              <p className="text-xl mb-2 text-white">
                <TypedText
                  strings={[
                    'Charting the GitHub universe...',
                    'Mapping stellar repositories...',
                    'Scanning the galaxy of code...',
                    'Almost ready to explore...',
                  ]}
                  typeSpeed={60}
                  backSpeed={40}
                  loop={true}
                  showCursor={true}
                />
              </p>
            </div>
          </div>
        </SignatureCard>
        
        {/* App branding */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <img 
              src="/logo.png" 
              alt="RepoVerse Logo" 
              className="h-16 w-16 md:h-20 md:w-20 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">
            <TypedText
              strings={['RepoVerse']}
              typeSpeed={100}
              showCursor={false}
            />
          </h1>
          <p className="text-gray-300">
            <TypedText
              strings={[
                'Navigate the universe of GitHub repos',
                'Discover stellar projects across the galaxy',
                'Explore the cosmos of open source code',
              ]}
              typeSpeed={50}
              backSpeed={30}
              loop={true}
              showCursor={true}
            />
          </p>
        </div>
      </div>
    </div>
  );
}