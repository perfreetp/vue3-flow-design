<template>
  <div class="flow-minimap" ref="minimapRef" @mousedown="onMousedown">
    <div
      v-for="node in nodeList"
      :key="node.id"
      class="flow-minimap__node"
      :class="{ subflow: node.isSubflow }"
      :style="nodeStyle(node)"
    ></div>
    <div class="flow-minimap__viewport" :style="viewportStyle"></div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, PropType } from 'vue';
  import { INode } from '/@/type/index';

  const MAP_WIDTH = 180;
  const MAP_HEIGHT = 120;
  const PADDING = 60;

  const props = defineProps({
    nodeList: {
      type: Array as PropType<INode[]>,
      default: () => [],
    },
    pos: {
      type: Object as PropType<{ top: number; left: number }>,
      default: () => ({ top: 0, left: 0 }),
    },
    scale: {
      type: Number,
      default: 1,
    },
    scaleOrigin: {
      type: Object as PropType<{ x: number; y: number }>,
      default: () => ({ x: 0, y: 0 }),
    },
    areaWidth: {
      type: Number,
      default: 0,
    },
    areaHeight: {
      type: Number,
      default: 0,
    },
  });

  const emits = defineEmits(['moveTo']);

  const minimapRef = ref<HTMLElement>();

  // 视口在画布坐标系中的位置与尺寸
  const viewportCanvas = computed(() => {
    const s = props.scale;
    const o = props.scaleOrigin;
    return {
      x: o.x + (0 - props.pos.left - o.x) / s,
      y: o.y + (0 - props.pos.top - o.y) / s,
      w: props.areaWidth / s,
      h: props.areaHeight / s,
    };
  });

  // 内容边界（节点与视口的并集）
  const bounds = computed(() => {
    let minX = viewportCanvas.value.x;
    let minY = viewportCanvas.value.y;
    let maxX = viewportCanvas.value.x + viewportCanvas.value.w;
    let maxY = viewportCanvas.value.y + viewportCanvas.value.h;
    props.nodeList.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      maxX: maxX + PADDING,
      maxY: maxY + PADDING,
    };
  });

  const miniScale = computed(() => {
    const w = bounds.value.maxX - bounds.value.minX;
    const h = bounds.value.maxY - bounds.value.minY;
    return Math.min(MAP_WIDTH / w, MAP_HEIGHT / h);
  });

  function toMini(x: number, y: number) {
    return {
      x: (x - bounds.value.minX) * miniScale.value,
      y: (y - bounds.value.minY) * miniScale.value,
    };
  }

  function nodeStyle(node: INode) {
    const p = toMini(node.x, node.y);
    return {
      left: p.x + 'px',
      top: p.y + 'px',
      width: Math.max(node.width * miniScale.value, 3) + 'px',
      height: Math.max(node.height * miniScale.value, 3) + 'px',
    };
  }

  const viewportStyle = computed(() => {
    const p = toMini(viewportCanvas.value.x, viewportCanvas.value.y);
    return {
      left: p.x + 'px',
      top: p.y + 'px',
      width: viewportCanvas.value.w * miniScale.value + 'px',
      height: viewportCanvas.value.h * miniScale.value + 'px',
    };
  });

  // 小地图坐标转画布坐标
  function toCanvas(e: MouseEvent) {
    const rect = (minimapRef.value as HTMLElement).getBoundingClientRect();
    return {
      x: bounds.value.minX + (e.clientX - rect.left) / miniScale.value,
      y: bounds.value.minY + (e.clientY - rect.top) / miniScale.value,
    };
  }

  // 点击/拖拽定位视口
  function onMousedown(e: MouseEvent) {
    e.preventDefault();
    const point = toCanvas(e);
    const vp = viewportCanvas.value;
    // 记录点击位置与视口中心的偏移，拖拽时保持
    const offset = {
      x: point.x - (vp.x + vp.w / 2),
      y: point.y - (vp.y + vp.h / 2),
    };
    emits('moveTo', { x: point.x - offset.x, y: point.y - offset.y });
    const move = (ev: MouseEvent) => {
      const p = toCanvas(ev);
      emits('moveTo', { x: p.x - offset.x, y: p.y - offset.y });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }
</script>
