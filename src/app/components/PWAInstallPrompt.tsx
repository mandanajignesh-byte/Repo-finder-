import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isPWAInstalled, promptInstallPWA, canInstallPWA, isInstallPromptAvailable } from '@/utils/pwa';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  show?: boolean; // External control to show/hide
}

export function PWAInstallPrompt({ onDismiss, show: externalShow }: PWAInstallPromptProps) {
  const [show, setShow] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const installed = isPWAInstalled();
    setIsInstalled(installed);

    // Check if browser supports installation and prompt is available
    const supportsInstall = canInstallPWA();
    const promptAvailable = isInstallPromptAvailable();
    setCanInstall(supportsInstall && promptAvailable);

    // Use external show prop if provided, otherwise check localStorage
    if (externalShow !== undefined) {
      setShow(externalShow && !installed && supportsInstall && promptAvailable);
    } else if (!installed && supportsInstall && promptAvailable) {
      // Check if user has dismissed this before (stored in localStorage)
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShow(true);
      }
    }
  }, [externalShow]);

  const handleInstall = async () => {
    const success = await promptInstallPWA();
    if (success) {
      setShow(false);
      setIsInstalled(true);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Remember dismissal for this session (don't show again)
    localStorage.setItem('pwa-install-dismissed', 'true');
    onDismiss?.();
  };

  // Don't show if already installed or can't install
  if (isInstalled || !canInstall || !show) {
    return null;
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#6D5EF6]/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-[#6D5EF6]" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base mb-1">
                  Install RepoVerse
                </h3>
                <p className="text-[#A1A1A6] text-sm mb-3">
                  Add to your home screen for faster access and offline support
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="flex-1 bg-[#6D5EF6] hover:bg-[#5D4EE6] text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2.5 text-[#A1A1A6] hover:text-white rounded-xl text-sm transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#6E6E73] hover:text-white rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
