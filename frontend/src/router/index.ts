import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { subestacionesApi } from '@/services/api'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const sections = [
  { path: '/enlaces-otn', name: 'enlaces-otn', title: 'ENLACES OTN' },
  { path: '/enlaces-oplat', name: 'enlaces-oplat', title: 'ENLACES OPLAT' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/directorio-telefonico',
      name: 'directorio-telefonico',
      component: () => import('../views/DirectorioView.vue'),
    },
    {
      path: '/equipos-r3',
      name: 'equipos-r3',
      component: () => import('../views/R3View.vue'),
    },
    {
      path: '/estatus-equipos',
      name: 'estatus-equipos',
      component: () => import('../views/EstatusEquiposView.vue'),
    },
    {
      path: '/subestaciones',
      name: 'subestaciones',
      component: () => import('../views/SubestacionesView.vue'),
    },
    {
      path: '/subestaciones/:alias/:tipo',
      name: 'subestacion-instalacion',
      component: () => import('../views/SectionView.vue'),
    },
    {
      path: '/redes',
      name: 'redes',
      component: () => import('../views/RedesView.vue'),
    },
    {
      path: '/agregar-equipos',
      name: 'agregar-equipos',
      component: () => import('../views/AgregarEquiposView.vue'),
    },
    {
      path: '/ultima-milla',
      name: 'ultima-milla',
      component: () => import('../views/UltimaMillaView.vue'),
    },
    {
      path: '/ultima-milla/cancun',
      name: 'ultima-milla-cancun',
      component: () => import('../views/UltimaMillaCancunView.vue'),
    },
    {
      path: '/ultima-milla/:ruta(tulum-agencia|tulum-pcn)',
      name: 'ultima-milla-tulum',
      component: () => import('../views/UltimaMillaTulumView.vue'),
    },
    {
      path: '/rack/:id',
      name: 'rack',
      component: () => import('../views/RackView.vue'),
    },
    // QR ya impresos apuntan a /diagramas/rack/x; la ruta que queda fija es /rack/x.
    {
      path: '/diagramas/rack/:id',
      redirect: (to) => ({ name: 'rack', params: { id: to.params.id }, query: to.query, hash: to.hash }),
    },
    {
      path: '/equipo/:id',
      name: 'equipo',
      component: () => import('../views/EquipoView.vue'),
    },
    // Diagrama de la caseta: /diagramas/NIZ (hay links externos que apuntan aquí).
    {
      path: '/diagramas/:alias',
      name: 'subestacion-diagrama',
      component: () => import('../views/SubestacionDiagramaView.vue'),
    },
    // /plano/2 → el 2 es el id de la subestación en MySQL (2 = TIN), o sea /diagramas/TIN.
    {
      path: '/plano/:id(\\d+)',
      name: 'plano-por-id',
      component: () => import('../views/SubestacionDiagramaView.vue'),
      beforeEnter: async (to) => {
        try {
          const sub = (await subestacionesApi.list()).find((s) => String(s.id) === to.params.id)
          if (sub?.alias) return { name: 'subestacion-diagrama', params: { alias: sub.alias }, query: to.query, hash: to.hash, replace: true }
        } catch {
          // Sin backend no se puede resolver el id: se manda a la lista.
        }
        return { name: 'subestaciones', replace: true }
      },
    },
    // Ruta anterior: se conserva por si quedó guardada en algún marcador.
    {
      path: '/subestaciones/:alias/diagrama',
      redirect: (to) => ({ name: 'subestacion-diagrama', params: { alias: to.params.alias }, query: to.query }),
    },
    ...sections.map((section) => ({
      path: section.path,
      name: section.name,
      component: () => import('../views/SectionView.vue'),
      meta: { title: section.title },
    })),
    {
      path: '/items',
      name: 'items',
      component: () => import('../views/ItemsView.vue'),
    },
  ],
})

export default router
