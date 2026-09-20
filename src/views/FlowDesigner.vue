<template>
  <a-layout class="flow-wrapper">
    <!-- 左侧边组件元素 -->
    <flow-element @setDragInfo="setDragInfo" />
    <a-layout>
      <!-- 工具区 -->
      <Toolbar
        :currentTool="currentTool"
        :flowData="flowData"
        :canUndo="canUndo"
        :canRedo="canRedo"
        @generateFlowImage="
          generateFlowImage(
            flowData.nodeList,
            flowConfig.defaultStyle.photoBlankDistance,
            checkFlow,
          )
        "
        @selectTool="selectTool"
        @clear="clearFlow"
        @toggleShowGrid="toggleShowGrid"
        @setting="setting"
        @openTest="openTest"
        @shortcutHelper="shortcutHelper"
        @saveFlow="saveFlow"
        @undo="undo"
        @redo="redo"
        @validate="validateFlowHandler"
        @importFlow="importJson"
        @exportJson="exportJson"
      />
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
          @createLinks="createLinks"
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

  <!-- 流程校验 -->
  <ValidateModal v-model:visible="validateVisible" :issues="validateIssues" @locate="locateIssue" />

  <!-- 导入JSON -->
  <input
    ref="importFileRef"
    type="file"
    accept=".json,application/json"
    style="display: none"
    @change="onImportFileChange"
  />
</template>

