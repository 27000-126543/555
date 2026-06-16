import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkOrder } from './WorkOrder';
import { User } from './User';

export interface PartUsed {
  partId: string;
  partName: string;
  quantity: number;
  price: number;
}

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workOrderId: string;

  @ManyToOne(() => WorkOrder)
  @JoinColumn({ name: 'workOrderId' })
  workOrder: WorkOrder;

  @Column()
  maintainerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'maintainerId' })
  maintainer: User;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  photos: string[];

  @Column({ type: 'text', nullable: true })
  report: string;

  @Column({ type: 'json', nullable: true })
  partsUsed: PartUsed[];

  @CreateDateColumn()
  createdAt: Date;
}
