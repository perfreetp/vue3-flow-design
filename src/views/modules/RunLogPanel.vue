<template>
  <div class="run-log-panel">
    <div class="run-log-panel__header">
      <div class="run-log-panel__title">
        <component :is="'ThunderboltOutlined'" />
        <span>运行日志</span>
        <a-tag :color="statusTag.color" class="run-log-panel__tag">{{ statusTag.text }}</a-tag>
      </div>
      <a-tooltip title="退出并恢复编辑" placement="bottom">
        <a-button size="small" type="text" @click="emits('exit')">
          <template #icon>
            <component :is="'CloseOutlined'" />
          </template>
        </a-button>
      </a-tooltip>
    </div>

    <div v-if="sim.replayRecord" class="run-log-panel__record">
      <component :is="'HistoryOutlined'" />
      <span :title="sim.replayRecord.name">{{ sim.replayRecord.name }}</span>
    </div>

    <div class="run-log-panel__controls">
      <a-tooltip :title="sim.status === SimStatusEnum.RUNNING ? '暂停' : '继续'" placement="top">
        <a-button
          size="small"
          :type="sim.status === SimStatusEnum.RUNNING ? 'primary' : 'default'"
          :disabled="sim.status !== SimStatusEnum.RUNNING && sim.status !== SimStatusEnum.PAUSED"
          @click="emits('togglePause')"
        >
          <template #icon>
            <component
              :is="sim.status === SimStatusEnum.RUNNING ? 'PauseOutlined' : 'CaretRightOutlined'"
            />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="单步(暂停后可用)" placement="top">
        <a-button
          size="small"
          :disabled="sim.status !== SimStatusEnum.PAUSED"
          @click="emits('stepOnce')"
        >
          <template #icon>
            <component :is="'StepForwardOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip title="重置" placement="top">
        <a-button size="small" @click="emits('reset')">
          <template #icon>
            <component :is="'RedoOutlined'" />
          </template>
        </a-button>
      </a-tooltip>

      <a-tooltip v-if="canSaveRecord" title="保存本次运行为历史记录" placement="top">
        <a-button size="small" type="primary" @click="emits('saveRecord')">
          <template #icon>
            <component :is="'SaveOutlined'" />
          </template>
          保存记录
        </a-button>
      </a-tooltip>
    </div>

    <div class="run-log-panel__speed">
      <span class="run-log-panel__speed-label">倍速</span>
      <a-radio-group :value="sim.speed" size="small" button-style="solid" @change="onSpeedChange">
        <a-radio-button :value="0.5">0.5x</a-radio-button>
        <a-radio-button :value="1">1x</a-radio-button>
        <a-radio-button :value="2">2x</a-radio-button>
      </a-radio-group>
    </div>

    <div class="run-log-panel__progress"> 进度 {{ progressText }} </div>

    <div ref="logBodyRef" class="run-log-panel__body">
      <div v-if="sim.logs.length === 0" class="run-log-panel__empty">暂无日志</div>
      <div v-for="(log, idx) in sim.logs" :key="idx" class="run-log-panel__log">
        <span class="run-log-panel__log-time">{{ formatTime(log.time) }}</span>
        <span class="run-log-panel__log-text">{{ log.text }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, watch, nextTick } from 'vue';
  import { SimStatusEnum } from '/@/type/enums';
  import type { ISimLog } from '/@/type/index';

  const props = defineProps({
    sim: {
      type: Object,
      required: true,
    },
    canSaveRecord: {
      type: Boolean,
      default: false,
    },
    formatTime: {
      type: Function as unknown as () => (time: number) => string,
      required: true,
    },
  });

  const emits = defineEmits([
    'exit',
    'togglePause',
    'stepOnce',
    'reset',
    'saveRecord',
    'changeSpeed',
  ]);

  const logBodyRef = ref<HTMLElement>();

  const statusTag = computed(() => {
    switch (props.sim.status) {
      case SimStatusEnum.RUNNING:
        return { text: '运行中', color: 'processing' };
      case SimStatusEnum.PAUSED:
        return { text: '已暂停', color: 'warning' };
      case SimStatusEnum.FINISHED:
        return { text: '已结束', color: 'success' };
      default:
        return { text: '就绪', color: 'default' };
    }
  });

  const progressText = computed(() => {
    let total = props.sim.frames.length;
    let current = total > 0 ? Math.max(props.sim.frameIndex + 1, 0) : 0;
    return `${current} / ${total}`;
  });

  function onSpeedChange(e: { target: { value: number } }) {
    emits('changeSpeed', e.target.value);
  }

  // 日志更新后自动滚动到底部
  watch(
    () => (props.sim.logs as ISimLog[]).length,
    async () => {
      await nextTick();
      let el = logBodyRef.value;
      if (el) el.scrollTop = el.scrollHeight;
    },
  );
</script>
