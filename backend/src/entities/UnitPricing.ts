import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Unit } from './Unit';

@Entity('unit_pricing')
@Unique(['unit', 'effective_date'])
export class UnitPricing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_unit_pricing_unit_id')
  @Column({ type: 'uuid' })
  unit_id!: string;

  @ManyToOne(() => Unit, (u) => u.pricing)
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_rent!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  market_rent!: number;

  @Index('idx_unit_pricing_effective_date')
  @Column({ type: 'date' })
  effective_date!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
