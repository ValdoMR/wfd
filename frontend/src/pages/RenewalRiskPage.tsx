import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  calculateRisk,
  getJobStatus,
  triggerRenewalEvent,
} from '../api/client';
import { RiskTable } from '../components/RiskTable';
import type { ResidentRiskFlag } from '../types';

const POLL_INTERVAL_MS = 2000;

export const RenewalRiskPage: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [residents, setResidents] = useState<ResidentRiskFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const fetchRiskData = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/properties/${propertyId}/renewal-risk`,
      );
      if (!response.ok) throw new Error('Failed to fetch risk data');
      const data = await response.json();
      setResidents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        fetchRiskData();
        if (status.status === 'completed') {
          setJobId(null);
          setIsCalculating(false);
        } else if (status.status === 'failed') {
          setJobId(null);
          setIsCalculating(false);
          setError(status.error || 'Calculation failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [jobId, fetchRiskData]);

  const handleCalculate = async () => {
    if (!propertyId) return;
    try {
      setIsCalculating(true);
      setError(null);
      // Use today's date for calculation
      const asOfDate = new Date().toISOString().split('T')[0];
      const { jobId } = await calculateRisk(propertyId, asOfDate);
      setJobId(jobId);
    } catch (err) {
      setIsCalculating(false);
      setError(
        err instanceof Error ? err.message : 'Failed to start calculation',
      );
    }
  };

  const handleTriggerEvent = async (residentId: string) => {
    if (!propertyId) return;
    await triggerRenewalEvent(propertyId, residentId);
    // Optionally show a toast or notification here
    alert(`Renewal event triggered for resident ${residentId}`);
  };

  if (!propertyId)
    return <div className="p-8 text-red-600">Property ID is required</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Renewal Risk Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Property:{' '}
              <span className="font-mono font-medium text-gray-700">
                {propertyId}
              </span>
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isCalculating
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
            >
              {isCalculating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Calculating...
                </>
              ) : (
                'Calculate New Risk Scores'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && !residents.length ? (
          <div className="flex justify-center items-center h-64">
            <svg
              className="animate-spin h-8 w-8 text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <RiskTable
              residents={residents}
              onTriggerEvent={handleTriggerEvent}
            />
          </div>
        )}
      </div>
    </div>
  );
};
