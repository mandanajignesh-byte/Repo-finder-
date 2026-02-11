import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isPWAInstalled, promptInstallPWA, canInstallPWA, isInstallPromptAvailable, shouldShowIOSInstructions, isIOS } from '@/utils/pwa';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  show?: boolean; // External control to show/hide
}

export function PWAInstallPrompt({ onDismiss, show: externalShow }: PWAInstallPromptProps) {
  const [show, setShow] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const installed = isPWAInstalled();
    setIsInstalled(installed);

    // Check if iOS device
    const iosDevice = isIOS();
    setIsIOSDevice(iosDevice);
    const iosInstructions = shouldShowIOSInstructions();
    setShowIOSInstructions(iosInstructions);

    // Check if browser supports installation and prompt is available (Android)
    const supportsInstall = canInstallPWA();
    const promptAvailable = isInstallPromptAvailable();
    setCanInstall(supportsInstall && promptAvailable);

    // Use external show prop if provided
    if (externalShow !== undefined) {
      if (iosInstructions) {
        // For iOS, show instructions if not dismissed
        const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
        setShow(externalShow && !installed && !dismissed);
      } else {
        // For Android, show install prompt if available
        setShow(externalShow && !installed && supportsInstall && promptAvailable);
      }
    } else if (!installed) {
      if (iosInstructions) {
        // iOS: Check if user has dismissed instructions
        const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
        if (!dismissed) {
          setShow(true);
        }
      } else if (supportsInstall && promptAvailable) {
        // Android: Check if user has dismissed install prompt
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setShow(true);
        }
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
    // Remember dismissal (different keys for iOS vs Android)
    if (isIOSDevice) {
      localStorage.setItem('pwa-install-dismissed-ios', 'true');
    } else {
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
    onDismiss?.();
  };

  // Don't show if already installed
  if (isInstalled || !show) {
    return null;
  }

  // For iOS, show instructions even if canInstall is false
  if (isIOSDevice && showIOSInstructions) {
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
                  <h3 className="text-white font-semibold text-base mb-2">
                    Add RepoVerse to Home Screen
                  </h3>
                  <div className="text-[#A1A1A6] text-sm mb-3 space-y-2">
                    <p className="font-medium text-white mb-2">Follow these steps:</p>
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[#6D5EF6] font-bold">1.</span>
                        <span>Tap the <Share2 className="w-3 h-3 inline mx-0.5" /> Share button at the bottom</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[#6D5EF6] font-bold">2.</span>
                        <span>Scroll down and tap <Plus className="w-3 h-3 inline mx-0.5" /> "Add to Home Screen"</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-[#6D5EF6] font-bold">3.</span>
                        <span>Tap "Add" to install</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDismiss}
                      className="flex-1 bg-[#6D5EF6] hover:bg-[#5D4EE6] text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
                    >
                      Got it!
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

  // Android: Don't show if can't install
  if (!canInstall || !show) {
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
