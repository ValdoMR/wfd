import { AppDataSource } from '../config/data-source';
import { WebhookDeliveryState } from '../entities/WebhookDeliveryState';
import { WebhookDeadLetterQueue } from '../entities/WebhookDeadLetterQueue';
import { RenewalRiskScore } from '../entities/RenewalRiskScore';
import { Resident } from '../entities/Resident';
import { RenewalOffer } from '../entities/RenewalOffer';
import { Lease } from '../entities/Lease';

const MAX_RETRIES = parseInt(process.env.WEBHOOK_MAX_RETRIES || '5');
const RMS_WEBHOOK_URL =
  process.env.RMS_WEBHOOK_URL || 'http://localhost:3001/webhook';

export class WebhookService {
  private deliveryRepo = AppDataSource.getRepository(WebhookDeliveryState);
  private dlqRepo = AppDataSource.getRepository(WebhookDeadLetterQueue);
  private riskScoreRepo = AppDataSource.getRepository(RenewalRiskScore);
  private residentRepo = AppDataSource.getRepository(Resident);
  private renewalOfferRepo = AppDataSource.getRepository(RenewalOffer);
  private leaseRepo = AppDataSource.getRepository(Lease);

  async triggerRenewalEvent(propertyId: string, residentId: string) {
    const resident = await this.residentRepo.findOneBy({
      id: residentId,
      property_id: propertyId,
    });
    if (!resident) {
      throw new Error('Resident not found');
    }

    const latestScore = await this.riskScoreRepo.findOne({
      where: { property_id: propertyId, resident_id: residentId },
      order: { calculated_at: 'DESC' },
    });

    if (!latestScore) {
      throw new Error(
        'No risk score found for this resident. Run calculation first.',
      );
    }

    const eventId = `evt-${propertyId}-${residentId}-${latestScore.calculated_at.getTime()}`;

    const existing = await this.deliveryRepo.findOneBy({ event_id: eventId });
    if (existing) {
      if (existing.status === 'delivered') {
        return {
          message: 'Event already delivered',
          eventId,
          status: existing.status,
        };
      }

      // Reset failed/dlq events for re-delivery
      existing.status = 'pending';
      existing.attempt_count = 0;
      existing.next_retry_at = new Date();
      existing.rms_response = null;
      await this.deliveryRepo.save(existing);
      await this.attemptDelivery(existing);

      return {
        message: 'Event re-queued for delivery',
        eventId,
        status: existing.status,
      };
    }

    const payload = {
      event: 'renewal.risk_flagged',
      eventId,
      timestamp: new Date().toISOString(),
      propertyId,
      residentId,
      data: {
        riskScore: latestScore.risk_score,
        riskTier: latestScore.risk_tier,
        daysToExpiry: latestScore.days_to_expiry,
        signals: latestScore.signals,
      },
    };

    const delivery = this.deliveryRepo.create({
      property_id: propertyId,
      resident_id: residentId,
      event_type: 'renewal.risk_flagged',
      event_id: eventId,
      payload,
      status: 'pending',
      attempt_count: 0,
      next_retry_at: new Date(),
    });

    await this.deliveryRepo.save(delivery);

    await this.attemptDelivery(delivery);

    return {
      message: 'Webhook event created',
      eventId,
      status: delivery.status,
    };
  }

  async attemptDelivery(delivery: WebhookDeliveryState): Promise<void> {
    try {
      const response = await fetch(RMS_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event-Id': delivery.event_id,
          'X-Webhook-Timestamp': new Date().toISOString(),
        },
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(5000),
      });

      delivery.attempt_count += 1;
      delivery.last_attempt_at = new Date();

      if (response.ok) {
        delivery.status = 'delivered';
        delivery.rms_response = await response.text();
        delivery.next_retry_at = null;

        await this.createRenewalOffer(delivery);
      } else {
        const responseText = await response.text();
        delivery.rms_response = `${response.status}: ${responseText}`;
        this.scheduleRetryOrDlq(delivery);
      }
    } catch (error: unknown) {
      delivery.attempt_count += 1;
      delivery.last_attempt_at = new Date();
      delivery.rms_response =
        error instanceof Error ? error.message : 'Unknown error';
      this.scheduleRetryOrDlq(delivery);
    }

    await this.deliveryRepo.save(delivery);
  }

  private async createRenewalOffer(
    delivery: WebhookDeliveryState,
  ): Promise<void> {
    const activeLease = await this.leaseRepo.findOne({
      where: {
        resident_id: delivery.resident_id,
        property_id: delivery.property_id,
        status: 'active',
      },
      order: { lease_end_date: 'DESC' },
    });

    if (!activeLease) return;

    const existingOffer = await this.renewalOfferRepo.findOneBy({
      resident_id: delivery.resident_id,
      lease_id: activeLease.id,
    });

    if (existingOffer) return;

    const offer = this.renewalOfferRepo.create({
      property_id: delivery.property_id,
      resident_id: delivery.resident_id,
      lease_id: activeLease.id,
      renewal_start_date: activeLease.lease_end_date,
      status: 'sent',
    });

    await this.renewalOfferRepo.save(offer);
  }

  private scheduleRetryOrDlq(delivery: WebhookDeliveryState): void {
    if (delivery.attempt_count >= MAX_RETRIES) {
      delivery.status = 'dlq';
      delivery.next_retry_at = null;

      const dlqEntry = this.dlqRepo.create({
        webhook_delivery_state_id: delivery.id,
        reason: `Max retries (${MAX_RETRIES}) exceeded. Last response: ${delivery.rms_response}`,
      });

      this.dlqRepo.save(dlqEntry);
    } else {
      delivery.status = 'failed';
      const backoffMs = Math.pow(2, delivery.attempt_count - 1) * 1000;
      delivery.next_retry_at = new Date(Date.now() + backoffMs);
    }
  }

  // QueryBuilder required here: find() does not support pessimistic locking or DB functions like NOW()
  async processRetries(): Promise<number> {
    const deliveries = await AppDataSource.manager.transaction(
      async (manager) => {
        return manager
          .getRepository(WebhookDeliveryState)
          .createQueryBuilder('delivery')
          .setLock('pessimistic_write_or_fail')
          .where('delivery.status IN (:...statuses)', {
            statuses: ['pending', 'failed'],
          })
          .andWhere('delivery.next_retry_at <= NOW()')
          .getMany();
      },
    );

    for (const delivery of deliveries) {
      await this.attemptDelivery(delivery);
    }

    return deliveries.length;
  }
}
