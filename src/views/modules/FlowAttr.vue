<template>
  <a-tabs size="small" :activeKey="activeKey">
    <!-- 流程属性 -->
    <a-tab-pane :key="ActiveTypeEnum.CANVAS" v-if="activeKey === ActiveTypeEnum.CANVAS">
      <template #tab>
        <span>
          <component :is="'ClusterOutlined'" />
          流程属性
        </span>
      </template>
      <a-form layout="vertical">
        <a-form-item label="流程id">
          <a-input :value="flowData.attr.id" disabled />
        </a-form-item>
      </a-form>
    </a-tab-pane>

    <!-- 节点属性 -->
    <a-tab-pane :key="ActiveTypeEnum.NODE" v-if="activeKey === ActiveTypeEnum.NODE">
      <template #tab>
        <span>
          <component :is="'ProfileOutlined'" />
          节点属性
        </span>
      </template>
      <a-form layout="vertical">
        <a-form-item label="类型">
          <a-tag color="purple">{{ currentSelect.type }}</a-tag>
        </a-form-item>
        <a-form-item label="id">
          <a-input :value="currentSelect.id" disabled />
        </a-form-item>
        <a-form-item label="名称" v-if="isAllowChange(currentSelect.type as NodesType)">
          <a-input
            placeholder="请输入节点名称"
            :value="(currentSelect as INode)?.nodeName"
            @change="nodeNameChange"
          />
        </a-form-item>
      </a-form>
    </a-tab-pane>

    <!-- 连线属性 -->
    <a-tab-pane :key="ActiveTypeEnum.CONNECTION" v-if="activeKey === ActiveTypeEnum.CONNECTION">
      <template #tab>
        <span>
          <component :is="'BranchesOutlined'" />
          连线属性
        </span>
      </template>
      <a-form layout="vertical">
        <a-form-item label="id">
          <a-input :value="currentSelect.id" disabled />
        </a-form-item>
        <a-form-item label="源节点">
          <a-input :value="(currentSelect as ILink)?.sourceId" disabled />
        </a-form-item>
        <a-form-item label="目标节点">
          <a-input :value="(currentSelect as ILink)?.targetId" disabled />
        </a-form-item>
        <a-form-item label="文本">
          <a-input :value="(currentSelect as ILink)?.label" @change="linkLabelChange" />
        </a-form-item>
        <a-form-item label="走线方式">
          <a-select
            size="small"
            :value="(currentSelect as ILink)?.cls?.linkType"
            :options="linkTypeOptions"
            @change="linkTypeChange"
          />
        </a-form-item>
        <a-form-item label="线宽">
          <a-slider
            :min="1"
            :max="10"
            :value="(currentSelect as ILink)?.cls?.linkThickness"
            @change="linkThicknessChange"
          />
        </a-form-item>
        <a-form-item label="颜色">
          <div @click="handleColorPicker">
            <color-picker
              :pureColor="(currentSelect as ILink)?.cls?.linkColor"
              @update:pureColor="linkColorChange"
            />
          </div>
        </a-form-item>
        <a-form-item label="虚线样式">
          <a-select
            size="small"
            :value="(currentSelect as ILink)?.cls?.linkDash || ''"
            :options="linkDashOptions"
            @change="linkDashChange"
          />
        </a-form-item>
        <a-form-item label="箭头样式">
          <a-select
            size="small"
            :value="(currentSelect as ILink)?.cls?.arrowStyle || 'arrow'"
            :options="arrowStyleOptions"
            @change="arrowStyleChange"
          />
        </a-form-item>
        <a-form-item v-if="(currentSelect as ILink)?.waypoints?.length" label="拐点">
          <a-space>
            <a-tag color="blue">{{ (currentSelect as ILink)?.waypoints?.length }} 个拐点</a-tag>
            <a-button size="small" danger @click="clearWaypoints">清除拐点</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-tab-pane>
  </a-tabs>
</template>

