import { Loader2 } from 'lucide-react';
import { SignatureCard } from './SignatureCard';

export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center p-8"
      style={{ width: '100vw', height: '100vh' }}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <SignatureCard className="p-12 w-full" showLayers={false} showParticles={false}>
          <div className="flex flex-col items-center gap-6">
            <Loader2 className="w-12 h-12 text-white" />
            <div className="text-center">
              <p className="text-xl mb-2 text-white font-semibold">
                Loading RepoVerse…
              </p>
              <p className="text-sm text-gray-400">
                Preparing your GitHub recommendations.
              </p>
            </div>
          </div>
        </SignatureCard>

        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <img
              src="/logo.png"
              alt="RepoVerse Logo"
              className="h-16 w-16 md:h-20 md:w-20 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">RepoVerse</h1>
          <p className="text-gray-400 text-sm">
            Discover the right GitHub repositories for your next feature.
          </p>
        </div>
      </div>
    </div>
  );
}