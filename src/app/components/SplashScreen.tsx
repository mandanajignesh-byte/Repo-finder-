import { Loader2 } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { ParticlesBackground } from './ParticlesBackground';
import { TypedText } from './TypedText';

export function SplashScreen() {
  // More prominent particles for splash screen
  const splashParticlesConfig = {
    particles: {
      number: { 
        value: 200,
        density: { enable: true, value_area: 600 }
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
    <div className="fixed inset-0 bg-black flex items-center justify-center p-8 relative">
      <ParticlesBackground id="splash-particles" config={splashParticlesConfig} />
      <div className="flex flex-col items-center gap-8 w-full max-w-md relative z-10">
        {/* Layered signature card */}
        <SignatureCard className="p-12 w-full">
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            
            <div className="text-center">
              <p className="text-xl mb-2 text-white">
                <TypedText
                  strings={[
                    'Hi, human. Act busy.',
                    'I\'ll work. You... exist.',
                    'Discovering amazing repos...',
                    'Almost ready...',
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
          <h1 className="text-2xl font-bold mb-2 text-white">
            <TypedText
              strings={['RepoFinder']}
              typeSpeed={100}
              showCursor={false}
            />
          </h1>
          <p className="text-gray-300">
            <TypedText
              strings={[
                'Discover the right GitHub repo faster',
                'Find your next favorite project',
                'Explore amazing repositories',
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