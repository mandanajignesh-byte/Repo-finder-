import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'swipe_hint_shown';

export function SwipeHintPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen the hint before
    const hasSeenHint = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!hasSeenHint) {
      // Show after a short delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShow(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-800 border-2 border-gray-600 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontWeight: 700 }}>
              How to Use
            </h2>
            
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center gap-3 justify-center">
                <div className="flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                  <span className="text-gray-100 font-bold">← Swipe Left</span>
                </div>
                <span className="text-sm">if you dislike</span>
              </div>
              
              <div className="flex items-center gap-3 justify-center">
                <div className="flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                  <span className="text-gray-100 font-bold">Swipe Right →</span>
                </div>
                <span className="text-sm">if you like</span>
              </div>
            </div>

            <p className="text-gray-400 text-sm mt-6">
              You can also use the Save button to bookmark repositories for later.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClose}
              className="mt-6 w-full px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors shadow-sm"
            >
              Got it!
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
