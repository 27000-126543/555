import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum StreetLightStatus {
  NORMAL = 'normal',
  FAULT = 'fault',
  MAINTAINING = 'maintaining',
}

@Entity('street_lights')
export class StreetLight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  area: string;

  @Column()
  address: string;

  @Column({ type: 'float', nullable: true })
  lng: number;

  @Column({ type: 'float', nullable: true })
  lat: number;

  @Column({ nullable: true })
  model: string;

  @Column({ type: 'date', nullable: true })
  installDate: Date;

  @Column({
    type: 'enum',
    enum: StreetLightStatus,
    default: StreetLightStatus.NORMAL,
  })
  status: StreetLightStatus;

  @Column({ type: 'int', default: 100 })
  brightness: number;

  @Column({ type: 'float', default: 0 })
  power: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
