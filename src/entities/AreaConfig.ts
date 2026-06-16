import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('area_configs')
export class AreaConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  areaName: string;

  @Column({ type: 'time' })
  lightOnTime: string;

  @Column({ type: 'time' })
  lightOffTime: string;

  @Column({ type: 'float', default: 0 })
  dailyEnergyBudget: number;

  @Column({ type: 'float', default: 0 })
  monthlyEnergyBudget: number;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ nullable: true })
  lockReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
