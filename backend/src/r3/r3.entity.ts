import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('r3')
export class R3 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  equipo: number | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  denominacion: string | null;

  @Column({ name: 'ubicacion_tecnica', type: 'varchar', length: 240, nullable: true })
  ubicacionTecnica: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  fabricante: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  serie: string | null;

  @Column({ name: 'activo_fijo', type: 'int', nullable: true })
  activoFijo: number | null;
}
