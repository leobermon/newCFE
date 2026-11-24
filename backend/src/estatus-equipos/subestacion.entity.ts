import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subestaciones')
export class Subestacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 260, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  alias: string | null;

  @Column({ type: 'tinyint', nullable: true })
  active: number | null;
}
