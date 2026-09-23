<template>
  <a-layout-sider width="220" theme="light" class="template-panel">
    <a-tabs size="small" class="template-panel__tabs" :animated="false">
      <!-- 模板库 -->
      <a-tab-pane key="template">
        <template #tab>
          <span>
            <component :is="'AppstoreOutlined'" />
            模板库
          </span>
        </template>
        <a-collapse
          :bordered="false"
          :activeKey="collapseKeys"
          @change="(keys) => (collapseKeys = keys as string[])"
        >
          <a-collapse-panel key="basic" header="基础节点">
            <div
              v-for="item in basicNodes"
              :key="item.type"
              class="tpl-item"
              draggable="true"
              @dragstart="dragNode(item)"
            >
              <component :is="item.icon" class="tpl-item__icon" />
              <span class="tpl-item__name">{{ item.nodeName }}</span>
            </div>
          </a-collapse-panel>
          <a-collapse-panel key="judge" header="判断节点">
            <div
              v-for="item in judgeNodes"
              :key="item.type"
              class="tpl-item"
              draggable="true"
              @dragstart="dragNode(item)"
            >
              <component :is="item.icon" class="tpl-item__icon" />
              <span class="tpl-item__name">{{ item.nodeName }}</span>
            </div>
          </a-collapse-panel>
          <a-collapse-panel key="business" header="业务节点">
            <div
              v-for="item in businessNodes"
              :key="item.type"
              class="tpl-item"
              draggable="true"
              @dragstart="dragNode(item)"
            >
              <component :is="item.icon" class="tpl-item__icon" />
              <span class="tpl-item__name">{{ item.nodeName }}</span>
            </div>
          </a-collapse-panel>
          <a-collapse-panel key="custom" header="自定义模板">
            <a-empty
              v-if="templates.length === 0"
              description="暂无自定义模板，可在节点右键菜单中另存为模板"
              :image-style="{ height: '40px' }"
            />
            <div
              v-for="tpl in templates"
              :key="tpl.id"
              class="tpl-item"
              draggable="true"
              @dragstart="dragTemplate(tpl)"
            >
              <component :is="tpl.node.icon || 'AppstoreOutlined'" class="tpl-item__icon" />
              <span class="tpl-item__name" :title="tpl.name">{{ tpl.name }}</span>
              <span class="tpl-item__actions">
                <component :is="'EditOutlined'" @click.stop="openRename(tpl)" />
                <a-popconfirm
                  title="确认删除该模板？"
                  okText="确认"
                  cancelText="取消"
                  @confirm="confirmDelete(tpl)"
                >
                  <component :is="'DeleteOutlined'" @click.stop />
                </a-popconfirm>
              </span>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </a-tab-pane>
      <!-- 大纲树 -->
      <a-tab-pane key="outline">
        <template #tab>
          <span>
            <component :is="'PartitionOutlined'" />
            大纲
          </span>
        </template>
        <a-empty
          v-if="outlineTree.length === 0"
          description="画布中暂无节点"
          :image-style="{ height: '40px' }"
        />
        <a-tree
          v-else
          :tree-data="outlineTree"
          :selectedKeys="selectedKeys"
          defaultExpandAll
          @select="onSelect"
        />
      </a-tab-pane>
    </a-tabs>

    <!-- 重命名模板 -->
    <a-modal
      v-model:visible="renameVisible"
      title="重命名模板"
      okText="确认"
      cancelText="取消"
      @ok="confirmRename"
    >
      <a-input
        v-model:value="renameValue"
        placeholder="请输入模板名称"
        @pressEnter="confirmRename"
      />
    </a-modal>
  </a-layout-sider>
</template>

<script lang="ts" setup>
  import { computed, ref, PropType } from 'vue';
  import { message } from 'ant-design-vue';
  import { commonNodes, highNodes, laneNodes } from '/@/config/nodes';
  import { IDragInfo, INodeTemplate, IElement } from '/@/type/index';
  import { NodeTypeEnum, CommonNodeTypeEnum } from '/@/type/enums';

  const props = defineProps({
    templates: {
      type: Array as PropType<INodeTemplate[]>,
      default: () => [],
    },
    outlineTree: {
      type: Array as PropType<Recordable[]>,
      default: () => [],
    },
    selectNodeId: {
      type: String,
      default: '',
    },
  });

  const emits = defineEmits(['setDragInfo', 'locateNode', 'renameTemplate', 'deleteTemplate']);

  const collapseKeys = ref<string[]>(['basic', 'judge', 'business', 'custom']);

  // 重命名
  const renameVisible = ref(false);
  const renameValue = ref('');
  const renamingId = ref('');

  type PanelElement = IElement & { belongTo: NodeTypeEnum };

  function withBelongTo(nodes: IElement[], belongTo: NodeTypeEnum): PanelElement[] {
    return nodes.map((n) => ({ ...n, belongTo }));
  }

  // 基础节点
  const basicNodes = computed(() =>
    withBelongTo(
      commonNodes.filter((n) =>
        [
          CommonNodeTypeEnum.START,
          CommonNodeTypeEnum.COMMON,
          CommonNodeTypeEnum.FREEDOM,
          CommonNodeTypeEnum.EVENT,
          CommonNodeTypeEnum.END,
        ].includes(n.type as CommonNodeTypeEnum),
      ),
      NodeTypeEnum.Common_Node_Type,
    ),
  );

  // 判断节点
  const judgeNodes = computed(() =>
    withBelongTo(
      commonNodes.filter((n) => n.type === CommonNodeTypeEnum.GATEWAY),
      NodeTypeEnum.Common_Node_Type,
    ),
  );

  // 业务节点
  const businessNodes = computed(() => [
    ...withBelongTo(highNodes, NodeTypeEnum.High_Node_Type),
    ...withBelongTo(laneNodes, NodeTypeEnum.Lane_Node_Type),
  ]);

  // 大纲树选中节点
  const selectedKeys = computed(() => (props.selectNodeId ? [props.selectNodeId] : []));

  // 拖拽内置节点
  function dragNode(item: PanelElement) {
    const info: IDragInfo = {
      type: item.type,
      belongTo: item.belongTo,
      template: null,
    };
    emits('setDragInfo', info);
  }

  // 拖拽自定义模板
  function dragTemplate(tpl: INodeTemplate) {
    const info: IDragInfo = {
      type: null,
      belongTo: null,
      template: tpl.node,
    };
    emits('setDragInfo', info);
  }

  // 打开重命名弹窗
  function openRename(tpl: INodeTemplate) {
    renamingId.value = tpl.id;
    renameValue.value = tpl.name;
    renameVisible.value = true;
  }

  // 确认重命名
  function confirmRename() {
    if (!renameValue.value.trim()) {
      message.warning('模板名称不能为空！');
      return;
    }
    emits('renameTemplate', { id: renamingId.value, name: renameValue.value.trim() });
    renameVisible.value = false;
    message.success('模板重命名成功！');
  }

  // 确认删除
  function confirmDelete(tpl: INodeTemplate) {
    emits('deleteTemplate', tpl.id);
    message.success('模板删除成功！');
  }

  // 点击大纲树节点
  function onSelect(_keys: any[], info: Recordable) {
    const data = info?.node?.dataRef;
    if (data && data.nodeId) {
      emits('locateNode', { path: data.path || [], nodeId: data.nodeId });
    }
  }
</script>
