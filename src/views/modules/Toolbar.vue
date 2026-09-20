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
      <a-tooltip title="模拟运行" placement="bottom">
        <a-button
          class="header-option__button header-option__sim"
          size="small"
          type="primary"
          ghost
          @click="emits('startRun')"
        >
          <template #icon>
            <component :is="'PlayCircleOutlined'" />
          </template>
          模拟运行
        </a-button>
      </a-tooltip>

      <a-dropdown :trigger="['click']" placement="bottomRight">
        <a-tooltip title="历史运行记录" placement="bottom">
          <a-button class="header-option__button" size="small">
            <template #icon>
              <component :is="'HistoryOutlined'" />
            </template>
            历史记录
            <component :is="'DownOutlined'" />
          </a-button>
        </a-tooltip>
        <template #overlay>
          <a-menu class="history-menu" @click="onHistoryClick">
            <a-menu-item v-if="records.length === 0" key="empty" disabled>
              暂无运行记录
            </a-menu-item>
            <a-menu-item v-for="record in records" :key="record.id">
              <span class="history-menu__item">
                <span class="history-menu__play" @click.stop="emits('replay', record.id)">
                  <component :is="'PlayCircleOutlined'" />
                  {{ record.name }}
                </span>
                <span class="history-menu__del" @click.stop="emits('deleteRecord', record.id)">
                  <component :is="'DeleteOutlined'" />
                </span>
              </span>
            </a-menu-item>
            <a-menu-divider v-if="records.length > 0" />
            <a-menu-item v-if="records.length > 0" key="clearAll" danger>
              <span class="history-menu__clear">
                <component :is="'DeleteOutlined'" />
                清空全部记录
              </span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <a-tooltip title="生成流程图片" placement="bottom">
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
  import { ITool, IRunRecord } from '/@/type/index';
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
    records: {
      type: Array as PropType<IRunRecord[]>,
      default: () => [],
    },
  });

  const emits = defineEmits([
    'selectTool',
    'generateFlowImage',
    'clear',
    'toggleShowGrid',
    'setting',
    'openTest',
    'shortcutHelper',
    'saveFlow',
    'startRun',
    'replay',
    'deleteRecord',
    'clearRecords',
  ]);

  function selectTool(type: ActionsTypeEnum) {
    emits('selectTool', type);
  }

  // 记录项点击默认回放
  function onHistoryClick(info: { key: string }) {
    if (info.key === 'empty') return;
    if (info.key === 'clearAll') {
      emits('clearRecords');
      return;
    }
    emits('replay', info.key);
  }
</script>
