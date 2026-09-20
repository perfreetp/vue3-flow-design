<template>
  <a-layout-header class="header-option">
    <div class="header-option__tools">
      <span v-for="tool in tools" :key="tool.type">
        <a-tooltip :title="tool.nodeName" placement="right">
          <a-button
            size="small"
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
      <a-tooltip title="撤销 (Ctrl+Z)" placement="bottom">
        <a-button
          @click="emits('undo')"
          :disabled="!canUndo"
          class="header-option__button"
          size="small"
        >
          <template #icon>
            <component :is="'UndoOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="重做 (Ctrl+Y)" placement="bottom">
        <a-button
          @click="emits('redo')"
          :disabled="!canRedo"
          class="header-option__button"
          size="small"
        >
          <template #icon>
            <component :is="'RedoOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="流程校验" placement="bottom">
        <a-button @click="emits('validate')" class="header-option__button" size="small">
          <template #icon>
            <component :is="'SafetyCertificateOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="导入JSON" placement="bottom">
        <a-button @click="emits('importFlow')" class="header-option__button" size="small">
          <template #icon>
            <component :is="'ImportOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="导出JSON" placement="bottom">
        <a-button @click="emits('exportJson')" class="header-option__button" size="small">
          <template #icon>
            <component :is="'ExportOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="导出图片(PNG)" placement="bottom">
        <a-button @click="emits('generateFlowImage')" class="header-option__button" size="small">
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
          <a-button class="header-option__button" size="small">
            <template #icon>
              <component :is="'DeleteOutlined'" />
            </template>
          </a-button>
        </a-tooltip>
      </a-popconfirm>

      <a-tooltip :title="flowData.config.showGridText" placement="bottom">
        <a-button @click="emits('toggleShowGrid')" class="header-option__button" size="small">
          <component :is="flowData.config.showGridIcon" />
        </a-button>
      </a-tooltip>

      <a-tooltip title="设置" placement="bottom">
        <a-button @click="emits('setting')" class="header-option__button" size="small">
          <template #icon>
            <component :is="'SettingOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="测试" placement="bottom">
        <a-button @click="emits('openTest')" class="header-option__button" size="small">
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
        <a-button @click="emits('saveFlow')" class="header-option__button" size="small">
          <template #icon>
            <component :is="'SaveOutlined'" />
          </template>
        </a-button>
      </a-tooltip>
    </div>
  </a-layout-header>
</template>

<script lang="ts" setup>
  import { PropType } from 'vue';
  import { ITool } from '/@/type/index';
  import { ActionsTypeEnum } from '/@/type/enums';
  import { tools } from '/@/config/tools';

  defineProps({
    currentTool: {
      type: Object as PropType<ITool>,
      default: () => ({}),
    },
    flowData: {
      type: Object,
      default: () => ({}),
    },
    canUndo: {
      type: Boolean,
      default: false,
    },
    canRedo: {
      type: Boolean,
      default: false,
    },
  });

  const emits = defineEmits([
    'selectTool',
    'undo',
    'redo',
    'validate',
    'importFlow',
    'exportJson',
    'generateFlowImage',
    'clear',
    'toggleShowGrid',
    'setting',
    'openTest',
    'shortcutHelper',
    'saveFlow',
  ]);

  function selectTool(type: ActionsTypeEnum) {
    emits('selectTool', type);
  }
</script>
