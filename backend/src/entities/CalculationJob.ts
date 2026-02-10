import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('calculation_jobs')
export class CalculationJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  property_id!: string;

  @Column({ type: 'text' })
  as_of_date!: string;

  @Index()
  @Column({ type: 'text', default: 'processing' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn()
  started_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at!: Date | null;

  @UpdateDateColumn()
  updated_at!: Date;
}
