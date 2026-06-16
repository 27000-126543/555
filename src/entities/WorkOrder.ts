import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Inspection } from './Inspection';
import { StreetLight } from './StreetLight';
import { User } from './User';
import { FaultLevel } from './Inspection';

export enum WorkOrderStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  VERIFIED = 'verified',
}

@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNo: string;

  @Column({ nullable: true })
  inspectionId: string;

  @ManyToOne(() => Inspection, { nullable: true })
  @JoinColumn({ name: 'inspectionId' })
  inspection: Inspection;

  @Column()
  streetLightId: string;

  @ManyToOne(() => StreetLight)
  @JoinColumn({ name: 'streetLightId' })
  streetLight: StreetLight;

  @Column({ nullable: true })
  maintainerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'maintainerId' })
  maintainer: User;

  @Column({ nullable: true })
  faultType: string;

  @Column({
    type: 'enum',
    enum: FaultLevel,
    nullable: true,
  })
  faultLevel: FaultLevel;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.PENDING,
  })
  status: WorkOrderStatus;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  partsCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  laborCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @CreateDateColumn()
  createdAt: Date;
}
