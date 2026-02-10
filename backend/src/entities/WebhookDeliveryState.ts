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

@Entity('webhook_delivery_state')
export class WebhookDeliveryState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_webhook_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.webhook_delivery_states)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ type: 'uuid' })
  resident_id!: string;

  @ManyToOne(() => Resident, (r) => r.webhook_delivery_states)
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident;

  @Column({ type: 'varchar', length: 100 })
  event_type!: string;

  @Index('idx_webhook_event_id', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  event_id!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Index('idx_webhook_status')
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: string;

  @Column({ type: 'int', default: 0 })
  attempt_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  last_attempt_at!: Date | null;

  @Index('idx_webhook_next_retry_at')
  @Column({ type: 'timestamp', nullable: true })
  next_retry_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  rms_response!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
