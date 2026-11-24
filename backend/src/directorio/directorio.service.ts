import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Directorio } from './directorio.entity.js';

export interface ContactoDirectorio {
  id: number;
  nombre: string | null;
  apellido: string | null;
  extension: number | null;
  puesto: string | null;
  departamento: string | null;
}

@Injectable()
export class DirectorioService {
  constructor(
    @InjectRepository(Directorio, 'transmision')
    private readonly directorioRepository: Repository<Directorio>,
  ) {}

  async findAll(search?: string): Promise<ContactoDirectorio[]> {
    const query = this.directorioRepository
      .createQueryBuilder('d')
      .leftJoin('puestos', 'p', 'p.id = d.puesto')
      .leftJoin('departamento', 'dep', 'dep.id = d.departamento')
      .select([
        'd.id AS id',
        'd.nombre AS nombre',
        'd.apellido AS apellido',
        'd.extension AS extension',
        'p.nombre AS puesto',
        'dep.nombre AS departamento',
      ])
      .orderBy('d.nombre', 'ASC')
      .addOrderBy('d.apellido', 'ASC');

    if (search) {
      query.where('d.nombre LIKE :search OR d.apellido LIKE :search OR d.extension LIKE :search', {
        search: `%${search}%`,
      });
    }

    return query.getRawMany<ContactoDirectorio>();
  }
}
