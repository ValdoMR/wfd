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
  Unique,
} from 'typeorm';
import { Property } from './Property';
import { UnitType } from './UnitType';
import { Resident } from './Resident';
import { Lease } from './Lease';
import { UnitPricing } from './UnitPricing';

@Entity('units')
@Unique(['property', 'unit_number'])
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_units_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.units)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ type: 'uuid' })
  unit_type_id!: string;

  @ManyToOne(() => UnitType, (ut) => ut.units)
  @JoinColumn({ name: 'unit_type_id' })
  unit_type!: UnitType;

  @Column({ type: 'varchar', length: 50 })
  unit_number!: string;

  @Column({ type: 'int', nullable: true })
  floor!: number | null;

  @Index('idx_units_status')
  @Column({ type: 'varchar', length: 50, default: 'available' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Resident, (r) => r.unit)
  residents!: Resident[];

  @OneToMany(() => Lease, (l) => l.unit)
  leases!: Lease[];

  @OneToMany(() => UnitPricing, (up) => up.unit)
  pricing!: UnitPricing[];
}
