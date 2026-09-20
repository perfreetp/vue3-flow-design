<template>
  <a-drawer
    title="流程校验结果"
    placement="right"
    :width="420"
    :visible="validateVisible"
    @close="onClose"
  >
    <a-result
      v-if="issues.length <= 0"
      status="success"
      title="校验通过"
      subTitle="未发现任何问题"
    />
    <a-alert
      v-else
      type="warning"
      :message="`共发现 ${issues.length} 个问题，点击可定位到对应节点或连线`"
      showIcon
      style="margin-bottom: 12px"
    />
    <a-list v-if="issues.length > 0" size="small" bordered :dataSource="issues">
      <template #renderItem="{ item }">
        <a-list-item class="validate-item" @click="locate(item)">
          <a-list-item-meta :description="item.message">
            <template #title>
              <a-tag :color="tagColor(item.type)">{{ item.typeName }}</a-tag>
            </template>
          </a-list-item-meta>
          <template #actions>
            <component :is="'AimOutlined'" />
          </template>
        </a-list-item>
      </template>
    </a-list>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { PropType } from 'vue';
  import type { IFlowIssue } from '/@/hooks/useValidateFlow';

  defineProps({
    validateVisible: {
      type: Boolean,
      default: false,
    },
    issues: {
      type: Array as PropType<IFlowIssue[]>,
      default: () => [],
    },
  });

  const emits = defineEmits(['update:validateVisible', 'locate']);

  function onClose() {
    emits('update:validateVisible', false);
  }

  function tagColor(type: string) {
    switch (type) {
      case 'isolated':
        return 'orange';
      case 'cycle':
        return 'red';
      case 'noCondition':
        return 'purple';
      default:
        return 'blue';
    }
  }

  function locate(issue: IFlowIssue) {
    emits('locate', issue);
  }
</script>

<style lang="less" scoped>
  .validate-item {
    cursor: pointer;

    &:hover {
      background-color: #f0f5ff;
    }
  }
</style>
