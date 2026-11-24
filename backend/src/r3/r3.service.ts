import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { R3 } from './r3.entity.js';

@Injectable()
export class R3Service {
  constructor(
    @InjectRepository(R3, 'transmision')
    private readonly r3Repository: Repository<R3>,
  ) {}

  findAll(search?: string) {
    const query = this.r3Repository.createQueryBuilder('r').orderBy('r.denominacion', 'ASC');

    if (search) {
      query.where(
        'r.equipo LIKE :search OR r.denominacion LIKE :search OR r.ubicacion_tecnica LIKE :search OR r.fabricante LIKE :search OR r.serie LIKE :search OR r.activo_fijo LIKE :search',
        { search: `%${search}%` },
      );
    }

    return query.getMany();
  }
}
