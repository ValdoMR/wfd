import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookDeliveryStateTable1707500000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE webhook_delivery_state (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        property_id UUID NOT NULL REFERENCES properties(id),
        resident_id UUID NOT NULL REFERENCES residents(id),
        event_type TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempt_count INT NOT NULL DEFAULT 0,
        last_attempt_at TIMESTAMP,
        next_retry_at TIMESTAMP,
        rms_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_webhook_property_id ON webhook_delivery_state(property_id);
      CREATE INDEX idx_webhook_event_id ON webhook_delivery_state(event_id);
      CREATE INDEX idx_webhook_status ON webhook_delivery_state(status);
      CREATE INDEX idx_webhook_next_retry_at ON webhook_delivery_state(next_retry_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_delivery_state`);
  }
}
