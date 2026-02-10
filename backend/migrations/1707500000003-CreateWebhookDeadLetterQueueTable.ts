import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookDeadLetterQueueTable1707500000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE webhook_dead_letter_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_delivery_state_id UUID NOT NULL REFERENCES webhook_delivery_state(id),
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_dead_letter_queue`);
  }
}
