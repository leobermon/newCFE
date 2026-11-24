<script setup lang="ts">
defineProps<{
  name:
    | 'subestaciones'
    | 'directorio'
    | 'otn'
    | 'eci'
    | 'oplat'
    | 'r3'
    | 'rdo-zot'
    | 'fo-grtp'
    | 'ultima-milla'
    | 'estatus'
    | 'redes'
}>()
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round">
    <!-- Subestaciones: torre de transmisión -->
    <g v-if="name === 'subestaciones'">
      <path d="M12 2 6 22M12 2l6 20M8 9h8M6.5 15h11M12 2v20" />
      <circle cx="8" cy="9" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
    </g>

    <!-- Directorio telefónico: auricular -->
    <path
      v-else-if="name === 'directorio'"
      d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.2 2.2z"
    />

    <!-- Enlaces OTN: cadena / enlace -->
    <g v-else-if="name === 'otn'">
      <path
        d="M9.5 14.5l5-5M8.3 11.7a3.5 3.5 0 010-5l1.7-1.7a3.5 3.5 0 015 5l-.9.9M15.7 12.3a3.5 3.5 0 010 5l-1.7 1.7a3.5 3.5 0 01-5-5l.9-.9"
      />
    </g>

    <!-- Enlaces ECI: intercambio -->
    <g v-else-if="name === 'eci'">
      <path d="M4 8h13M17 8l-3-3M17 8l-3 3" />
      <path d="M20 16H7M7 16l3 3M7 16l3-3" />
    </g>

    <!-- Enlaces OPLAT: señal -->
    <g v-else-if="name === 'oplat'">
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M8.8 9.3a5 5 0 000 5.4M15.2 9.3a5 5 0 010 5.4" />
      <path d="M5.8 6.3a9.5 9.5 0 000 11.4M18.2 6.3a9.5 9.5 0 010 11.4" />
    </g>

    <!-- Equipos R3: rack de servidores -->
    <g v-else-if="name === 'r3'">
      <rect x="5" y="4" width="14" height="6" rx="1" />
      <rect x="5" y="13.5" width="14" height="6" rx="1" />
      <circle cx="8" cy="7" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M11.5 7h4M11.5 16.5h4" />
    </g>

    <!-- Diagrama RDO ZOT: nodos conectados -->
    <g v-else-if="name === 'rdo-zot'">
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="19" r="2" />
      <path d="M8 6h8M7.3 7.8 11 17.3M16.7 7.8 13 17.3" />
    </g>

    <!-- Enlaces F.O GRTP: fibra óptica -->
    <g v-else-if="name === 'fo-grtp'">
      <path d="M3 18c4-9 7-9 9-9s5 9 9 9" />
      <circle cx="20.5" cy="5.5" r="2" />
    </g>

    <!-- Última milla: torre a domicilio -->
    <g v-else-if="name === 'ultima-milla'">
      <path d="M3 21h6v-8l-3-3-3 3z" />
      <path d="M21 21h-4V9l2-2 2 2z" />
      <path d="M9 17.5h8" />
    </g>

    <!-- Estatus equipos: check de estado -->
    <g v-else-if="name === 'estatus'">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5" />
    </g>

    <!-- Redes por subestación: router con equipos conectados -->
    <g v-else-if="name === 'redes'">
      <rect x="8.5" y="3" width="7" height="5" rx="1" />
      <rect x="2.5" y="16" width="7" height="5" rx="1" />
      <rect x="14.5" y="16" width="7" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </g>
  </svg>
</template>
