<template>
  <!-- 自定义拐点走线层 -->
  <svg v-if="customLinks.length" class="link-waypoint-layer" width="3000" height="3000">
    <defs>
      <template v-for="link in customLinks" :key="'mk-' + link.id">
        <marker
          :id="'wp-arrow-' + link.id"
          markerWidth="12"
          markerHeight="12"
          refX="9"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L0,8 L10,4 z" :fill="link.cls.linkColor" />
        </marker>
        <marker
          :id="'wp-arrow-s-' + link.id"
          markerWidth="12"
          markerHeight="12"
          refX="9"
          refY="4"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L0,8 L10,4 z" :fill="link.cls.linkColor" />
        </marker>
      </template>
    </defs>
    <g v-for="link in customLinks" :key="link.id">
      <path
        class="wp-link-path"
        :class="{ active: isActive(link) }"
        :d="pathFor(link)"
        fill="none"
        :stroke="link.cls.linkColor"
        :stroke-width="link.cls.linkThickness"
        :stroke-dasharray="link.cls.linkDash || undefined"
        stroke-linejoin="round"
        stroke-linecap="round"
        :marker-end="arrowEnd(link)"
        :marker-start="arrowStart(link)"
      />
      <path
        class="wp-link-hit"
        :d="pathFor(link)"
        fill="none"
        stroke="transparent"
        stroke-width="14"
        @click.stop="selectLink(link)"
        @dblclick.stop="insertWaypoint($event, link)"
        @contextmenu.stop.prevent="onLinkContextMenu($event, link)"
      />
    </g>
  </svg>
  <!-- 拐点拖拽手柄 -->
  <template v-for="link in customLinks" :key="'h-' + link.id">
    <div
      v-for="(wp, i) in link.waypoints"
      :key="link.id + '-' + i"
      class="link-waypoint-handle"
      :style="{ left: wp.x + 'px', top: wp.y + 'px' }"
      title="拖拽调整拐点，双击删除拐点"
      @mousedown.stop="startDrag($event, link, i)"
      @dblclick.stop="removeWaypoint(link, i)"
      @click.stop
    ></div>
  </template>
  <!-- 拐点走线的文本标签 -->
  <template v-for="link in customLinks" :key="'lb-' + link.id">
    <div
      v-if="link.label"
      class="linkLabel link-waypoint-label"
      :style="labelStyle(link)"
      @click.stop="selectLink(link)"
      @contextmenu.stop.prevent="onLinkContextMenu($event, link)"
    >
      {{ link.label }}
    </div>
  </template>
</template>

