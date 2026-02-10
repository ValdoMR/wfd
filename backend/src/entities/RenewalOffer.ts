import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from './Property';
import { Resident } from './Resident';
import { Lease } from './Lease';

@Entity('renewal_offers')
export class RenewalOffer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_renewal_offers_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.renewal_offers)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Index('idx_renewal_offers_resident_id')
  @Column({ type: 'uuid' })
  resident_id!: string;

  @ManyToOne(() => Resident, (r) => r.renewal_offers)
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident;

  @Column({ type: 'uuid' })
  lease_id!: string;

  @ManyToOne(() => Lease)
  @JoinColumn({ name: 'lease_id' })
  lease!: Lease;

  @Column({ type: 'date' })
  renewal_start_date!: Date;

  @Column({ type: 'date', nullable: true })
  renewal_end_date!: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  proposed_rent!: number | null;

  @Column({ type: 'date', nullable: true })
  offer_expiration_date!: Date | null;

  @Index('idx_renewal_offers_status')
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
