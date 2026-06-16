import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum NotificationType {
  WORK_ORDER = 'work_order',
  INSPECTION = 'inspection',
  ENERGY_ALERT = 'energy_alert',
  SYSTEM = 'system',
  MAINTENANCE = 'maintenance',
  REPORT = 'report',
}

export enum RelatedType {
  WORK_ORDER = 'work_order',
  INSPECTION = 'inspection',
  ENERGY_ALERT = 'energy_alert',
  MAINTENANCE_RECORD = 'maintenance_record',
  STREET_LIGHT = 'street_light',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  relatedId: string;

  @Column({
    type: 'enum',
    enum: RelatedType,
    nullable: true,
  })
  relatedType: RelatedType;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
