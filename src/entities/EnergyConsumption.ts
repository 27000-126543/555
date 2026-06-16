import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StreetLight } from './StreetLight';

@Entity('energy_consumptions')
export class EnergyConsumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  streetLightId: string;

  @ManyToOne(() => StreetLight)
  @JoinColumn({ name: 'streetLightId' })
  streetLight: StreetLight;

  @Column()
  area: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'float', name: 'consumption' })
  consumption: number;

  @Column({ type: 'float', nullable: true })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
