<template>
  <a-layout class="flow-wrapper">
    <!-- 左侧边组件元素 -->
    <flow-element @setDragInfo="setDragInfo" />
    <!-- 模板库 / 大纲面板 -->
    <template-panel
      :templates="customTemplates"
      :outlineTree="outlineTree"
      :selectNodeId="currentSelect?.type !== 'link' ? currentSelect?.id || '' : ''"
      @setDragInfo="setDragInfo"
      @locateNode="locateNode"
      @renameTemplate="renameTemplateById"
      @deleteTemplate="deleteTemplateById"
    />
    <a-layout>
      <!-- 工具区 -->
      <Toolbar
        :currentTool="currentTool"
        :flowData="flowData"
        @generateFlowImage="
          generateFlowImage(
            flowData.nodeList,
            flowConfig.defaultStyle.photoBlankDistance,
            checkFlow,
          )
        "
        @selectTool="selectTool"
        @clear="clear"
        @toggleShowGrid="toggleShowGrid"
        @setting="setting"
        @openTest="openTest"
        @shortcutHelper="shortcutHelper"
        @saveFlow="saveFlow"
      />
      <!-- 子流程面包屑 -->
      <div class="flow-breadcrumb" v-if="canvasStack.length > 0">
        <a-breadcrumb>
          <a-breadcrumb-item>
            <a class="flow-breadcrumb__link" @click="exitToLevel(0)">
              <component :is="'HomeOutlined'" />
              主流程
            </a>
          </a-breadcrumb-item>
          <a-breadcrumb-item v-for="(item, i) in canvasStack" :key="item.id">
            <a
              v-if="i < canvasStack.length - 1"
              class="flow-breadcrumb__link"
              @click="exitToLevel(i + 1)"
            >
              {{ item.name }}
            </a>
            <span v-else>{{ item.name }}</span>
          </a-breadcrumb-item>
        </a-breadcrumb>
      </div>
      <!-- 画布区 -->
      <a-layout-content class="flow-content">
        <flow-area
          ref="flowAreaRef"
          :dragInfo="dragInfo"
          :config="flowConfig"
          v-model:data="flowData"
          v-model:select="currentSelect"
          v-model:selectGroup="currentSelectGroup"
          :plumb="plumb"
          :currentTool="currentTool"
          @selectTool="selectTool"
          @onShortcutKey="onShortcutKey"
          @saveFlow="saveFlow"
          @saveAsTemplate="saveAsTemplate"
          @enterSubflow="enterSubflow"
          @linkContextMenu="showLayerLinkContextMenu"
        />
      </a-layout-content>
      <!-- 底部 -->
      <flow-footer />
    </a-layout>
    <a-layout-sider width="250" theme="light" class="attr-area" @mousedown.stop="offShortcutKey">
      <!-- 组件属性区 -->
      <flow-attr :plumb="plumb" :flowData="flowData" v-model:select="currentSelect" />
    </a-layout-sider>
  </a-layout>

  <!-- 生成流程图片 -->
  <a-modal
    :title="'流程设计图_' + flowData.attr.id + '.png'"
    centered
    width="90%"
    :closable="false"
    :maskClosable="false"
    :visible="flowImage.modalVisible"
    okText="下载到本地"
    cancelText="取消"
    @ok="downLoadFlowImage(flowData.attr.id)"
    @cancel="cancelDownLoadFlowImage"
  >
    <img :src="flowImage.url" style="width: 100%" />
  </a-modal>

  <!-- 设置 -->
  <SettingModal v-model:settingVisible="settingVisible" v-model:config="flowConfig" />

  <!-- 快捷键大全 -->
  <ShortcutKeyModal v-model:shortcutVisible="shortcutVisible" />

  <!-- 测试 -->
  <TestModal v-model:testVisible="testVisible" :flowData="flowData" @loadFlow="loadFlow" />

  <!-- 另存为模板 -->
  <a-modal
    v-model:visible="templateModalVisible"
    title="另存为模板"
    okText="保存"
    cancelText="取消"
    @ok="confirmSaveTemplate"
  >
    <a-input
      v-model:value="templateName"
      placeholder="请输入模板名称"
      @pressEnter="confirmSaveTemplate"
    />
  </a-modal>

  <!-- 编辑连线标签 -->
  <a-modal
    v-model:visible="linkLabelModalVisible"
    title="编辑连线标签"
    okText="确认"
    cancelText="取消"
    @ok="confirmEditLinkLabel"
  >
    <a-input
      v-model:value="linkLabelValue"
      placeholder="请输入连线标签文本"
      @pressEnter="confirmEditLinkLabel"
    />
  </a-modal>
