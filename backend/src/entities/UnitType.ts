import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { Property } from './Property';
import { Unit } from './Unit';

@Entity('unit_types')
@Unique(['property', 'name'])
export class UnitType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.unit_types)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', nullable: true })
  bedrooms!: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  bathrooms!: number | null;

  @Column({ type: 'int', nullable: true })
  square_footage!: number | null;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Unit, (u) => u.unit_type)
  units!: Unit[];
}
