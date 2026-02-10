import React from 'react';

interface RiskBadgeProps {
  tier: 'high' | 'medium' | 'low';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ tier }) => {
  const colors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const label = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[tier]}`}
    >
      {label}
    </span>
  );
};
