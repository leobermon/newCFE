import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('directorio')
export class Directorio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellido: string | null;

  @Column({ type: 'int', nullable: true })
  puesto: number | null;

  @Column({ type: 'int', nullable: true })
  extension: number | null;

  @Column({ type: 'int', nullable: true })
  departamento: number | null;
}
