import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Property } from './Property';
import { Resident } from './Resident';
import { Lease } from './Lease';

export interface RiskSignals {
  daysToExpiryDays: number;
  paymentHistoryDelinquent: boolean;
  noRenewalOfferYet: boolean;
  rentGrowthAboveMarket: boolean;
}

@Entity('renewal_risk_scores')
@Unique(['resident_id', 'calculated_at'])
export class RenewalRiskScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_renewal_risk_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.renewal_risk_scores)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Index('idx_renewal_risk_resident_id')
  @Column({ type: 'uuid' })
  resident_id!: string;

  @ManyToOne(() => Resident, (r) => r.renewal_risk_scores)
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident;

  @Column({ type: 'uuid' })
  lease_id!: string;

  @ManyToOne(() => Lease)
  @JoinColumn({ name: 'lease_id' })
  lease!: Lease;

  @Column({ type: 'int' })
  risk_score!: number;

  @Index('idx_renewal_risk_tier')
  @Column({ type: 'varchar', length: 20 })
  risk_tier!: string;

  @Column({ type: 'int' })
  days_to_expiry!: number;

  @Column({ type: 'jsonb' })
  signals!: RiskSignals;

  @Index('idx_renewal_risk_calculated_at')
  @Column({ type: 'timestamp' })
  calculated_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
