<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number | string;
    animated?: boolean;
    showBadge?: boolean;
  }>(),
  {
    size: 38,
    animated: true,
    showBadge: false,
  }
);
</script>

<template>
  <div class="relative inline-flex items-center justify-center shrink-0 group select-none">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="transition-transform duration-300 group-hover:scale-105"
    >
      <defs>
        <!-- Lotso Strawberry Gradient -->
        <linearGradient id="lotsoGradComponent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="50%" stop-color="#f43f5e" />
          <stop offset="100%" stop-color="#be185d" />
        </linearGradient>

        <!-- Dark Stealth Ear / Mask Gradient -->
        <linearGradient id="stealthGradComponent" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>

        <!-- Radar Glow Eye (Cyan / Electric) -->
        <linearGradient id="eyeGlowComponent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#818cf8" />
        </linearGradient>

        <!-- Filter Glow -->
        <filter id="glowComponent" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- Background Shield (Dark Stealth Container) -->
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="#0b0f17"
        class="stroke-rose-500/40 dark:stroke-rose-500/50"
        stroke-width="2.5"
      />

      <!-- Bear Ears Outer -->
      <circle cx="27" cy="27" r="14" fill="url(#lotsoGradComponent)" />
      <circle cx="73" cy="27" r="14" fill="url(#lotsoGradComponent)" />

      <!-- Bear Ears Inner (Dark Stealth) -->
      <circle cx="27" cy="27" r="8" fill="url(#stealthGradComponent)" />
      <circle cx="73" cy="27" r="8" fill="url(#stealthGradComponent)" />

      <!-- Main Bear Head -->
      <ellipse cx="50" cy="56" rx="34" ry="30" fill="url(#lotsoGradComponent)" />

      <!-- Snout Area -->
      <ellipse cx="50" cy="65" rx="19" ry="14" fill="#ffe4e6" />

      <!-- Strawberry-shaped Teddy Nose -->
      <path
        d="M44 60 C44 58, 56 58, 56 60 C56 64, 52 68, 50 68 C48 68, 44 64, 44 60 Z"
        fill="#9f1239"
      />

      <!-- Vicious / Cunning Smile (Asymmetrical sly smirk) -->
      <path
        d="M46 69 Q50 72 56 69"
        stroke="#881337"
        stroke-width="2.2"
        stroke-linecap="round"
        fill="none"
      />

      <!-- Slanted Eyebrows (Stealth & Predator focus) -->
      <path
        d="M27 40 Q38 35 44 41"
        stroke="#0f172a"
        stroke-width="2.8"
        stroke-linecap="round"
        fill="none"
      />
      <path
        d="M73 40 Q62 35 56 41"
        stroke="#0f172a"
        stroke-width="2.8"
        stroke-linecap="round"
        fill="none"
      />

      <!-- Slanted Calculating Eyes -->
      <path d="M30 48 Q39 42 43 47 Q38 52 30 48 Z" fill="#0f172a" />
      <path d="M70 48 Q61 42 57 47 Q62 52 70 48 Z" fill="#0f172a" />

      <!-- Radar Glowing Pupils -->
      <circle
        cx="37"
        cy="47"
        r="2.5"
        fill="url(#eyeGlowComponent)"
        filter="url(#glowComponent)"
      />
      <circle
        cx="63"
        cy="47"
        r="2.5"
        fill="url(#eyeGlowComponent)"
        filter="url(#glowComponent)"
      />

      <!-- Stealth Radar Ping Indicator (Animated) -->
      <g v-if="animated" class="animate-pulse">
        <circle cx="82" cy="18" r="3" fill="#38bdf8" filter="url(#glowComponent)" />
        <circle cx="82" cy="18" r="6" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.6" fill="none" />
      </g>
    </svg>

    <!-- Optional Stealth Badge -->
    <span
      v-if="showBadge"
      class="absolute -bottom-1 -right-1 text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/40 uppercase tracking-tighter"
    >
      RADAR
    </span>
  </div>
</template>