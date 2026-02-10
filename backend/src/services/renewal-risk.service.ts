import { In } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Resident } from '../entities/Resident';
import { Lease } from '../entities/Lease';
import { RenewalOffer } from '../entities/RenewalOffer';
import { UnitPricing } from '../entities/UnitPricing';
import { ResidentLedger } from '../entities/ResidentLedger';
import { RenewalRiskScore, RiskSignals } from '../entities/RenewalRiskScore';
import { Property } from '../entities/Property';
import { CalculationJob } from '../entities/CalculationJob';

const CHUNK_SIZE = 100;

interface RiskScoreRecord {
  property_id: string;
  resident_id: string;
  lease_id: string;
  risk_score: number;
  risk_tier: string;
  days_to_expiry: number;
  signals: RiskSignals;
  calculated_at: Date;
}

export class RenewalRiskService {
  private propertyRepo = AppDataSource.getRepository(Property);
  private residentRepo = AppDataSource.getRepository(Resident);
  private leaseRepo = AppDataSource.getRepository(Lease);
  private renewalOfferRepo = AppDataSource.getRepository(RenewalOffer);
  private unitPricingRepo = AppDataSource.getRepository(UnitPricing);
  private ledgerRepo = AppDataSource.getRepository(ResidentLedger);
  private riskScoreRepo = AppDataSource.getRepository(RenewalRiskScore);
  private jobRepo = AppDataSource.getRepository(CalculationJob);

  async startCalculation(
    propertyId: string,
    asOfDate: string,
  ): Promise<string> {
    const property = await this.propertyRepo.findOneBy({ id: propertyId });
    if (!property) {
      throw new Error('Property not found');
    }

    const job = this.jobRepo.create({
      property_id: propertyId,
      as_of_date: asOfDate,
      status: 'processing',
    });
    await this.jobRepo.save(job);

    this.calculateRisk(propertyId, asOfDate, job.id).catch(async (error) => {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completed_at = new Date();
      await this.jobRepo.save(job);
    });

    return job.id;
  }

  async getJobStatus(jobId: string) {
    return this.jobRepo.findOneBy({ id: jobId });
  }

