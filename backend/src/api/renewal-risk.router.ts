import { Router, Request, Response } from 'express';
import { RenewalRiskService } from '../services/renewal-risk.service';
import { WebhookService } from '../services/webhook.service';

const router = Router();
const renewalRiskService = new RenewalRiskService();
const webhookService = new WebhookService();

router.post(
  '/properties/:propertyId/renewal-risk/calculate',
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.propertyId as string;
      const { asOfDate } = req.body;

      if (!asOfDate) {
        res.status(400).json({ error: 'asOfDate is required' });
        return;
      }

      const jobId = await renewalRiskService.startCalculation(
        propertyId,
        asOfDate,
      );

      res.status(202).json({
        message: 'Calculation started',
        jobId,
        statusUrl: `/api/v1/jobs/${jobId}`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      const status = message === 'Property not found' ? 404 : 500;
      res.status(status).json({ error: message });
    }
  },
);

router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const job = await renewalRiskService.getJobStatus(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});

router.get(
  '/properties/:propertyId/renewal-risk',
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.propertyId as string;
      const scores = await renewalRiskService.getLatestScores(propertyId);
      res.json(scores);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
);

router.post(
  '/properties/:propertyId/residents/:residentId/trigger-renewal-event',
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.propertyId as string;
      const residentId = req.params.residentId as string;
      const result = await webhookService.triggerRenewalEvent(
        propertyId,
        residentId,
      );
      res.json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Internal server error';
      const status =
        message === 'Resident not found' ||
        message.includes('No risk score found')
          ? 404
          : 500;
      res.status(status).json({ error: message });
    }
  },
);

export default router;
