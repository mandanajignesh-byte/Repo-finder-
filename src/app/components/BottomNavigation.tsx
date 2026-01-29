import { Compass, TrendingUp, Bot, User, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  activeTab: 'discover' | 'trending' | 'agent' | 'profile' | 'support';
  onTabChange: (tab: 'discover' | 'trending' | 'agent' | 'profile' | 'support') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const navItems = [
    { id: 'discover' as const, icon: Compass, label: 'Explore' },
    { id: 'trending' as const, icon: TrendingUp, label: 'Trending' },
    { id: 'agent' as const, icon: Bot, label: 'Agent' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'support' as const, icon: Heart, label: 'Buy Me a Coffee' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex w-64 bg-black border-r border-gray-700 flex-col py-6"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/logo.png" 
              alt="RepoVerse Logo" 
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-white" style={{ fontWeight: 700 }}>RepoVerse</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">Navigate the GitHub universe</p>
        </motion.div>
        <nav className="flex-1 space-y-2 px-4">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                  isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:bg-gray-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-lg"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 relative z-10`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="font-medium relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </motion.div>

      {/* Mobile Bottom Navigation */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 px-8 py-4 z-50"
      >
        <div className="flex justify-around items-center">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 transition-colors relative ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
