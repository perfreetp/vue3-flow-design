<template>
  <a-drawer title="流程校验结果" placement="right" :width="440" :visible="visible" @close="onClose">
    <template v-if="issues.length > 0">
      <a-alert
        :message="`共发现 ${issues.length} 个问题，点击问题可定位并高亮对应节点或连线`"
        type="warning"
        show-icon
        style="margin-bottom: 12px"
      />
      <a-list :dataSource="issues" size="small" bordered>
        <template #renderItem="{ item }">
          <a-list-item class="validate-issue-item" @click="onLocate(item)">
            <a-tag :color="issueTagColor(item.type)">{{ item.typeName }}</a-tag>
            <span class="validate-issue-item__msg">{{ item.message }}</span>
          </a-list-item>
        </template>
      </a-list>
    </template>
    <a-alert
      v-else
      message="校验通过"
      description="未发现孤立节点、环形连线、未配置条件的连线等问题。"
      type="success"
      show-icon
    />
  </a-drawer>
</template>

<script lang="ts" setup>
  import { PropType } from 'vue';
  import { IFlowIssue, FlowIssueType } from '/@/utils/validate';

  defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    issues: {
      type: Array as PropType<IFlowIssue[]>,
      default: () => [],
    },
  });

  const emits = defineEmits(['update:visible', 'locate']);

  function onClose() {
    emits('update:visible', false);
  }

  function onLocate(issue: IFlowIssue) {
    emits('locate', issue);
  }

  function issueTagColor(type: FlowIssueType) {
    switch (type) {
      case 'isolated':
        return 'orange';
      case 'cycle':
        return 'red';
      case 'noCondition':
        return 'purple';
      case 'noStart':
      case 'noEnd':
        return 'blue';
      default:
        return 'default';
    }
  }
</script>

<style lang="less" scoped>
  .validate-issue-item {
    cursor: pointer;

    &:hover {
      background-color: #f0f5ff;
    }

    &__msg {
      margin-left: 8px;
      flex: 1;
      word-break: break-all;
    }
  }
</style>
