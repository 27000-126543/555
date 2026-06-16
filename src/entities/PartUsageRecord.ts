import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Part } from './Part';
import { WorkOrder } from './WorkOrder';
import { User } from './User';

@Entity('part_usage_records')
export class PartUsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  partId: string;

  @ManyToOne(() => Part)
  @JoinColumn({ name: 'partId' })
  part: Part;

  @Column()
  workOrderId: string;

  @ManyToOne(() => WorkOrder)
  @JoinColumn({ name: 'workOrderId' })
  workOrder: WorkOrder;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'timestamp' })
  usedAt: Date;

  @Column()
  maintainerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'maintainerId' })
  maintainer: User;

  @CreateDateColumn()
  createdAt: Date;
}
