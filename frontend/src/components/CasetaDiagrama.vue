<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { PlanoCaseta, RackPlano } from '@/data/planosCaseta'

defineProps<{ plano: PlanoCaseta }>()

const router = useRouter()

function abrir(rack: RackPlano) {
  if (rack.href) router.push(`/${rack.href}`)
}
</script>

<template>
  <svg :viewBox="plano.viewBox" class="caseta" role="img">
    <rect
      v-for="(r, i) in plano.rects"
      :key="`r${i}`"
      :x="r.x"
      :y="r.y"
      :width="r.w"
      :height="r.h"
      :stroke-width="r.sw"
      class="pared"
    />
    <path
      v-for="(a, i) in plano.arcos"
      :key="`a${i}`"
      :d="a.d"
      :transform="`matrix(${a.transform})`"
      :stroke-width="a.sw"
      class="puerta"
    />

    <text
      v-for="(t, i) in plano.textos"
      :key="`t${i}`"
      :transform="`matrix(${t.transform})`"
      :font-size="t.size"
      :class="t.fuerte ? 'rotulo fuerte' : 'rotulo'"
    >
      <tspan v-for="(l, j) in t.lineas" :key="j" :x="l.x" :y="l.y">{{ l.t }}</tspan>
    </text>

    <g
      v-for="(k, i) in plano.racks"
      :key="`k${i}`"
      class="rack"
      :class="{ enlace: !!k.href, especial: k.especial }"
      :tabindex="k.href ? 0 : undefined"
      @click="abrir(k)"
      @keydown.enter="abrir(k)"
    >
      <rect :x="k.x" :y="k.y" :width="k.w" :height="k.h" :stroke-width="k.w * 0.12" />
      <text
        :x="k.x + k.w / 2"
        :y="k.y + k.h / 2 + k.w * 0.17"
        :font-size="k.w * 0.49"
        text-anchor="middle"
      >
        {{ k.id }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.caseta {
  display: block;
  height: calc(100vh - 8.5rem);
  max-width: 100%;
  width: auto;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.pared {
  fill: #fff;
  stroke: #6c6c6c;
}

.puerta {
  fill: none;
  stroke: #6c6c6c;
}

.rotulo {
  fill: #6c6c6c;
  font-family: Arial, sans-serif;
  white-space: pre;
}

.rotulo.fuerte {
  fill: #3e3e3e;
}

.rack rect {
  fill: #fff;
  stroke: #6c6c6c;
}

.rack.especial rect {
  fill: #cffafe;
}

.rack text {
  fill: #6c6c6c;
  font-family: Arial, sans-serif;
  pointer-events: none;
}

.rack.enlace {
  cursor: pointer;
  outline: none;
}

.rack.enlace:hover rect,
.rack.enlace:focus-visible rect {
  stroke: var(--cfe-green-dark);
  fill: #dcfce7;
}
</style>