</template>

<script lang="ts" setup>
  import { jsPlumb } from 'jsplumb';
  import { reactive, ref, computed, onMounted, nextTick, unref } from 'vue';
  import { message } from 'ant-design-vue';
  import { cloneDeep } from 'lodash-es';
  import { ls } from 'vue-lsp';
  import FlowArea from './modules/FlowArea.vue';
  import FlowAttr from './modules/FlowAttr.vue';
  import TemplatePanel from './modules/TemplatePanel.vue';
  import SettingModal from './modules/SettingModal.vue';
  import ShortcutKeyModal from './modules/ShortcutKeyModal.vue';
  import TestModal from './modules/TestModal.vue';
  import FlowElement from './modules/FlowElement.vue';
  import Toolbar from './modules/Toolbar.vue';
  import FlowFooter from './modules/FlowFooter.vue';
  import { tools } from '/@/config/tools';
  import { IDragInfo, INode, ILink, ITool } from '/@/type/index';
  import { ActionsTypeEnum, LaneNodeTypeEnum, FlowStatusEnum } from '/@/type/enums';
  import { utils, setFlowConfig } from '/@/utils/common';
  import { useContextMenu } from '/@/hooks/useContextMenu';
  import { useGenerateFlowImage } from '/@/hooks/useGenerateFlowImage';
  import { useShortcutKey } from '/@/hooks/useShortcutKey';
  import { useTemplates } from '/@/hooks/useTemplates';
  import { flowConfig as defaultFlowConfig, settingConfig } from '/@/config/flow';
  import {
    applyLinkStyle,
    connectLink,
    bindLinkLabel,
    registerLinkInteractionBinder,
  } from '/@/utils/linkStyle';

  const [createContextMenu] = useContextMenu();

  // 生成流程图片
  const { flowImage, downLoadFlowImage, cancelDownLoadFlowImage, generateFlowImage } =
    useGenerateFlowImage();

  // 快捷键
  const { listenShortcutKey, offShortcutKey, onShortcutKey } = useShortcutKey();

  // 自定义节点模板
  const {
    templates: customTemplates,
    addTemplate,
    renameTemplate,
    deleteTemplate,
  } = useTemplates();

  // 流程配置
  const flowConfig = ref(cloneDeep(defaultFlowConfig));

  // 流程实例
  const plumb = ref();

  // 当前工具类型
  const currentTool = ref<ITool>(tools[0]);

  // 画布Ref
  const flowAreaRef = ref();

  // 设置弹窗显隐
  const settingVisible = ref<boolean>(false);

  // 快捷键弹窗显隐
  const shortcutVisible = ref<boolean>(false);

  // 测试弹窗显隐
  const testVisible = ref<boolean>(false);

  // 流程DSL
  const flowData = reactive<Recordable>({
    nodeList: [],
    linkList: [],
    attr: {
      id: '',
    },
    config: {
      showGrid: true,
      showGridText: '隐藏网格',
      showGridIcon: 'EyeOutlined',
    },
    status: FlowStatusEnum.CREATE,
  });

  // 当前选择节点
  const currentSelect = ref<INode | ILink>();

  // 当前选择组
  const currentSelectGroup = ref<INode[]>([]);

  // 拖拽组件元素信息
  const dragInfo = reactive<IDragInfo>({
    type: null,
    belongTo: null,
    template: null,
  });

  // 子流程画布层级栈
  const canvasStack = ref<{ id: string; name: string; nodeList: INode[]; linkList: ILink[] }[]>([]);

  // 另存为模板弹窗
  const templateModalVisible = ref<boolean>(false);
  const templateName = ref<string>('');
  let pendingTemplateNode: INode | null = null;

  // 编辑连线标签弹窗
  const linkLabelModalVisible = ref<boolean>(false);
  const linkLabelValue = ref<string>('');

  // 主流程节点列表（进入子流程后取栈底）
  const rootNodeList = computed<INode[]>(() =>
    canvasStack.value.length > 0 ? canvasStack.value[0].nodeList : flowData.nodeList,
  );

  // 大纲树数据（含子流程层级）
  const outlineTree = computed<Recordable[]>(() => buildOutlineTree(rootNodeList.value, []));

  function buildOutlineTree(nodeList: INode[], path: string[]): Recordable[] {
    return (nodeList || []).map((node: INode) => ({
      key: node.id,
      title: `${node.nodeName}（${node.type}）`,
      nodeId: node.id,
      path,
      children:
        node.isSubflow && node.subflow
          ? buildOutlineTree(node.subflow.nodeList, [...path, node.id])
          : [],
    }));
  }

  // 初始化流程图
  function initFlow() {
    if (flowData.status === FlowStatusEnum.CREATE) {
      flowData.attr.id = 'flow-' + utils.getId();
    } else {
      loadFlow();
    }
  }

  // 渲染流程
  async function loadFlow(str = '') {
    clear();
    canvasStack.value = [];
    await nextTick();
    const loadData = JSON.parse(str);
    flowData.attr = loadData.attr;
    flowData.config = loadData.config;
    flowData.status = FlowStatusEnum.LOADING;
    unref(plumb).batch(async () => {
      const nodeList = loadData.nodeList;
      nodeList.forEach((node: INode) => {
        flowData.nodeList.push(node);
      });

      await nextTick();
      const linkList = loadData.linkList;
      linkList.forEach((link: ILink) => {
        renderLink(link);
      });

      clearSelect();
      flowData.status = FlowStatusEnum.MODIFY;
    }, true);

    unref(flowAreaRef).container.pos = {
      top: 0,
      left: 0,
    };
  }

  // 渲染一条连线（jsPlumb 连接 + 样式 + 标签）
  function renderLink(link: ILink) {
    flowData.linkList.push(link);
    connectLink(unref(plumb), link, unref(flowConfig).jsPlumbConfig.anchor.default);
    applyLinkStyle(unref(plumb), link);
  }

  // 实例化JsPlumb
  function initJsPlumb() {
    plumb.value = jsPlumb.getInstance(unref(flowConfig).jsPlumbInsConfig);

    unref(plumb).bind('beforeDrop', (info: Recordable) => {
      let sourceId = info.sourceId;
      let targetId = info.targetId;

      if (sourceId === targetId) return false;
      let notOnlyLink = flowData.linkList.find(
        (link: ILink) => link.sourceId === sourceId && link.targetId === targetId,
      );
      if (notOnlyLink) {
        message.error('同方向的两节点连线只能有一条！');
        return false;
      }
      return true;
    });

    unref(plumb).bind('connection', (conn: Recordable) => {
      let connObj = conn.connection.canvas;
      let o: Recordable = {};
      let id = '';
      let label = '';
      if (flowData.status === FlowStatusEnum.CREATE || flowData.status === FlowStatusEnum.MODIFY) {
        id = 'link-' + utils.getId();
        label = '';
      } else if (flowData.status === FlowStatusEnum.LOADING) {
        let l = flowData.linkList[flowData.linkList.length - 1];
        id = l.id;
        label = l.label;
      }
      connObj.id = id;
      o.type = 'link';
      o.id = id;
      o.sourceId = conn.sourceId;
      o.targetId = conn.targetId;
      o.label = label;
      o.cls = {
        linkType: unref(flowConfig).jsPlumbInsConfig.Connector?.[0],
        linkColor: unref(flowConfig).jsPlumbInsConfig.PaintStyle?.stroke,
        linkThickness: unref(flowConfig).jsPlumbInsConfig.PaintStyle?.strokeWidth,
        linkDash: '',
        arrowStyle: 'arrow',
      };
      bindLinkInteractions(connObj, id);

      if (flowData.status !== FlowStatusEnum.LOADING) flowData.linkList.push(o);
    });

    unref(plumb).importDefaults({
      ConnectionsDetachable: unref(flowConfig).jsPlumbConfig.conn.isDetachable,
    });

    // setConnector 重建 canvas 后重新绑定交互事件
    registerLinkInteractionBinder((conn: Recordable, link: ILink) => {
      bindLinkInteractions(conn.canvas, link.id);
      bindLinkLabel(
        conn,
        link,
        (linkId: string) => {
          currentSelect.value = flowData.linkList.find((l: ILink) => l.id === linkId);
        },
        (e: MouseEvent) => {
          showLinkContextMenu(e);
        },
      );
    });
  }

  // 绑定连线交互事件（点击选中/右键菜单/双击插点）
  function bindLinkInteractions(canvas: HTMLElement, linkId: string) {
    canvas?.addEventListener('contextmenu', (e: Event) => {
      currentSelect.value = flowData.linkList.find((l: ILink) => l.id === linkId);
      showLinkContextMenu(e as MouseEvent);
    });

    canvas?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      currentSelect.value = flowData.linkList.find((l: ILink) => l.id === linkId);
    });

    // 双击连线空白处快速插入拐点
    canvas?.addEventListener('dblclick', (e: Event) => {
      e.stopPropagation();
      insertWaypointAt(e as MouseEvent, linkId);
    });
  }

  // 连接线右键
  function showLinkContextMenu(e: MouseEvent) {
    e.stopPropagation();
    const link = unref(currentSelect) as ILink;
    createContextMenu({
      event: e,
      items: [
        {
          handler: () => {
            insertWaypointAt(e, (unref(currentSelect) as ILink)?.id);
          },
          label: '插入拐点',
        },
        {
          handler: () => {
            openEditLinkLabel();
          },
          label: '编辑标签',
        },
        {
          handler: () => {
            clearLinkWaypoints();
          },
          label: '清除拐点',
          hidden: !link?.waypoints || link.waypoints.length === 0,
        },
        {
          handler: () => {
            deleteLink();
          },
          label: '删除连线',
        },
      ],
    });
  }

  // 拐点走线层连线右键
  function showLayerLinkContextMenu(payload: { event: MouseEvent; link: ILink }) {
    currentSelect.value = payload.link;
    showLinkContextMenu(payload.event);
  }

  // 鼠标事件坐标转画布坐标
  function toCanvasPos(e: MouseEvent) {
    const containerEl = document.querySelector('#flowContainer') as HTMLElement;
    const rect = containerEl.getBoundingClientRect();
    const scale = unref(flowAreaRef).container.scale;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  // 在指定位置插入拐点
  function insertWaypointAt(e: MouseEvent, linkId?: string) {
    const link = flowData.linkList.find((l: ILink) => l.id === linkId);
    if (!link) return;
    const pos = toCanvasPos(e);
    if (!link.waypoints) link.waypoints = [];
    // 计算插入位置（最近线段）
    const nodeOf = (id?: string) => flowData.nodeList.find((n: INode) => n.id === id);
    const centerOf = (n?: INode) =>
      n ? { x: n.x + n.width / 2, y: n.y + n.height / 2 } : { x: 0, y: 0 };
    const pts = [
      centerOf(nodeOf(link.sourceId)),
      ...link.waypoints,
      centerOf(nodeOf(link.targetId)),
    ];
    let minDist = Infinity;
    let insertInx = pts.length - 1;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((pos.x - a.x) * dx + (pos.y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(pos.x - (a.x + t * dx), pos.y - (a.y + t * dy));
      if (d < minDist) {
        minDist = d;
        insertInx = i;
      }
    }
    link.waypoints.splice(insertInx, 0, pos);
    applyLinkStyle(unref(plumb), link);
    currentSelect.value = link;
    message.success('已插入拐点，可拖拽调整位置，双击拐点可删除');
  }

  // 清除连线全部拐点
  function clearLinkWaypoints() {
    const link = unref(currentSelect) as ILink;
    if (!link?.id) return;
    link.waypoints = [];
    applyLinkStyle(unref(plumb), link);
    message.success('已清除全部拐点，恢复自动走线');
  }

  // 打开编辑连线标签弹窗
  function openEditLinkLabel() {
    const link = unref(currentSelect) as ILink;
    if (!link?.id) return;
    linkLabelValue.value = link.label || '';
    linkLabelModalVisible.value = true;
  }

  // 确认编辑连线标签
  function confirmEditLinkLabel() {
    const link = unref(currentSelect) as ILink;
    if (!link?.id) {
      linkLabelModalVisible.value = false;
      return;
    }
    link.label = linkLabelValue.value.trim();
    applyLinkStyle(unref(plumb), link);
    linkLabelModalVisible.value = false;
    message.success('连线标签已更新');
  }

  // 设置工具
  function selectTool(type: ActionsTypeEnum) {
    let tool = tools.find((t) => t.type === type);
    if (tool) currentTool.value = tool;

    switch (type) {
      case ActionsTypeEnum.DRAG:
        changeToDrag();
        break;
      case ActionsTypeEnum.CONNECTION:
        changeToConnection();
        break;
    }
  }

  // 切换为拖拽
  function changeToDrag() {
    flowData.nodeList.forEach((node: INode) => {
      let f = unref(plumb).toggleDraggable(node.id);
      if (!f) {
        unref(plumb).toggleDraggable(node.id);
      }
      if (node.type !== LaneNodeTypeEnum.X_LANE && node.type !== LaneNodeTypeEnum.Y_LANE) {
        unref(plumb).unmakeSource(node.id);
        unref(plumb).unmakeTarget(node.id);
      }
    });
  }

  // 切换为连线
  function changeToConnection() {
    flowData.nodeList.forEach((node: INode) => {
      let f = unref(plumb).toggleDraggable(node.id);
      if (f) {
        unref(plumb).toggleDraggable(node.id);
      }
      if (node.type !== LaneNodeTypeEnum.X_LANE && node.type !== LaneNodeTypeEnum.Y_LANE) {
        unref(plumb).makeSource(node.id, unref(flowConfig).jsPlumbConfig.makeSourceConfig);
        unref(plumb).makeTarget(node.id, unref(flowConfig).jsPlumbConfig.makeTargetConfig);
      }
    });

    clearSelect();
  }

  // 检测流程数据有效性
  function checkFlow() {
    let nodeList = flowData.nodeList;

    if (nodeList.length <= 0) {
      message.error('流程图中无任何节点！');
      return false;
    }
    return true;
  }

  // 保存流程
  function saveFlow() {
    let flowObj = Object.assign({}, flowData);

    if (!checkFlow()) return;
    flowObj.status = FlowStatusEnum.SAVE;
    message.success('保存流程成功！请查看控制台。');
    console.log(flowObj);
  }

  // 设置dragInfo
  function setDragInfo(info: IDragInfo) {
    dragInfo.type = info.type;
    dragInfo.belongTo = info.belongTo;
    dragInfo.template = info.template ?? null;
  }

  // 删除线
  function deleteLink() {
    let sourceId = (unref(currentSelect) as ILink)?.sourceId;
    let targetId = (unref(currentSelect) as ILink)?.targetId;
    unref(plumb).deleteConnection(
      unref(plumb).getConnections({
        source: sourceId,
        target: targetId,
      })[0],
    );
    let linkList = flowData.linkList;
    linkList.splice(
      linkList.findIndex((link: ILink) => link.sourceId === sourceId && link.targetId === targetId),
      1,
    );
    currentSelect.value = undefined;
  }

  // 键盘移动节点
  function moveNode(type: string) {
    let m = unref(flowConfig).defaultStyle.movePx,
      isX = true;
    switch (type) {
      case 'left':
        m = -m;
        break;
      case 'up':
        m = -m;
        isX = false;
        break;
      case 'right':
        break;
      case 'down':
        isX = false;
        break;
    }

    if (unref(currentSelectGroup).length > 0) {
      unref(currentSelectGroup).forEach((node) => {
        if (isX) {
          node.x += m;
        } else {
          node.y += m;
        }
      });
    } else if (unref(currentSelect)?.id) {
      if (isX) {
        (unref(currentSelect) as INode).x += m;
      } else {
        (unref(currentSelect) as INode).y += m;
      }
    }

    unref(plumb).repaintEverything();
  }

  // 清除画布
  function clear() {
    flowData.nodeList.forEach((node: INode) => {
      unref(plumb).remove(node.id);
    });
    clearSelect();
    flowData.nodeList = [];
    flowData.linkList = [];
    canvasStack.value = [];
  }

  // 清除当前选择节点
  function clearSelect() {
    currentSelect.value = undefined;
    currentSelectGroup.value = [];
  }

  // 卸载当前层画布的 jsPlumb 内容
  function detachCurrentLevel() {
    flowData.nodeList.forEach((node: INode) => {
      unref(plumb).remove(node.id);
    });
    clearSelect();
  }

  // 渲染当前层连线
  function renderCurrentLevelLinks(linkList: ILink[]) {
    flowData.status = FlowStatusEnum.LOADING;
    flowData.linkList = [];
    linkList.forEach((link: ILink) => {
      renderLink(link);
    });
    flowData.status = FlowStatusEnum.MODIFY;
  }

  // 重新应用当前工具（拖拽/连线）到画布节点
  function reapplyCurrentTool() {
    if (currentTool.value.type === ActionsTypeEnum.CONNECTION) {
      changeToConnection();
    } else {
      changeToDrag();
    }
  }

  // 进入子流程
  async function enterSubflow(node: INode, silent = false) {
    if (!node.isSubflow) return;
    if (!node.subflow) {
      node.subflow = { nodeList: [], linkList: [] };
    }
    const subflowLinks = node.subflow.linkList;
    detachCurrentLevel();
    canvasStack.value.push({
      id: node.id,
      name: node.nodeName,
      nodeList: flowData.nodeList,
      linkList: flowData.linkList,
    });
    flowData.nodeList = node.subflow.nodeList;
    flowData.linkList = [];
    await nextTick();
    renderCurrentLevelLinks(subflowLinks);
    reapplyCurrentTool();
    unref(flowAreaRef).container.pos = { top: 0, left: 0 };
    if (!silent) message.info(`已进入子流程「${node.nodeName}」，可通过顶部面包屑返回上层`);
  }

  // 返回到指定层级（0 为主流程）
  async function exitToLevel(index: number, silent = false) {
    if (index >= canvasStack.value.length) return;
    const target = canvasStack.value[index];
    detachCurrentLevel();
    canvasStack.value.splice(index);
    flowData.nodeList = target.nodeList;
    flowData.linkList = [];
    await nextTick();
    renderCurrentLevelLinks(target.linkList);
    reapplyCurrentTool();
    unref(flowAreaRef).container.pos = { top: 0, left: 0 };
    if (!silent) {
      message.info(index === 0 ? '已返回主流程' : `已返回子流程「${target.name}」所在层级`);
    }
  }

  // 大纲树定位节点
  async function locateNode(payload: { path: string[]; nodeId: string }) {
    const { path, nodeId } = payload;
    // 先回到主流程
    if (canvasStack.value.length > 0) {
      await exitToLevel(0, true);
    }
    // 逐层进入目标所在子流程
    for (const subflowId of path) {
      const node = flowData.nodeList.find((n: INode) => n.id === subflowId);
      if (node) {
        await enterSubflow(node, true);
      }
    }
    await nextTick();
    const target = flowData.nodeList.find((n: INode) => n.id === nodeId);
    if (target) {
      unref(flowAreaRef).focusNode(target);
      currentSelect.value = target;
      message.info(`已定位到节点「${target.nodeName}」`);
    }
  }

  // 另存为模板
  function saveAsTemplate(node: INode) {
    if (!node?.id) return;
    pendingTemplateNode = node;
    templateName.value = node.nodeName + '模板';
    templateModalVisible.value = true;
  }

  // 确认保存模板
  function confirmSaveTemplate() {
    if (!templateName.value.trim()) {
      message.warning('模板名称不能为空！');
      return;
    }
    if (pendingTemplateNode) {
      const tplNode = cloneDeep(pendingTemplateNode) as Recordable;
      delete tplNode.id;
      delete tplNode.x;
      delete tplNode.y;
      addTemplate(templateName.value.trim(), tplNode);
      message.success('模板保存成功，已加入模板库「自定义模板」分类');
    }
    templateModalVisible.value = false;
    pendingTemplateNode = null;
  }

  // 重命名模板
  function renameTemplateById({ id, name }: { id: string; name: string }) {
    renameTemplate(id, name);
  }

  // 删除模板
  function deleteTemplateById(id: string) {
    deleteTemplate(id);
  }

  // 显示隐藏网格
  function toggleShowGrid() {
    let flag = flowData.config.showGrid;
    flowData.config.showGrid = !flag;
    flowData.config.showGridText = flag ? '显示网格' : '隐藏网格';
    flowData.config.showGridIcon = flag ? 'EyeInvisibleOutlined' : 'EyeOutlined';
  }

  // 测试
  function openTest() {
    testVisible.value = true;
  }

  // 设置
  function setting() {
    settingVisible.value = true;
  }

  // 快捷键大全
  function shortcutHelper() {
    shortcutVisible.value = true;
  }

  // 初始画布设置
  function initSettingConfig() {
    if (!ls.get('settingConfig')) {
      ls.set('settingConfig', settingConfig);
    } else {
      flowConfig.value = setFlowConfig(unref(flowConfig), ls.get('settingConfig'));
    }
  }

  onMounted(() => {
    // 实例化JsPlumb
    initJsPlumb();

    // 初始化快捷键
    listenShortcutKey(unref(flowAreaRef), {
      selectTool,
      moveNode,
      saveFlow,
      openTest,
    });

    // 初始画布设置
    initSettingConfig();

    // 初始化流程图
    initFlow();
  });
</script>
