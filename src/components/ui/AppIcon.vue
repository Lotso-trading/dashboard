<script setup lang="ts">
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    ArrowUpRight,
    BarChart3,
    Briefcase,
    Calendar,
    CalendarRange,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Clock,
    Coins,
    Cpu,
    ExternalLink,
    Filter,
    Gem,
    Globe,
    Info,
    Landmark,
    Layers,
    LayoutGrid,
    List,
    Minus,
    Monitor,
    Moon,
    Package,
    Pencil,
    Plus,
    RefreshCw,
    RotateCcw,
    Scale,
    ScrollText,
    Search,
    Server,
    Settings,
    Shield,
    SlidersHorizontal,
    Sparkles,
    Sun,
    Table,
    Target,
    Trash2,
    TrendingDown,
    TrendingUp,
    Trophy,
    Wallet,
    X,
    XCircle,
    Zap,
} from "lucide-vue-next";
import { type Component, computed } from "vue";

const ICON_MAP = {
    activity: Activity,
    "alert-triangle": AlertTriangle,
    "arrow-down": ArrowDown,
    "arrow-left": ArrowLeft,
    "arrow-right": ArrowRight,
    "arrow-up": ArrowUp,
    "arrow-up-down": ArrowUpDown,
    "arrow-up-right": ArrowUpRight,
    "bar-chart": BarChart3,
    briefcase: Briefcase,
    calendar: Calendar,
    "calendar-range": CalendarRange,
    check: Check,
    "check-circle": CheckCircle2,
    "chevron-left": ChevronLeft,
    "chevron-right": ChevronRight,
    "chevrons-left": ChevronsLeft,
    "chevrons-right": ChevronsRight,
    clock: Clock,
    coins: Coins,
    cpu: Cpu,
    "external-link": ExternalLink,
    filter: Filter,
    gem: Gem,
    globe: Globe,
    info: Info,
    landmark: Landmark,
    layers: Layers,
    "layout-grid": LayoutGrid,
    list: List,
    minus: Minus,
    monitor: Monitor,
    moon: Moon,
    package: Package,
    pencil: Pencil,
    plus: Plus,
    "refresh-cw": RefreshCw,
    "rotate-ccw": RotateCcw,
    scale: Scale,
    "scroll-text": ScrollText,
    search: Search,
    server: Server,
    settings: Settings,
    shield: Shield,
    sliders: SlidersHorizontal,
    sparkles: Sparkles,
    sun: Sun,
    table: Table,
    target: Target,
    trash: Trash2,
    "trending-down": TrendingDown,
    "trending-up": TrendingUp,
    trophy: Trophy,
    wallet: Wallet,
    x: X,
    "x-circle": XCircle,
    zap: Zap,
} as const satisfies Record<string, Component>;

export type IconName = keyof typeof ICON_MAP;

const props = withDefaults(
    defineProps<{
        name: IconName;
        size?: number;
        strokeWidth?: number;
    }>(),
    {
        size: 16,
        strokeWidth: 2,
    }
);

const iconComponent = computed<Component>(() => ICON_MAP[props.name]);
</script>

<template>
  <component
    :is="iconComponent"
    :size="size"
    :stroke-width="strokeWidth"
    class="shrink-0"
    aria-hidden="true"
  />
</template>
