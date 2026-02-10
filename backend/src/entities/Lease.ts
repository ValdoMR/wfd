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
import { Unit } from './Unit';

@Entity('leases')
export class Lease {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_leases_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.leases)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Index('idx_leases_resident_id')
  @Column({ type: 'uuid' })
  resident_id!: string;

  @ManyToOne(() => Resident, (r) => r.leases)
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident;

  @Column({ type: 'uuid' })
  unit_id!: string;

  @ManyToOne(() => Unit, (u) => u.leases)
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'date' })
  lease_start_date!: Date;

  @Index('idx_leases_lease_end_date')
  @Column({ type: 'date' })
  lease_end_date!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthly_rent!: number;

  @Column({ type: 'varchar', length: 50, default: 'fixed' })
  lease_type!: string;

  @Index('idx_leases_status')
  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
