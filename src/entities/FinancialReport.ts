import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('financial_reports')
export class FinancialReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reportMonth: string;

  @Column()
  area: string;

  @Column({ type: 'int', default: 0 })
  totalFaults: number;

  @Column({ type: 'float', default: 0 })
  averageRepairTime: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEnergyCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPartsCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalLaborCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: 'float', default: 0 })
  performanceScore: number;

  @CreateDateColumn()
  createdAt: Date;
}