<script lang="ts" setup>
  import { jsPlumb } from 'jsplumb';
  import { reactive, ref, computed, watch, onMounted, nextTick, unref } from 'vue';
  import { message } from 'ant-design-vue';
  import { cloneDeep } from 'lodash-es';
  import { ls } from 'vue-lsp';
  import FlowArea from './modules/FlowArea.vue';
  import FlowAttr from './modules/FlowAttr.vue';
  import SettingModal from './modules/SettingModal.vue';
  import ShortcutKeyModal from './modules/ShortcutKeyModal.vue';
  import TestModal from './modules/TestModal.vue';
  import ValidateModal from './modules/ValidateModal.vue';
  import FlowElement from './modules/FlowElement.vue';
  import Toolbar from './modules/Toolbar.vue';
  import FlowFooter from './modules/FlowFooter.vue';
  import { tools } from '/@/config/tools';
  import { IDragInfo, INode, ILink, ITool } from '/@/type/index';
  import { ActionsTypeEnum, LaneNodeTypeEnum, FlowStatusEnum } from '/@/type/enums';
  import { utils, setFlowConfig } from '/@/utils/common';
  import { validateFlow, IFlowIssue } from '/@/utils/validate';
  import { useContextMenu } from '/@/hooks/useContextMenu';
  import { useGenerateFlowImage } from '/@/hooks/useGenerateFlowImage';
  import { useShortcutKey } from '/@/hooks/useShortcutKey';
  import { flowConfig as defaultFlowConfig, settingConfig } from '/@/config/flow';

  const [createContextMenu] = useContextMenu();

  // 生成流程图片
  const { flowImage, downLoadFlowImage, cancelDownLoadFlowImage, generateFlowImage } =
    useGenerateFlowImage();

  // 快捷键
  const { listenShortcutKey, offShortcutKey, onShortcutKey } = useShortcutKey();

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

  // 校验弹窗显隐
  const validateVisible = ref<boolean>(false);

  // 校验问题列表
  const validateIssues = ref<IFlowIssue[]>([]);

  // 导入文件input
  const importFileRef = ref();

  // 撤销重做历史
  const historyStack = ref<Recordable[]>([]);
  const historyIndex = ref<number>(-1);
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(
    () => historyIndex.value > -1 && historyIndex.value < historyStack.value.length - 1,
  );
  let historySuspend = false;
  let recordTimer: Nullable<ReturnType<typeof setTimeout>> = null;

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
  });

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
    await nextTick();
    const loadData = JSON.parse(str);
    flowData.attr = loadData.attr || { id: 'flow-' + utils.getId() };
    flowData.config = loadData.config || flowData.config;
    flowData.status = FlowStatusEnum.LOADING;
    unref(plumb).batch(async () => {
      const nodeList = loadData.nodeList;
      nodeList.forEach((node: INode) => {
        flowData.nodeList.push(node);
      });

      await nextTick();
      const linkList = loadData.linkList;
      linkList.forEach((link: ILink) => {
        flowData.linkList.push(link);
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

  // 渲染单条连线
  function renderLink(link: ILink) {
    let conn = unref(plumb).connect({
      source: link.sourceId,
      target: link.targetId,
      anchor: unref(flowConfig).jsPlumbConfig.anchor.default,
      connector: [link.cls.linkType, unref(flowConfig).jsPlumbInsConfig.Connector?.[1]],
      paintStyle: {
        stroke: link.cls.linkColor,
        strokeWidth: link.cls.linkThickness,
      },
    });
    let link_id = conn.canvas.id;
    let link_dom = document.querySelector('.' + link_id);
    let labelHandle = (e: Event) => {
      e.stopPropagation();
      currentSelect.value = flowData.linkList.find((l: ILink) => l.id === link_id);
    };

    if (link.label !== '') {
      conn.setLabel({
        label: link.label,
        cssClass: `linkLabel ${link_id}`,
      });

      // 添加label点击事件
      link_dom?.addEventListener('click', labelHandle);
    } else {
      // 移除label点击事件
      link_dom?.removeEventListener('click', labelHandle);
    }
  }

  // 粘贴时创建连线（节点已渲染后由FlowArea触发）
  async function createLinks(links: ILink[]) {
    if (!links || links.length <= 0) return;
    await nextTick();
    const prevStatus = flowData.status;
    flowData.status = FlowStatusEnum.LOADING;
    links.forEach((link: ILink) => {
      flowData.linkList.push(link);
      renderLink(link);
    });
    flowData.status = prevStatus === FlowStatusEnum.LOADING ? FlowStatusEnum.MODIFY : prevStatus;
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
      };
      document.querySelector('#' + id)?.addEventListener('contextmenu', (e: Event) => {
        showLinkContextMenu(e);
        currentSelect.value = flowData.linkList.find((l: ILink) => l.id === id);
      });

      document.querySelector('#' + id)?.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        currentSelect.value = flowData.linkList.find((l: ILink) => l.id === id);
      });

      if (flowData.status !== FlowStatusEnum.LOADING) {
        flowData.linkList.push(o);
        message.success('连线成功！');
      }
    });

    unref(plumb).importDefaults({
      ConnectionsDetachable: unref(flowConfig).jsPlumbConfig.conn.isDetachable,
    });
  }

  // 连接线右键
  function showLinkContextMenu(e) {
    e.stopPropagation();
    createContextMenu({
      event: e,
      items: [
        {
          handler: () => {
            deleteLink();
          },
          label: '删除连线',
        },
      ],
    });
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

  // 生成当前流程快照
  function takeSnapshot() {
    return cloneDeep({
      nodeList: flowData.nodeList,
      linkList: flowData.linkList,
      attr: flowData.attr,
    });
  }

  // 记录历史
  function recordHistory() {
    if (historySuspend) return;
    const snap = takeSnapshot();
    const current = historyStack.value[historyIndex.value];
    if (current && JSON.stringify(current) === JSON.stringify(snap)) return;
    historyStack.value.splice(historyIndex.value + 1);
    historyStack.value.push(snap);
    if (historyStack.value.length > 50) historyStack.value.shift();
    historyIndex.value = historyStack.value.length - 1;
  }

  // 延迟记录历史（合并连续变更）
  function scheduleRecord() {
    if (historySuspend) return;
    if (recordTimer) clearTimeout(recordTimer);
    recordTimer = setTimeout(recordHistory, 200);
  }

  // 应用历史快照
  async function applySnapshot(snap: Recordable) {
    historySuspend = true;
    if (recordTimer) clearTimeout(recordTimer);
    await loadFlow(
      JSON.stringify(
        Object.assign({}, cloneDeep(snap), {
          config: flowData.config,
          status: FlowStatusEnum.SAVE,
        }),
      ),
    );
    await nextTick();
    setTimeout(() => {
      historySuspend = false;
    }, 300);
  }

  // 撤销
  async function undo() {
    if (!canUndo.value) {
      message.warning('没有可撤销的操作！');
      return;
    }
    historyIndex.value--;
    await applySnapshot(historyStack.value[historyIndex.value]);
    message.success('撤销成功！');
  }

  // 重做
  async function redo() {
    if (!canRedo.value) {
      message.warning('没有可重做的操作！');
      return;
    }
    historyIndex.value++;
    await applySnapshot(historyStack.value[historyIndex.value]);
    message.success('重做成功！');
  }

  // 流程校验
  function validateFlowHandler() {
    validateIssues.value = validateFlow(flowData.nodeList, flowData.linkList);
    validateVisible.value = true;
    if (validateIssues.value.length <= 0) {
      message.success('校验通过，未发现问题！');
    } else {
      message.warning(`校验完成，发现 ${validateIssues.value.length} 个问题！`);
    }
  }

  // 定位并高亮校验问题
  function locateIssue(issue: IFlowIssue) {
    clearSelect();
    if (issue.nodeId) {
      const node = flowData.nodeList.find((n: INode) => n.id === issue.nodeId);
      if (!node) return;
      currentSelect.value = node;
      nextTick(() => {
        const dom = document.querySelector('#' + issue.nodeId);
        dom?.classList.add('node-locate-highlight');
        setTimeout(() => {
          dom?.classList.remove('node-locate-highlight');
        }, 2000);
      });
    } else if (issue.linkId) {
      const link = flowData.linkList.find((l: ILink) => l.id === issue.linkId);
      if (!link) return;
      currentSelect.value = link;
    }
  }

  // 导出JSON
  function exportJson() {
    if (!checkFlow()) return;
    const exportData = Object.assign({}, flowData, { status: FlowStatusEnum.SAVE });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const alink = document.createElement('a');
    alink.href = url;
    alink.download = `${flowData.attr.id}.json`;
    alink.click();
    URL.revokeObjectURL(url);
    message.success('导出JSON成功！');
  }

  // 导入JSON
  function importJson() {
    importFileRef.value?.click();
  }

  // 导入文件变更
  function onImportFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data || !Array.isArray(data.nodeList) || !Array.isArray(data.linkList)) {
          message.error('导入失败：JSON格式不正确！');
          return;
        }
        loadFlow(JSON.stringify(data));
        message.success('导入成功！');
      } catch (err) {
        message.error('导入失败：JSON解析错误！');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  // 删除当前选中内容
  function deleteSelection() {
    if (unref(currentSelectGroup).length > 0) {
      unref(flowAreaRef).deleteNodes(unref(currentSelectGroup));
    } else if (unref(currentSelect)?.type === 'link') {
      deleteLink();
    } else if (unref(currentSelect)?.id) {
      unref(flowAreaRef).deleteNode();
    } else {
      message.warning('请先选择要删除的节点或连线！');
    }
  }

  // 设置dragInfo
  function setDragInfo(info: IDragInfo) {
    dragInfo.type = info.type;
    dragInfo.belongTo = info.belongTo;
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
    message.success('删除连线成功！');
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
  }

  // 重新绘制（清空画布）
  function clearFlow() {
    clear();
    message.success('画布已清空！');
  }

  // 清除当前选择节点
  function clearSelect() {
    currentSelect.value = undefined;
    currentSelectGroup.value = [];
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
      undo,
      redo,
      deleteSelection,
    });

    // 初始画布设置
    initSettingConfig();

    // 初始化流程图
    initFlow();

    // 记录初始快照
    recordHistory();
  });

  // 监听流程数据变化，自动记录历史（节点增删改、连线增删、属性修改）
  watch(
    () => [flowData.nodeList, flowData.linkList, flowData.attr],
    () => {
      scheduleRecord();
    },
    { deep: true },
  );
</script>
