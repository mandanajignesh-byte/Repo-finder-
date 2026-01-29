import React, { useEffect, useRef } from 'react';

// Declare particles.js types
declare global {
  interface Window {
    particlesJS: (tagId: string, config: unknown) => void;
  }
}

interface ParticlesConfig {
  particles: {
    number: { value: number; density?: { enable: boolean; value_area: number } };
    color: { value: string | string[] };
    shape?: { type: string };
    opacity: { value: number; random?: boolean };
    size: { value: number; random?: boolean };
    line_linked?: {
      enable: boolean;
      distance: number;
      color: string;
      opacity: number;
      width: number;
    };
    move: {
      enable: boolean;
      speed: number;
      direction?: string;
      random?: boolean;
      out_mode?: string;
    };
  };
  interactivity?: {
    detect_on?: string;
    events?: {
      onhover?: { enable: boolean; mode: string };
      onclick?: { enable: boolean; mode: string };
      resize?: boolean;
    };
    modes?: {
      repulse?: { distance: number };
      push?: { particles_nb: number };
    };
  };
  retina_detect?: boolean;
}

interface ParticlesBackgroundProps {
  id?: string;
  config?: ParticlesConfig;
  className?: string;
  style?: React.CSSProperties & Record<string, unknown>;
}

export function ParticlesBackground({ 
  id = 'particles-container',
  config,
  className = '',
  style
}: ParticlesBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;

    const loadParticles = () => {
      if (!containerRef.current || typeof window.particlesJS !== 'function') {
        console.log('Particles.js not ready yet:', {
          hasContainer: !!containerRef.current,
          hasParticlesJS: typeof window.particlesJS === 'function'
        });
        return;
      }

      // Ensure container has dimensions
      const container = containerRef.current;
      if (!container) return;
      
      // Force full screen dimensions for splash screen
      if (id === 'splash-particles') {
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.right = '0';
        container.style.bottom = '0';
      }
      
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // Wait a bit for layout
        setTimeout(loadParticles, 100);
        return;
      }

      const defaultConfig: ParticlesConfig = {
        particles: {
          number: { 
            value: 150,
            density: { enable: true, value_area: 600 }
          },
          color: { value: ['#22d3ee', '#ec4899'] }, // Cyan and pink to match theme
          shape: { type: 'circle' },
          opacity: { 
            value: 0.6,
            random: true 
          },
          size: { 
            value: 4,
            random: true 
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: '#22d3ee',
            opacity: 0.3,
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
            push: { particles_nb: 4 }
          }
        },
        retina_detect: true
      };

      try {
        console.log('Initializing particles.js for:', id);
        window.particlesJS(id, config || defaultConfig);
        initializedRef.current = true;
        console.log('Particles.js initialized successfully');
      } catch (error) {
        console.error('Error initializing particles.js:', error);
      }
    };

    // Wait a bit for DOM to be ready
    const initTimer = setTimeout(() => {
      // Check if particles.js is already loaded
      if (typeof window.particlesJS === 'function') {
        // Particles.js already loaded, initialize immediately
        loadParticles();
      } else {
        // Load particles.js dynamically
        const script = document.createElement('script');
        script.src = '/particles.min.js';
        script.async = false; // Load synchronously to ensure it's ready

        script.onload = () => {
          console.log('particles.js script loaded');
          // Give it a moment to initialize
          setTimeout(loadParticles, 50);
        };
        script.onerror = () => {
          console.error('Failed to load particles.js from /particles.min.js');
        };

        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src="/particles.min.js"]');
        if (!existingScript) {
          document.head.appendChild(script);
        } else {
          // Wait for existing script to load
          if (existingScript.hasAttribute('data-loaded')) {
            loadParticles();
          } else {
            existingScript.addEventListener('load', () => {
              setTimeout(loadParticles, 50);
            });
          }
        }
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      // Cleanup: Remove particles canvas when component unmounts
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        initializedRef.current = false;
      }
    };
  }, [id, config]);

  return (
    <div
      id={id}
      ref={containerRef}
      className={`${className || 'absolute inset-0'}`}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        ...style 
      }}
    >
      {/* Canvas will be added by particles.js with class 'particles-js-canvas-el' */}
    </div>
  );
}
