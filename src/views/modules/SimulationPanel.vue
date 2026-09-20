<template>
  <div class="simulation-panel" v-if="visible">
    <div class="simulation-panel__header">
      <span class="title">
        {{ mode === 'replay' ? '回放记录' : '运行日志' }}
        <a-tag v-if="mode === 'replay' && recordName" color="blue">{{ recordName }}</a-tag>
      </span>
      <span>
        <a-tag :color="statusColor">{{ statusText }}</a-tag>
        <a-tooltip title="退出并恢复编辑" placement="left">
          <a-button size="small" type="text" @click="onClose">
            <template #icon>
              <component :is="'CloseOutlined'" />
            </template>
          </a-button>
        </a-tooltip>
      </span>
    </div>

    <div class="simulation-panel__controls">
      <a-button v-if="status === 'running'" size="small" @click="emits('pause')">
        <template #icon>
          <component :is="'PauseCircleOutlined'" />
        </template>
        暂停
      </a-button>
      <a-button
        v-else
        size="small"
        type="primary"
        :disabled="status === 'finished'"
        @click="emits('resume')"
      >
        <template #icon>
          <component :is="'CaretRightOutlined'" />
        </template>
        {{ status === 'paused' ? '继续' : '开始' }}
      </a-button>
      <a-button size="small" :disabled="status === 'finished'" @click="emits('step')">
        <template #icon>
          <component :is="'StepForwardOutlined'" />
        </template>
        单步
      </a-button>
      <a-button size="small" @click="emits('reset')">
        <template #icon>
          <component :is="'ReloadOutlined'" />
        </template>
        重置
      </a-button>
    </div>

    <div class="simulation-panel__speed">
      <span>速度：</span>
      <a-button
        v-for="s in speedOptions"
        :key="s"
        size="small"
        :type="speed === s ? 'primary' : 'default'"
        @click="emits('speedChange', s)"
      >
        {{ s }}x
      </a-button>
    </div>

    <div class="simulation-panel__logs" ref="logListRef">
      <div v-if="!logs.length" class="log-empty">暂无日志</div>
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        <span class="log-time">{{ log.time }}</span>
        <span class="log-text">{{ log.text }}</span>
      </div>
    </div>

    <div class="simulation-panel__footer" v-if="mode === 'run'">
      <a-button
        type="primary"
        size="small"
        block
        :disabled="status !== 'finished'"
        @click="emits('save')"
      >
        <template #icon>
          <component :is="'SaveOutlined'" />
        </template>
        保存为运行记录
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref, watch, PropType } from 'vue';
  import { ISimLog } from '/@/type/index';

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String as PropType<'run' | 'replay'>,
      default: 'run',
    },
    status: {
      type: String as PropType<'idle' | 'running' | 'paused' | 'finished'>,
      default: 'idle',
    },
    speed: {
      type: Number,
      default: 1,
    },
    recordName: {
      type: String,
      default: '',
    },
    logs: {
      type: Array as PropType<ISimLog[]>,
      default: () => [],
    },
  });

  const emits = defineEmits(['pause', 'resume', 'step', 'reset', 'speedChange', 'save', 'close']);

  const speedOptions = [0.5, 1, 2];

  const logListRef = ref<HTMLElement>();

  const statusText = computed(() => {
    switch (props.status) {
      case 'running':
        return '运行中';
      case 'paused':
        return '已暂停';
      case 'finished':
        return '已结束';
      default:
        return '待开始';
    }
  });

  const statusColor = computed(() => {
    switch (props.status) {
      case 'running':
        return 'processing';
      case 'paused':
        return 'warning';
      case 'finished':
        return 'success';
      default:
        return 'default';
    }
  });

  function onClose() {
    emits('close');
  }

  // 日志自动滚动到底部
  watch(
    () => props.logs.length,
    async () => {
      await nextTick();
      if (logListRef.value) {
        logListRef.value.scrollTop = logListRef.value.scrollHeight;
      }
    },
  );
</script>

<style lang="less" scoped>
  .simulation-panel {
    position: absolute;
    top: 10px;
    right: 10px;
    bottom: 30px;
    width: 300px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    box-shadow: 0 3px 10px rgb(0 0 0 / 15%);

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      font-weight: 600;
      border-bottom: 1px solid #f0f0f0;

      .title {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    &__controls {
      display: flex;
      gap: 6px;
      padding: 8px 10px 0;
    }

    &__speed {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      color: #666;
      border-bottom: 1px solid #f0f0f0;
    }

    &__logs {
      flex: 1;
      padding: 8px 10px;
      overflow-y: auto;
      font-size: 12px;

      .log-empty {
        padding-top: 20px;
        color: #999;
        text-align: center;
      }

      .log-item {
        display: flex;
        gap: 6px;
        padding: 3px 0;
        line-height: 18px;
        border-bottom: 1px dashed #f5f5f5;

        .log-time {
          flex-shrink: 0;
          color: #999;
        }

        .log-text {
          color: #333;
          word-break: break-all;
        }
      }
    }

    &__footer {
      padding: 8px 10px;
      border-top: 1px solid #f0f0f0;
    }
  }
</style>
