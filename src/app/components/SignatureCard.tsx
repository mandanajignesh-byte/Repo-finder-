import { ReactNode } from 'react';

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
      <div
        className={`relative rounded-[20px] overflow-hidden border transition-all duration-200 ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: 'rgba(28,28,30,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          ...style,
        }}
        onClick={onClick}
      >
        <div className="relative">
          {children}
        </div>
      </div>
    </div>
  );
}
