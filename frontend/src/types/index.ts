export interface RiskSignals {
  daysToExpiryDays: number;
  paymentHistoryDelinquent: boolean;
  noRenewalOfferYet: boolean;
  rentGrowthAboveMarket: boolean;
}

export interface ResidentRiskFlag {
  residentId: string;
  name: string;
  unitId: string;
  riskScore: number;
  riskTier: 'high' | 'medium' | 'low';
  daysToExpiry: number;
  signals: RiskSignals;
}

export interface CalculationResult {
  propertyId: string;
  calculatedAt: string;
  totalResidents: number;
  flaggedCount: number;
  riskTiers: {
    high: number;
    medium: number;
    low: number;
  };
  flags: ResidentRiskFlag[];
}

export type JobStatus = 'processing' | 'completed' | 'failed';

export interface JobState {
  jobId: string;
  status: JobStatus;
  propertyId: string;
  startedAt: string;
  completedAt?: string;
  result?: CalculationResult;
  error?: string;
}

export interface WebhookResponse {
  message: string;
  eventId: string;
  status: string;
}
