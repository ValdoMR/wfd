import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UnitType } from './UnitType';
import { Unit } from './Unit';
import { Resident } from './Resident';
import { Lease } from './Lease';
import { ResidentLedger } from './ResidentLedger';
import { RenewalOffer } from './RenewalOffer';
import { RenewalRiskScore } from './RenewalRiskScore';
import { WebhookDeliveryState } from './WebhookDeliveryState';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  zip_code!: string | null;

  @Index('idx_properties_status')
  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => UnitType, (ut) => ut.property)
  unit_types!: UnitType[];

  @OneToMany(() => Unit, (u) => u.property)
  units!: Unit[];

  @OneToMany(() => Resident, (r) => r.property)
  residents!: Resident[];

  @OneToMany(() => Lease, (l) => l.property)
  leases!: Lease[];

  @OneToMany(() => ResidentLedger, (rl) => rl.property)
  ledger_entries!: ResidentLedger[];

  @OneToMany(() => RenewalOffer, (ro) => ro.property)
  renewal_offers!: RenewalOffer[];

  @OneToMany(() => RenewalRiskScore, (rrs) => rrs.property)
  renewal_risk_scores!: RenewalRiskScore[];

  @OneToMany(() => WebhookDeliveryState, (wds) => wds.property)
  webhook_delivery_states!: WebhookDeliveryState[];
}