<script lang="ts" setup>
  import { ChangeEvent } from 'ant-design-vue/lib/_util/EventInterface';
  import { ref, watch, unref, PropType } from 'vue';
  import { message } from 'ant-design-vue';
  import { ColorPicker } from 'vue3-colorpicker';
  import 'vue3-colorpicker/style.css';
  import { INode, ILink, NodesType } from '/@/type/index';
  import { CommonNodeTypeEnum, ActiveTypeEnum } from '/@/type/enums';
  import {
    applyLinkStyle,
    hasWaypoints,
    linkTypeOptions,
    linkDashOptions,
    arrowStyleOptions,
  } from '/@/utils/linkStyle';

  const props = defineProps({
    plumb: {
      type: Object,
      default: () => ({}),
    },
    flowData: {
      type: Object,
      default: () => ({}),
    },
    select: {
      type: Object as PropType<INode | ILink>,
      default: () => ({}),
    },
  });

  const emits = defineEmits(['update:select']);

  const currentSelect = ref<INode | ILink>(props.select);

  const activeKey = ref<string>(ActiveTypeEnum.CANVAS);

  // 修改节点名称
  function nodeNameChange(e: ChangeEvent) {
    (currentSelect.value as INode).nodeName = e.target.value ?? '';
  }

  // 是否可以修改节点名称
  function isAllowChange(type: NodesType) {
    return ![
      CommonNodeTypeEnum.START,
      CommonNodeTypeEnum.END,
      CommonNodeTypeEnum.GATEWAY,
      CommonNodeTypeEnum.EVENT,
    ].includes(type as CommonNodeTypeEnum);
  }

  // 修改连接文本
  function linkLabelChange(e: ChangeEvent) {
    (currentSelect.value as ILink).label = e.target.value ?? '';
    applyLinkStyle(props.plumb, unref(currentSelect) as ILink);
  }

  // 手动触发resize，修复ColorPicker位置
  function handleColorPicker() {
    const evt = new Event('resize', { bubbles: true, cancelable: true });
    window.dispatchEvent(evt);
  }

  // 应用连线样式并提示
  function applyCurrentLinkStyle(tip?: string) {
    applyLinkStyle(props.plumb, unref(currentSelect) as ILink);
    if (tip) message.success(tip);
  }

  // 切换走线方式
  function linkTypeChange(value: string) {
    const link = unref(currentSelect) as ILink;
    link.cls.linkType = value;
    let tip = '走线方式已切换为「' + linkTypeOptions.find((o) => o.value === value)?.label + '」';
    if (hasWaypoints(link)) {
      link.waypoints = [];
      tip += '，手动拐点已清除';
    }
    applyCurrentLinkStyle(tip);
  }

  // 修改线宽
  function linkThicknessChange(value: number) {
    (unref(currentSelect) as ILink).cls.linkThickness = value;
    applyCurrentLinkStyle();
  }

  // 修改颜色
  function linkColorChange(value: string) {
    (unref(currentSelect) as ILink).cls.linkColor = value;
    applyCurrentLinkStyle();
  }

  // 修改虚线样式
  function linkDashChange(value: string) {
    (unref(currentSelect) as ILink).cls.linkDash = value;
    applyCurrentLinkStyle('虚线样式已更新');
  }

  // 修改箭头样式
  function arrowStyleChange(value: string) {
    (unref(currentSelect) as ILink).cls.arrowStyle = value;
    applyCurrentLinkStyle('箭头样式已更新');
  }

  // 清除全部拐点
  function clearWaypoints() {
    const link = unref(currentSelect) as ILink;
    link.waypoints = [];
    applyCurrentLinkStyle('已清除全部拐点，恢复自动走线');
  }

  watch(
    () => props.select,
    (val) => {
      currentSelect.value = val;
      if (!unref(currentSelect)?.type) {
        activeKey.value = ActiveTypeEnum.CANVAS;
      } else if (unref(currentSelect)?.type === 'link') {
        activeKey.value = ActiveTypeEnum.CONNECTION;
      } else {
        activeKey.value = ActiveTypeEnum.NODE;
      }
    },
    { deep: true },
  );

  watch(
    () => currentSelect.value,
    (currentSelect) => {
      emits('update:select', currentSelect);
    },
  );
</script>
