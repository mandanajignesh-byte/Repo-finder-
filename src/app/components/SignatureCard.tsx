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
        className={`relative rounded-[24px] shadow-md overflow-hidden bg-gray-900 border border-gray-700 ${className} ${
          onClick ? 'cursor-pointer' : ''
        }`}
        style={{
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
