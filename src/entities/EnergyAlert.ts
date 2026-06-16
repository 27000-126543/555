import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum AlertType {
  DAILY_OVER_BUDGET = 'daily_over_budget',
  MONTHLY_OVER_BUDGET = 'monthly_over_budget',
  ABNORMAL_CONSUMPTION = 'abnormal_consumption',
  DEVICE_FAULT = 'device_fault',
}

@Entity('energy_alerts')
export class EnergyAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  area: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  alertType: AlertType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'float' })
  threshold: number;

  @Column({ type: 'float' })
  actualValue: number;

  @Column({ default: false })
  isHandled: boolean;

  @Column({ nullable: true })
  handledBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'handledBy' })
  handler: User;

  @Column({ type: 'timestamp', nullable: true })
  handledAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
