import { Compass, TrendingUp, Bot, User, Heart } from 'lucide-react';

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
      <div className="hidden md:flex w-64 bg-black border-r border-gray-800 flex-col py-6">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/logo.png" 
              alt="RepoVerse Logo" 
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-white" style={{ fontWeight: 700 }}>RepoVerse</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Navigate GitHub repositories</p>
        </div>
        <nav className="flex-1 space-y-2 px-4">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors relative ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:bg-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 relative z-10`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="font-medium relative z-10">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-top border-gray-800 px-6 py-3 z-50">
        <div className="flex justify-around items-center">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 transition-colors relative ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                <div>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
