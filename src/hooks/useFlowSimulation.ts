import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { cloneDeep } from 'lodash-es';
import { ls } from 'vue-lsp';
import { INode, ILink, ISimStep, ISimLog, ISimRecord } from '/@/type/index';
import { CommonNodeTypeEnum, LaneNodeTypeEnum } from '/@/type/enums';
import { utils } from '/@/utils/common';

// 1倍速下每个步骤的间隔（毫秒）
const BASE_INTERVAL = 800;
// 运行记录本地存储key
const RECORD_KEY = 'flowRunRecords';

export function useFlowSimulation() {
  // 模拟运行状态
  const simState = reactive({
    active: false, // 是否处于运行/回放模式（画布锁定）
    mode: 'run' as 'run' | 'replay',
    status: 'idle' as 'idle' | 'running' | 'paused' | 'finished',
    speed: 1,
    recordName: '',
  });

  // 运行日志
  const simLogs = ref<ISimLog[]>([]);

  // 当前画布的历史运行记录
  const simRecords = ref<ISimRecord[]>([]);

  // 画布是否锁定（运行/回放未结束时锁定，结束或退出后恢复）
  const simLocked = computed(() => simState.active && simState.status !== 'finished');

  // 待执行的步骤
  let steps: ISimStep[] = [];
  // 当前执行到的步骤下标
  let stepIndex = 0;
  // 定时器
  let timer: ReturnType<typeof setTimeout> | null = null;
  // 当前流程ID
  let currentFlowId = '';

  // 当前时间（精确到毫秒）
  function now() {
    const d = new Date();
    return (
      d.toLocaleTimeString('zh-CN', { hour12: false }) +
      '.' +
      String(d.getMilliseconds()).padStart(3, '0')
    );
  }

  // 追加日志
  function pushLog(text: string) {
    simLogs.value.push({ time: now(), text });
  }

  // 加载当前流程的历史记录
  function loadRecords(flowId: string) {
    currentFlowId = flowId;
    const all = ls.get(RECORD_KEY) || {};
    simRecords.value = all[flowId] || [];
  }

  // 清除定时器
  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  // 清除画布上的所有高亮
  function clearHighlights() {
    document.querySelectorAll('.sim-active').forEach((el) => el.classList.remove('sim-active'));
    document.querySelectorAll('.sim-done').forEach((el) => el.classList.remove('sim-done'));
    document
      .querySelectorAll('.sim-link-flow')
      .forEach((el) => el.classList.remove('sim-link-flow'));
  }

  // 根据流程数据构建执行步骤（从起始节点出发，按连线创建顺序深度遍历）
  function buildSteps(flowData: Recordable): ISimStep[] | null {
    const nodeList: INode[] = flowData.nodeList;
    const linkList: ILink[] = flowData.linkList;

    if (!nodeList.length) {
      message.error('流程图中无任何节点，无法模拟运行！');
      return null;
    }

    const startNode = nodeList.find(
      (node: INode) =>
        node.type === CommonNodeTypeEnum.START &&
        node.type !== LaneNodeTypeEnum.X_LANE &&
        node.type !== LaneNodeTypeEnum.Y_LANE,
    );
    if (!startNode) {
      message.error('流程中没有起始节点，无法模拟运行！');
      return null;
    }

    const result: ISimStep[] = [];
    const visited = new Set<string>();

    const visit = (node: INode) => {
      result.push({ type: 'node', id: node.id, name: node.nodeName });
      visited.add(node.id);

      // linkList 的顺序即为连线创建顺序
      const outLinks = linkList.filter((link: ILink) => link.sourceId === node.id);
      if (!outLinks.length) {
        result.push({
          type: 'end',
          name: `节点「${node.nodeName}」没有后续连线，当前分支结束`,
        });
        return;
      }

      outLinks.forEach((link: ILink) => {
        const target = nodeList.find((n: INode) => n.id === link.targetId);
        if (!target) return;
        result.push({
          type: 'link',
          id: link.id,
          name: link.label || `${node.nodeName} → ${target.nodeName}`,
        });
        if (visited.has(target.id)) {
          result.push({
            type: 'end',
            name: `节点「${target.nodeName}」已执行过，检测到环路，当前分支结束`,
          });
          return;
        }
        visit(target);
      });
    };

    visit(startNode);
    return result;
  }

  // 应用单个步骤的高亮与日志
  function applyStep(step: ISimStep) {
    if (step.type === 'node') {
      // 上一个正在执行的节点变为已执行
      document.querySelectorAll('.sim-active').forEach((el) => {
        el.classList.remove('sim-active');
        el.classList.add('sim-done');
      });
      if (step.id) document.getElementById(step.id)?.classList.add('sim-active');
      pushLog(`执行节点「${step.name}」`);
    } else if (step.type === 'link') {
      if (step.id) document.getElementById(step.id)?.classList.add('sim-link-flow');
      pushLog(`通过连线「${step.name}」`);
    } else {
      pushLog(step.name);
    }
  }

  // 调度下一步
  function schedule() {
    clearTimer();
    timer = setTimeout(runNext, BASE_INTERVAL / simState.speed);
  }

  // 执行下一步
  function runNext() {
    if (stepIndex >= steps.length) {
      finish();
      return;
    }
    applyStep(steps[stepIndex++]);
    schedule();
  }

  // 执行结束
  function finish() {
    clearTimer();
    document.querySelectorAll('.sim-active').forEach((el) => {
      el.classList.remove('sim-active');
      el.classList.add('sim-done');
    });
    simState.status = 'finished';
    const text = simState.mode === 'run' ? '流程模拟运行结束' : '流程回放结束';
    pushLog(text);
    message.success(
      simState.mode === 'run'
        ? '模拟运行结束，画布已解锁，可保存为运行记录'
        : '回放结束，画布已解锁',
    );
  }

  // 开始模拟运行
  function startSimulation(flowData: Recordable) {
    if (simState.active) {
      message.warning('流程正在运行/回放中，请先退出！');
      return;
    }
    loadRecords(flowData.attr.id);
    const built = buildSteps(flowData);
    if (!built) return;
    steps = built;
    stepIndex = 0;
    simLogs.value = [];
    simState.active = true;
    simState.mode = 'run';
    simState.status = 'running';
    simState.recordName = '';
    pushLog('开始模拟运行流程');
    message.info('开始模拟运行，画布已锁定');
    runNext();
  }

  // 开始回放
  function startReplay(recordId: string) {
    if (simState.active) {
      message.warning('流程正在运行/回放中，请先退出！');
      return;
    }
    const record = simRecords.value.find((r) => r.id === recordId);
    if (!record) {
      message.error('未找到该运行记录！');
      return;
    }
    steps = cloneDeep(record.steps);
    stepIndex = 0;
    simLogs.value = [];
    simState.active = true;
    simState.mode = 'replay';
    simState.status = 'running';
    simState.recordName = record.name;
    pushLog(`开始回放「${record.name}」`);
    message.info(`开始回放「${record.name}」，画布已锁定`);
    runNext();
  }

  // 暂停
  function pause() {
    if (simState.status !== 'running') return;
    clearTimer();
    simState.status = 'paused';
    pushLog('已暂停');
    message.info('已暂停');
  }

  // 继续（重置后作为开始）
  function resume() {
    if (simState.status === 'running') return;
    if (simState.status === 'finished') {
      message.warning('本次运行已结束，请重置或退出！');
      return;
    }
    simState.status = 'running';
    pushLog('继续执行');
    if (stepIndex >= steps.length) {
      finish();
      return;
    }
    applyStep(steps[stepIndex++]);
    schedule();
  }

  // 单步执行
  function stepOnce() {
    if (simState.status === 'finished') {
      message.warning('本次运行已结束，请重置或退出！');
      return;
    }
    clearTimer();
    simState.status = 'paused';
    if (stepIndex >= steps.length) {
      finish();
      return;
    }
    applyStep(steps[stepIndex++]);
    if (stepIndex >= steps.length) finish();
  }

  // 重置
  function reset() {
    clearTimer();
    clearHighlights();
    stepIndex = 0;
    simState.status = 'idle';
    pushLog('已重置，点击继续或单步重新执行');
    message.info('已重置');
  }

  // 切换速度
  function setSpeed(speed: number) {
    simState.speed = speed;
    if (simState.status === 'running') schedule();
    message.info(`已切换为 ${speed}x 速度`);
  }

  // 保存为运行记录
  function saveRecord() {
    if (simState.mode !== 'run' || simState.status !== 'finished') {
      message.warning('仅模拟运行结束后才能保存运行记录！');
      return;
    }
    const all = ls.get(RECORD_KEY) || {};
    const record: ISimRecord = {
      id: 'record-' + utils.getId(),
      name: `运行记录 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      time: Date.now(),
      steps: cloneDeep(steps),
    };
    all[currentFlowId] = [...(all[currentFlowId] || []), record];
    ls.set(RECORD_KEY, all);
    simRecords.value = all[currentFlowId];
    message.success(`已保存「${record.name}」，可在工具栏历史记录中选择回放`);
  }

  // 退出运行/回放
  function exit() {
    clearTimer();
    clearHighlights();
    steps = [];
    stepIndex = 0;
    simState.active = false;
    simState.status = 'idle';
    simState.recordName = '';
    message.info('已退出，画布恢复编辑');
  }

  return {
    simState,
    simLogs,
    simRecords,
    simLocked,
    loadRecords,
    startSimulation,
    startReplay,
    pause,
    resume,
    stepOnce,
    reset,
    setSpeed,
    saveRecord,
    exit,
  };
}
