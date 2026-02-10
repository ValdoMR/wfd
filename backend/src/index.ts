import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { AppDataSource } from './config/data-source';
import renewalRiskRouter from './api/renewal-risk.router';
import { WebhookService } from './services/webhook.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1', renewalRiskRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

AppDataSource.initialize()
  .then(async () => {
    console.log('Database connected');

    await AppDataSource.runMigrations();
    console.log('Migrations executed');

    const webhookService = new WebhookService();
    cron.schedule('*/10 * * * * *', async () => {
      try {
        const processed = await webhookService.processRetries();
        if (processed > 0) {
          console.log(`Processed ${processed} webhook retries`);
        }
      } catch (err) {
        console.error('Webhook retry cron error:', err);
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
