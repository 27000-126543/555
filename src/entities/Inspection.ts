import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { StreetLight } from './StreetLight';

export enum FaultLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  URGENT = 'urgent',
}

@Entity('inspections')
export class Inspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  inspectorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'inspectorId' })
  inspector: User;

  @Column()
  streetLightId: string;

  @ManyToOne(() => StreetLight)
  @JoinColumn({ name: 'streetLightId' })
  streetLight: StreetLight;

  @Column({ type: 'date' })
  inspectDate: Date;

  @Column({ nullable: true })
  faultType: string;

  @Column({
    type: 'enum',
    enum: FaultLevel,
    nullable: true,
  })
  faultLevel: FaultLevel;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  images: string[];

  @CreateDateColumn()
  createdAt: Date;
}
