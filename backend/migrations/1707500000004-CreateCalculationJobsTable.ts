import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCalculationJobsTable1707500000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE calculation_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        property_id UUID NOT NULL REFERENCES properties(id),
        as_of_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        error TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_calc_jobs_property_id ON calculation_jobs(property_id);
      CREATE INDEX idx_calc_jobs_status ON calculation_jobs(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS calculation_jobs`);
  }
}
