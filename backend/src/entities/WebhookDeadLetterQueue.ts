import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WebhookDeliveryState } from './WebhookDeliveryState';

@Entity('webhook_dead_letter_queue')
export class WebhookDeadLetterQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  webhook_delivery_state_id!: string;

  @ManyToOne(() => WebhookDeliveryState)
  @JoinColumn({ name: 'webhook_delivery_state_id' })
  webhook_delivery_state!: WebhookDeliveryState;

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @CreateDateColumn()
  created_at!: Date;
}
