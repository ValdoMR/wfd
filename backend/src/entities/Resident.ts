import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Property } from './Property';
import { Unit } from './Unit';
import { Lease } from './Lease';
import { ResidentLedger } from './ResidentLedger';
import { RenewalOffer } from './RenewalOffer';
import { RenewalRiskScore } from './RenewalRiskScore';
import { WebhookDeliveryState } from './WebhookDeliveryState';

@Entity('residents')
export class Resident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_residents_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.residents)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Index('idx_residents_unit_id')
  @Column({ type: 'uuid' })
  unit_id!: string;

  @ManyToOne(() => Unit, (u) => u.residents)
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Index('idx_residents_status')
  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: string;

  @Column({ type: 'date', nullable: true })
  move_in_date!: Date | null;

  @Column({ type: 'date', nullable: true })
  move_out_date!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Lease, (l) => l.resident)
  leases!: Lease[];

  @OneToMany(() => ResidentLedger, (rl) => rl.resident)
  ledger_entries!: ResidentLedger[];

  @OneToMany(() => RenewalOffer, (ro) => ro.resident)
  renewal_offers!: RenewalOffer[];

  @OneToMany(() => RenewalRiskScore, (rrs) => rrs.resident)
  renewal_risk_scores!: RenewalRiskScore[];

  @OneToMany(() => WebhookDeliveryState, (wds) => wds.resident)
  webhook_delivery_states!: WebhookDeliveryState[];
}