  private async calculateRisk(
    propertyId: string,
    asOfDate: string,
    jobId: string,
  ): Promise<void> {
    const referenceDate = new Date(asOfDate);

    const residents = await this.residentRepo.find({
      where: { property_id: propertyId, status: 'active' },
      relations: ['unit'],
    });

    const residentIds = residents.map((r) => r.id);
    if (residentIds.length === 0) {
      await this.completeJob(jobId);
      return;
    }

    // Batch load all related data in parallel
    const unitIds = residents.map((r) => r.unit_id);
    const [leases, renewalOffers, payments, unitPricings] = await Promise.all([
      this.leaseRepo.find({
        where: { resident_id: In(residentIds), status: 'active' },
      }),

      this.renewalOfferRepo.find({
        where: { resident_id: In(residentIds) },
      }),

      this.ledgerRepo.find({
        where: {
          resident_id: In(residentIds),
          transaction_type: 'payment',
          charge_code: 'rent',
        },
      }),

      this.unitPricingRepo.find({
        where: { unit_id: In(unitIds) },
        order: { effective_date: 'DESC' },
      }),
    ]);

    // Index data by resident/unit for O(1) lookups
    const leasesByResident = this.groupBy(leases, 'resident_id');
    const offersByResident = this.groupBy(renewalOffers, 'resident_id');
    const paymentsByResident = this.groupBy(payments, 'resident_id');
    const pricingByUnit = this.groupBy(unitPricings, 'unit_id');

    // Process residents in chunks to avoid memory spikes
    for (let i = 0; i < residents.length; i += CHUNK_SIZE) {
      const chunk = residents.slice(i, i + CHUNK_SIZE);
      const riskRecords: RiskScoreRecord[] = [];

      for (const resident of chunk) {
        const residentLeases = leasesByResident.get(resident.id) || [];
        const lease = residentLeases.sort(
          (a, b) =>
            new Date(b.lease_end_date).getTime() -
            new Date(a.lease_end_date).getTime(),
        )[0];

        if (!lease) continue;

        const leaseEndDate = new Date(lease.lease_end_date);
        const effectiveEndDate =
          lease.lease_type === 'month_to_month'
            ? this.getNextRenewalDate(leaseEndDate, referenceDate)
            : leaseEndDate;
        const daysToExpiry = Math.ceil(
          (effectiveEndDate.getTime() - referenceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const residentOffers = offersByResident.get(resident.id) || [];
        const noRenewalOfferYet = !residentOffers.some(
          (o) => o.lease_id === lease.id,
        );

        const residentPayments = paymentsByResident.get(resident.id) || [];
        const leaseStartDate = new Date(lease.lease_start_date);
        const monthsOnLease = Math.max(
          1,
          Math.ceil(
            (referenceDate.getTime() - leaseStartDate.getTime()) /
              (1000 * 60 * 60 * 24 * 30),
          ),
        );
        const paymentHistoryDelinquent =
          residentPayments.length < monthsOnLease;

        const unitPricingList = pricingByUnit.get(resident.unit_id) || [];
        const latestPricing = unitPricingList[0];
        const marketRent = latestPricing
          ? Number(latestPricing.market_rent)
          : null;
        const currentRent = Number(lease.monthly_rent);
        const rentGrowthAboveMarket =
          marketRent !== null ? marketRent > currentRent * 1.1 : false;

        const signals: RiskSignals = {
          daysToExpiryDays: daysToExpiry,
          paymentHistoryDelinquent,
          noRenewalOfferYet,
          rentGrowthAboveMarket,
        };

        const riskScore = this.computeScore(
          daysToExpiry,
          paymentHistoryDelinquent,
          noRenewalOfferYet,
          rentGrowthAboveMarket,
          lease.lease_type,
        );

        const riskTier = this.getTier(riskScore);

        riskRecords.push({
          property_id: propertyId,
          resident_id: resident.id,
          lease_id: lease.id,
          risk_score: riskScore,
          risk_tier: riskTier,
          days_to_expiry: daysToExpiry,
          signals,
          calculated_at: referenceDate,
        });
      }

      // Bulk upsert each chunk
      await this.riskScoreRepo.upsert(riskRecords, {
        conflictPaths: ['resident_id', 'calculated_at'],
        skipUpdateIfNoValuesChanged: true,
      });
    }

    await this.completeJob(jobId);
  }

  private async completeJob(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (job) {
      job.status = 'completed';
      job.completed_at = new Date();
      await this.jobRepo.save(job);
    }
  }

  async getLatestScores(propertyId: string) {
    const latest = await this.riskScoreRepo.findOne({
      where: { property_id: propertyId },
      order: { calculated_at: 'DESC' },
      select: ['calculated_at'],
    });

    if (!latest) return [];

    const scores = await this.riskScoreRepo.find({
      where: { property_id: propertyId, calculated_at: latest.calculated_at },
      relations: ['resident', 'resident.unit'],
      order: { risk_score: 'DESC' },
    });

    return scores.map((s) => ({
      residentId: s.resident_id,
      name: `${s.resident.first_name} ${s.resident.last_name}`,
      unitId: s.resident.unit.unit_number,
      riskScore: s.risk_score,
      riskTier: s.risk_tier,
      daysToExpiry: s.days_to_expiry,
      signals: s.signals,
    }));
  }

  private computeScore(
    daysToExpiry: number,
    paymentDelinquent: boolean,
    noRenewalOffer: boolean,
    rentAboveMarket: boolean,
    leaseType: string,
  ): number {
    let expiryScore: number;
    if (leaseType === 'month_to_month') {
      expiryScore = 70;
    } else {
      // [maxDaysToExpiry, riskScore] — first match wins, fallback to 5 if > 180 days
      const thresholds: [number, number][] = [
        [0, 100],
        [30, 95],
        [60, 80],
        [90, 60],
        [120, 40],
        [180, 20],
      ];

      expiryScore = thresholds.find(([days]) => daysToExpiry <= days)?.[1] ?? 5;
    }

    const delinquencyScore = paymentDelinquent ? 100 : 0;
    const renewalOfferScore = noRenewalOffer ? 100 : 0;
    const rentGrowthScore = rentAboveMarket ? 100 : 0;

    const weighted =
      expiryScore * 0.4 +
      delinquencyScore * 0.25 +
      renewalOfferScore * 0.2 +
      rentGrowthScore * 0.15;

    return Math.min(100, Math.round(weighted));
  }

  private getTier(score: number): string {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * For month-to-month leases, advances lease_end_date forward by months
   * until it exceeds referenceDate, returning the next renewal boundary.
   * Example: leaseEnd=2025-01-01, ref=2026-02-10 → returns 2026-03-01
   */
  private getNextRenewalDate(leaseEndDate: Date, referenceDate: Date): Date {
    const next = new Date(leaseEndDate);
    while (next <= referenceDate) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private groupBy<T>(items: T[], key: keyof T): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const k = String(item[key]);
      const list = map.get(k) || [];
      list.push(item);
      map.set(k, list);
    }
    return map;
  }
}
