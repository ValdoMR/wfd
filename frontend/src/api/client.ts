import type { JobState, WebhookResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function calculateRisk(
  propertyId: string,
  asOfDate: string,
): Promise<{ jobId: string; statusUrl: string }> {
  const response = await fetch(
    `${API_URL}/properties/${propertyId}/renewal-risk/calculate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ asOfDate }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start calculation');
  }

  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobState> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get job status');
  }

  return response.json();
}

export async function triggerRenewalEvent(
  propertyId: string,
  residentId: string,
): Promise<WebhookResponse> {
  const response = await fetch(
    `${API_URL}/properties/${propertyId}/residents/${residentId}/trigger-renewal-event`,
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to trigger renewal event');
  }

  return response.json();
}
