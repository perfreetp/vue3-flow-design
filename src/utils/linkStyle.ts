import { ILink } from '/@/type/index';

// 连线交互事件绑定器（setConnector 会重建 canvas，需要重新绑定事件）
let linkInteractionBinder: Nullable<(conn: Recordable, link: ILink) => void> = null;

export function registerLinkInteractionBinder(fn: (conn: Recordable, link: ILink) => void) {
  linkInteractionBinder = fn;
}

// 走线方式选项
export const linkTypeOptions = [
  { value: 'Straight', label: '直线' },
  { value: 'Flowchart', label: '折线' },
  { value: 'Bezier', label: '贝塞尔曲线' },
];

// 虚线样式选项（stroke-dasharray）
export const linkDashOptions = [
  { value: '', label: '实线' },
  { value: '6 4', label: '虚线' },
  { value: '2 3', label: '点线' },
];

// 箭头样式选项
export const arrowStyleOptions = [
  { value: 'arrow', label: '终点箭头' },
  { value: 'none', label: '无箭头' },
  { value: 'both', label: '双向箭头' },
];

// 获取连接器参数
export function getConnectorParams(linkType: string): Recordable {
  switch (linkType) {
    case 'Straight':
      return { gap: 5 };
    case 'Bezier':
      return { curviness: 150 };
    case 'Flowchart':
    default:
      return { gap: 5, cornerRadius: 8, alwaysRespectStubs: true };
  }
}

// 是否存在手动拐点
export function hasWaypoints(link: ILink): boolean {
  return !!(link.waypoints && link.waypoints.length > 0);
}

// 应用箭头样式
export function applyArrowOverlay(conn: Recordable, arrowStyle = 'arrow') {
  const overlays = conn.getOverlays();
  Object.keys(overlays).forEach((id) => {
    if (overlays[id].type === 'Arrow' || overlays[id].type === 'PlainArrow') {
      conn.removeOverlay(id);
    }
  });
  if (arrowStyle === 'arrow' || arrowStyle === 'both') {
    conn.addOverlay(['Arrow', { width: 10, length: 10, location: 1 }]);
  }
  if (arrowStyle === 'both') {
    conn.addOverlay(['Arrow', { width: 10, length: 10, location: 0, direction: -1 }]);
  }
}

// 设置连线虚线样式（直接操作 svg path 的 stroke-dasharray 属性）
function applyDashStyle(conn: Recordable, dash?: string) {
  const path = conn.canvas?.querySelector('path');
  if (!path) return;
  if (dash) {
    path.setAttribute('stroke-dasharray', dash);
  } else {
    path.removeAttribute('stroke-dasharray');
  }
}

// 设置 jsPlumb 原始路径是否响应鼠标事件（自定义拐点走线时禁用，避免遮挡）
function setConnectorPointerEvents(conn: Recordable, enabled: boolean) {
  if (conn.canvas) conn.canvas.style.pointerEvents = enabled ? '' : 'none';
}

// 将连线数据中的样式应用到 jsPlumb 连接上
export function applyLinkStyle(plumb: Recordable, link: ILink) {
  const conn = plumb
    .getConnections({
      source: link.sourceId,
      target: link.targetId,
    })
    .find((c: Recordable) => c.canvas?.id === link.id);
  if (!conn) return;
  const cls = link.cls;
  if (hasWaypoints(link)) {
    // 存在手动拐点：隐藏 jsPlumb 原始路径，由拐点图层负责渲染
    conn.setPaintStyle({ stroke: 'transparent', strokeWidth: 1, fill: 'none' });
    setConnectorPointerEvents(conn, false);
    const labelOverlay = conn.getLabelOverlay?.();
    if (labelOverlay) conn.removeOverlay(labelOverlay.id);
    // 移除箭头覆盖物，由拐点图层绘制箭头
    const overlays = conn.getOverlays();
    Object.keys(overlays).forEach((id) => {
      if (overlays[id].type === 'Arrow' || overlays[id].type === 'PlainArrow') {
        conn.removeOverlay(id);
      }
    });
  } else {
    conn.setConnector([cls.linkType, getConnectorParams(cls.linkType)]);
    // setConnector 会重建 canvas，恢复 id 并重新绑定交互事件
    if (conn.canvas && link.id) {
      conn.canvas.id = link.id;
    }
    conn.setPaintStyle({
      stroke: cls.linkColor,
      strokeWidth: cls.linkThickness,
      fill: 'none',
    });
    setConnectorPointerEvents(conn, true);
    applyDashStyle(conn, cls.linkDash);
    applyArrowOverlay(conn, cls.arrowStyle || 'arrow');
    // 恢复文本标签
    const labelOverlay = conn.getLabelOverlay?.();
    if (link.label) {
      conn.setLabel({ label: link.label, cssClass: `linkLabel ${link.id}` });
    } else if (labelOverlay) {
      conn.removeOverlay(labelOverlay.id);
    }
    // 重新绑定 canvas 与标签的交互事件
    linkInteractionBinder?.(conn, link);
  }
}

// 创建一条 jsPlumb 连接
export function connectLink(plumb: Recordable, link: ILink, anchor: any) {
  return plumb.connect({
    source: link.sourceId,
    target: link.targetId,
    anchor,
    connector: [link.cls.linkType, getConnectorParams(link.cls.linkType)],
    paintStyle: {
      stroke: link.cls.linkColor,
      strokeWidth: link.cls.linkThickness,
    },
  });
}

// 绑定连线文本标签及其点击事件
export function bindLinkLabel(conn: Recordable, link: ILink, onSelect: Fn, onContextMenu?: Fn) {
  const linkId = conn.canvas.id;
  const labelHandle = (e: Event) => {
    e.stopPropagation();
    onSelect(linkId);
  };
  if (link.label !== '') {
    conn.setLabel({
      label: link.label,
      cssClass: `linkLabel ${linkId}`,
    });
    const labelEl = document.querySelector('.' + linkId);
    labelEl?.addEventListener('click', labelHandle);
    if (onContextMenu) {
      labelEl?.addEventListener('contextmenu', (e: Event) => {
        e.stopPropagation();
        onSelect(linkId);
        onContextMenu(e);
      });
    }
  }
}
