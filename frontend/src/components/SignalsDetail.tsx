import React from 'react';
import type { RiskSignals } from '../types';

interface SignalsDetailProps {
  signals: RiskSignals;
}

export const SignalsDetail: React.FC<SignalsDetailProps> = ({ signals }) => {
  return (
    <div className="text-sm">
      <h4 className="font-semibold text-gray-900 mb-2">
        Risk Signals Breakdown
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start">
          <span
            className={`mr-2 h-4 w-4 rounded-full ${
              signals.daysToExpiryDays < 90 ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
          <div>
            <span className="font-medium">Days to Expiry:</span>{' '}
            {signals.daysToExpiryDays} days
          </div>
        </div>

        <div className="flex items-start">
          <span
            className={`mr-2 h-4 w-4 rounded-full ${
              signals.paymentHistoryDelinquent ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
          <div>
            <span className="font-medium">Payment History:</span>{' '}
            {signals.paymentHistoryDelinquent ? 'Delinquent' : 'Good Standing'}
          </div>
        </div>

        <div className="flex items-start">
          <span
            className={`mr-2 h-4 w-4 rounded-full ${
              signals.noRenewalOfferYet ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
          <div>
            <span className="font-medium">Renewal Offer:</span>{' '}
            {signals.noRenewalOfferYet ? 'Not sent yet' : 'Offer Sent'}
          </div>
        </div>

        <div className="flex items-start">
          <span
            className={`mr-2 h-4 w-4 rounded-full ${
              signals.rentGrowthAboveMarket ? 'bg-red-500' : 'bg-green-500'
            }`}
          />
          <div>
            <span className="font-medium">Rent vs Market:</span>{' '}
            {signals.rentGrowthAboveMarket
              ? 'Significant Increase (>10%)'
              : 'Within Market Range'}
          </div>
        </div>
      </div>
    </div>
  );
};
