import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from './Property';
import { Resident } from './Resident';

@Entity('resident_ledger')
export class ResidentLedger {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_resident_ledger_property_id')
  @Column({ type: 'uuid' })
  property_id!: string;

  @ManyToOne(() => Property, (p) => p.ledger_entries)
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Index('idx_resident_ledger_resident_id')
  @Column({ type: 'uuid' })
  resident_id!: string;

  @ManyToOne(() => Resident, (r) => r.ledger_entries)
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident;

  @Index('idx_resident_ledger_transaction_type')
  @Column({ type: 'varchar', length: 50 })
  transaction_type!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  charge_code!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Index('idx_resident_ledger_transaction_date')
  @Column({ type: 'date' })
  transaction_date!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
