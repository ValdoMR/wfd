import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRenewalRiskScoresTable1707500000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE renewal_risk_scores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        property_id UUID NOT NULL REFERENCES properties(id),
        resident_id UUID NOT NULL REFERENCES residents(id),
        lease_id UUID NOT NULL REFERENCES leases(id),
        risk_score INT NOT NULL,
        risk_tier TEXT NOT NULL,
        days_to_expiry INT NOT NULL,
        signals JSONB NOT NULL,
        calculated_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT UQ_renewal_risk_resident_calculated UNIQUE (resident_id, calculated_at)
      );

      CREATE INDEX idx_renewal_risk_property_id ON renewal_risk_scores(property_id);
      CREATE INDEX idx_renewal_risk_resident_id ON renewal_risk_scores(resident_id);
      CREATE INDEX idx_renewal_risk_tier ON renewal_risk_scores(risk_tier);
      CREATE INDEX idx_renewal_risk_calculated_at ON renewal_risk_scores(calculated_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS renewal_risk_scores`);
  }
}
