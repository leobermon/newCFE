# Proyecto

Monorepo con frontend en Vue 3 y backend en NestJS, conectados a MySQL.

```
/frontend   Vue 3 + Vite + TypeScript + Vue Router + Pinia
/backend    NestJS + TypeORM + MySQL
```

## Requisitos

- Node.js 22.18+ o 24.12+ (ya instalado)
- Una base de datos MySQL corriendo. Opciones:
  - **Docker** (recomendado): instala [Docker Desktop](https://www.docker.com/products/docker-desktop/) y ejecuta `docker compose up -d` desde la raíz. Esto levanta MySQL en `localhost:3306` con usuario `root` / password `root` y base de datos `mi_proyecto`.
  - **Instalación local**: instala MySQL Server y crea una base de datos llamada `mi_proyecto`. Ajusta las credenciales en `backend/.env`.

## Puesta en marcha

### 1. Base de datos

```bash
docker compose up -d
```

### 2. Backend (puerto 3000)

```bash
cd backend
npm run start:dev
```

Las variables de conexión están en `backend/.env` (copiado de `.env.example`). TypeORM tiene `synchronize: true` en desarrollo, así que las tablas se crean automáticamente a partir de las entidades (en `backend/src/**/*.entity.ts`).

Endpoint de ejemplo ya funcionando: `GET/POST/PATCH/DELETE http://localhost:3000/items`

### 3. Frontend (puerto 5173)

```bash
cd frontend
npm run dev
```

Abre `http://localhost:5173/items` para ver el CRUD de ejemplo consumiendo el backend.

## Siguientes pasos sugeridos

- Renombrar/borrar el módulo `items` de ejemplo y crear tus propias entidades en `backend/src/<nombre>/`.
- Añadir autenticación (`@nestjs/passport` + JWT) cuando la necesites.
- Definir variables de entorno de producción y desactivar `synchronize` en TypeORM (usar migraciones en su lugar).
