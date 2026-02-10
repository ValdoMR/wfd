import React from 'react';
import type { ResidentRiskFlag } from '../types';
import { RiskBadge } from './RiskBadge';
import { SignalsDetail } from './SignalsDetail';

interface RiskTableProps {
  residents: ResidentRiskFlag[];
  onTriggerEvent?: (residentId: string) => Promise<void>;
}

export const RiskTable: React.FC<RiskTableProps> = ({
  residents,
  onTriggerEvent,
}) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set(),
  );
  const [triggering, setTriggering] = React.useState<Set<string>>(new Set());

  const toggleRow = (residentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (expandedRows.has(residentId)) {
      newExpanded.delete(residentId);
    } else {
      newExpanded.add(residentId);
    }
    setExpandedRows(newExpanded);
  };

  const handleTrigger = async (e: React.MouseEvent, residentId: string) => {
    e.stopPropagation();
    if (onTriggerEvent) {
      setTriggering((prev) => new Set(prev).add(residentId));
      try {
        await onTriggerEvent(residentId);
      } finally {
        setTriggering((prev) => {
          const next = new Set(prev);
          next.delete(residentId);
          return next;
        });
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Resident
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Days to Expiry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tier
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {residents.map((resident) => (
            <React.Fragment key={resident.residentId}>
              <tr
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleRow(resident.residentId)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {resident.name}
                  <div className="text-xs text-gray-400">
                    ID: {resident.residentId}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {resident.unitId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {resident.daysToExpiry}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="font-bold mr-2">{resident.riskScore}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          resident.riskScore > 70
                            ? 'bg-red-600'
                            : resident.riskScore > 40
                              ? 'bg-yellow-400'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${resident.riskScore}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RiskBadge tier={resident.riskTier} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => handleTrigger(e, resident.residentId)}
                    disabled={triggering.has(resident.residentId)}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      triggering.has(resident.residentId)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                    }`}
                  >
                    {triggering.has(resident.residentId)
                      ? 'Triggering...'
                      : 'Trigger Renewal Event'}
                  </button>
                </td>
              </tr>
              {expandedRows.has(resident.residentId) && (
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-6 py-4">
                    <SignalsDetail signals={resident.signals} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {residents.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                No risky residents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