<script lang="ts" setup>
  import { computed, PropType } from 'vue';
  import { message } from 'ant-design-vue';
  import { ILink, INode, IWaypoint } from '/@/type/index';
  import { CommonNodeTypeEnum } from '/@/type/enums';

  const props = defineProps({
    flowData: {
      type: Object,
      default: () => ({}),
    },
    scale: {
      type: Number,
      default: 1,
    },
    select: {
      type: Object as PropType<INode | ILink>,
      default: () => ({}),
    },
  });

  const emits = defineEmits(['selectLink', 'styleChange', 'linkContextMenu']);

  // 含手动拐点的连线
  const customLinks = computed(() =>
    (props.flowData.linkList || []).filter(
      (link: ILink) => link.waypoints && link.waypoints.length > 0,
    ),
  );

  function isActive(link: ILink) {
    return props.select?.id === link.id;
  }

  function nodeById(id?: string): INode | undefined {
    return (props.flowData.nodeList || []).find((n: INode) => n.id === id);
  }

  function nodeCenter(node: INode): IWaypoint {
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  }

  // 计算连线与节点边界的交点
  function edgePoint(node: INode, toward: IWaypoint): IWaypoint {
    const c = nodeCenter(node);
    const dx = toward.x - c.x;
    const dy = toward.y - c.y;
    if (dx === 0 && dy === 0) return c;
    const circleTypes: string[] = [
      CommonNodeTypeEnum.START,
      CommonNodeTypeEnum.END,
      CommonNodeTypeEnum.EVENT,
      CommonNodeTypeEnum.GATEWAY,
    ];
    if (circleTypes.includes(node.type)) {
      const r = node.width / 2 + 2;
      const len = Math.hypot(dx, dy);
      return { x: c.x + (dx / len) * r, y: c.y + (dy / len) * r };
    }
    const hw = node.width / 2 + 2;
    const hh = node.height / 2 + 2;
    const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: c.x + dx * s, y: c.y + dy * s };
  }

  // 走线途经点（源节点边缘 -> 拐点 -> 目标节点边缘）
  function pathPoints(link: ILink): IWaypoint[] {
    const source = nodeById(link.sourceId);
    const target = nodeById(link.targetId);
    if (!source || !target) return [];
    const wps = link.waypoints || [];
    const first = wps[0] || nodeCenter(target);
    const last = wps[wps.length - 1] || nodeCenter(source);
    return [edgePoint(source, first), ...wps, edgePoint(target, last)];
  }

  // 生成路径
  function pathFor(link: ILink): string {
    const pts = pathPoints(link);
    if (pts.length < 2) return '';
    if (link.cls.linkType === 'Bezier' && pts.length > 2) {
      // Catmull-Rom 转贝塞尔平滑曲线
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    }
    return 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
  }

  function arrowEnd(link: ILink): string | undefined {
    const style = link.cls.arrowStyle || 'arrow';
    return style === 'arrow' || style === 'both' ? `url(#wp-arrow-${link.id})` : undefined;
  }

  function arrowStart(link: ILink): string | undefined {
    return link.cls.arrowStyle === 'both' ? `url(#wp-arrow-s-${link.id})` : undefined;
  }

  // 标签位置（路径长度中点）
  function labelStyle(link: ILink) {
    const pts = pathPoints(link);
    if (pts.length < 2) return { display: 'none' };
    let total = 0;
    const segs: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      segs.push(len);
      total += len;
    }
    let rest = total / 2;
    let pos = pts[0];
    for (let i = 0; i < segs.length; i++) {
      if (rest <= segs[i] || i === segs.length - 1) {
        const ratio = segs[i] === 0 ? 0 : rest / segs[i];
        pos = {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * ratio,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * ratio,
        };
        break;
      }
      rest -= segs[i];
    }
    return { left: pos.x + 'px', top: pos.y + 'px' };
  }

  // 鼠标事件坐标转画布坐标
  function toCanvasPos(e: MouseEvent): IWaypoint {
    const containerEl = document.querySelector('#flowContainer') as HTMLElement;
    const rect = containerEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / props.scale,
      y: (e.clientY - rect.top) / props.scale,
    };
  }

  function selectLink(link: ILink) {
    emits('selectLink', link);
  }

  // 连线右键菜单
  function onLinkContextMenu(e: MouseEvent, link: ILink) {
    emits('selectLink', link);
    emits('linkContextMenu', { event: e, link });
  }

  // 点到线段距离
  function distToSegment(p: IWaypoint, a: IWaypoint, b: IWaypoint): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  // 双击空白处插入拐点（插入到最近线段）
  function insertWaypoint(e: MouseEvent, link: ILink) {
    const pos = toCanvasPos(e);
    const pts = pathPoints(link);
    let minDist = Infinity;
    let insertInx = pts.length - 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(pos, pts[i], pts[i + 1]);
      if (d < minDist) {
        minDist = d;
        insertInx = i;
      }
    }
    link.waypoints!.splice(insertInx, 0, pos);
    message.success('已插入拐点，可拖拽调整位置，双击拐点可删除');
  }

  // 拖拽拐点
  function startDrag(e: MouseEvent, link: ILink, inx: number) {
    e.preventDefault();
    const move = (ev: MouseEvent) => {
      const pos = toCanvasPos(ev);
      link.waypoints![inx].x = pos.x;
      link.waypoints![inx].y = pos.y;
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  // 双击删除拐点
  function removeWaypoint(link: ILink, inx: number) {
    link.waypoints!.splice(inx, 1);
    if (link.waypoints!.length === 0) {
      link.waypoints = [];
      emits('styleChange', link);
      message.success('已清除全部拐点，恢复自动走线');
    } else {
      message.info('已删除拐点');
    }
  }
</script>
