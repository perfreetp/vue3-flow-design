<template>
  <a-layout-header class="header-option">
    <div class="header-option__tools">
      <span v-for="tool in tools" :key="tool.type">
        <a-tooltip :title="tool.nodeName" placement="right">
          <a-button
            size="small"
            :disabled="simulating"
            :type="currentTool.type === tool.type ? 'primary' : 'default'"
            @click="selectTool(tool.type)"
          >
            <template #icon>
              <component :is="tool.icon" />
            </template>
          </a-button>
        </a-tooltip>
      </span>
    </div>

    <div class="header-option__buttons">
      <a-tooltip title="模拟运行" placement="bottom">
        <a-button
          @click="emits('startSimulation')"
          class="header-option__button"
          size="small"
          :disabled="simulating"
        >
          <template #icon>
            <component :is="'PlayCircleOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="选择历史运行记录进行回放" placement="bottom">
        <a-select
          size="small"
          class="header-option__records"
          placeholder="历史记录回放"
          :value="replayValue"
          :disabled="simulating || records.length <= 0"
          :options="recordOptions"
          @change="onReplay"
        />
      </a-tooltip>

      <a-tooltip title="生成流程图片" placement="bottom">
        <a-button
          @click="emits('generateFlowImage')"
          class="header-option__button"
          size="small"
          :disabled="simulating"
        >
          <template #icon>
            <component :is="'PictureOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-popconfirm
        title="确认要重新绘制吗？"
        placement="bottom"
        okText="确认"
        cancelText="取消"
        @confirm="emits('clear')"
      >
        <a-tooltip title="重新绘制" placement="bottom">
          <a-button class="header-option__button" size="small" :disabled="simulating">
            <template #icon>
              <component :is="'DeleteOutlined'" />
            </template>
          </a-button>
        </a-tooltip>
      </a-popconfirm>

      <a-tooltip :title="flowData.config.showGridText" placement="bottom">
        <a-button
          @click="emits('toggleShowGrid')"
          class="header-option__button"
          size="small"
          :disabled="simulating"
        >
          <component :is="flowData.config.showGridIcon" />
        </a-button>
      </a-tooltip>

      <a-tooltip title="设置" placement="bottom">
        <a-button
          @click="emits('setting')"
          class="header-option__button"
          size="small"
          :disabled="simulating"
        >
          <template #icon>
            <component :is="'SettingOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="测试" placement="bottom">
        <a-button
          @click="emits('openTest')"
          class="header-option__button"
          size="small"
          :disabled="simulating"
        >
          <template #icon>
            <component :is="'ToolOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="快捷键大全" placement="bottom">
        <a-button @click="emits('shortcutHelper')" class="header-option__button" size="small">
          <template #icon>
            <component :is="'BookOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="保存流程" placement="bottom">
        <a-button
          @click="emits('saveFlow')"
          class="header-option__button"
          size="small"
          :disabled="simulating"
        >
          <template #icon>
            <component :is="'SaveOutlined'" />
          </template>
        </a-button>
      </a-tooltip>
    </div>
  </a-layout-header>
</template>

<script lang="ts" setup>
  import { computed, ref, PropType } from 'vue';
  import { ITool, ISimRecord } from '/@/type/index';
  import { ActionsTypeEnum } from '/@/type/enums';
  import { tools } from '/@/config/tools';

  const props = defineProps({
    currentTool: {
      type: Object as PropType<ITool>,
      default: () => ({}),
    },
    flowData: {
      type: Object,
      default: () => ({}),
    },
    simulating: {
      type: Boolean,
      default: false,
    },
    records: {
      type: Array as PropType<ISimRecord[]>,
      default: () => [],
    },
  });

  const emits = defineEmits([
    'selectTool',
    'startSimulation',
    'replay',
    'generateFlowImage',
    'clear',
    'toggleShowGrid',
    'setting',
    'openTest',
    'shortcutHelper',
    'saveFlow',
  ]);

  // 历史记录下拉当前值（选择后立即复位，保持placeholder）
  const replayValue = ref<string>();

  // 历史记录选项
  const recordOptions = computed(() =>
    props.records.map((record: ISimRecord) => ({
      label: record.name,
      value: record.id,
    })),
  );

  // 选择历史记录回放
  function onReplay(recordId: string) {
    replayValue.value = undefined;
    emits('replay', recordId);
  }

  function selectTool(type: ActionsTypeEnum) {
    emits('selectTool', type);
  }
</script>

<style lang="less" scoped>
  .header-option__records {
    width: 170px;
    margin-left: 8px;
    vertical-align: middle;
  }
</style>
