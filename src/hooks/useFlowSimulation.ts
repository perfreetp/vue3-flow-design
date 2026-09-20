import { reactive, computed, unref, onBeforeUnmount } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { ls } from 'vue-lsp';
import { cloneDeep } from 'lodash-es';
import { CommonNodeTypeEnum, SimStatusEnum, SimModeEnum, SimFrameTypeEnum } from '/@/type/enums';
import { INode, ILink, ISimFrame, ISimLog, IRunRecord } from '/@/type/index';

const RECORDS_KEY = 'simRunRecords';
// 1倍速下每一步的基础间隔(ms)
const BASE_INTERVAL = 1200;
const FLOW_GREEN = '#52c41a';

function pad(num: number) {
  return num < 10 ? '0' + num : '' + num;
}

// 格式化时间 HH:mm:ss.SSS
function formatTime(time: number) {
  let d = new Date(time);
  return (
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds()) +
    '.' +
    String(d.getMilliseconds()).padStart(3, '0')
  );
}

export function useFlowSimulation(flowData: Recordable, plumb: any) {
  // 模拟运行状态
  const sim = reactive({
    status: SimStatusEnum.IDLE as SimStatusEnum,
    mode: SimModeEnum.NONE as SimModeEnum,
    speed: 1,
    // 当前回放的记录
    replayRecord: null as Nullable<IRunRecord>,
    // 运行步骤帧
    frames: [] as ISimFrame[],
    // 当前执行到的帧下标，-1 表示尚未开始
    frameIndex: -1,
    // 日志
    logs: [] as ISimLog[],
    // 正在执行的节点
    activeNodeId: '' as string,
    // 已执行过的节点
    visitedNodeIds: [] as string[],
    // 已执行过的连线
    passedLinkIds: [] as string[],
    // 历史运行记录(仅当前画布)
    records: [] as IRunRecord[],
  });

  // 是否锁定画布(运行/回放会话期间)
  const locked = computed(() => sim.mode !== SimModeEnum.NONE);

  // 是否为运行模式(运行结束后才允许保存记录)
  const canSaveRecord = computed(
    () => sim.mode === SimModeEnum.RUN && sim.status === SimStatusEnum.FINISHED,
  );

  let timer: Nullable<ReturnType<typeof setTimeout>> = null;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  // 获取节点名称
  function getNodeName(nodeId?: string) {
    let node = flowData.nodeList.find((n: INode) => n.id === nodeId);
    return node ? node.nodeName : nodeId ?? '';
  }

  // 添加日志
  function addLog(text: string, time?: number) {
    sim.logs.push({ time: time ?? Date.now(), text });
  }

  // ========== 连线视觉处理 ==========

  // 恢复一条连线的原始样式
  function restoreLink(link: ILink) {
    let conn = unref(plumb)
      ?.getConnections?.()
      ?.find((c: Recordable) => c.canvas?.id === link.id);
    if (!conn) return;
    conn.setPaintStyle({
      stroke: link.cls.linkColor,
      strokeWidth: link.cls.linkThickness,
    });
    conn.canvas?.classList.remove('sim-link-passed');
  }

  // 设置一条连线为绿色流动样式
  function highlightLink(link: ILink) {
    let conn = unref(plumb)
      ?.getConnections?.()
      ?.find((c: Recordable) => c.canvas?.id === link.id);
    if (!conn) return;
    conn.setPaintStyle({ stroke: FLOW_GREEN, strokeWidth: 3 });
    conn.canvas?.classList.add('sim-link-passed');
  }

  // 根据已执行帧重绘节点/连线高亮
  function renderProgress() {
    let visited = new Set<string>();
    let passed = new Set<string>();
    let active = '';

    for (let i = 0; i <= sim.frameIndex; i++) {
      let frame = sim.frames[i];
      if (frame.type === SimFrameTypeEnum.NODE) {
        if (i < sim.frameIndex && frame.refId) visited.add(frame.refId);
        active = frame.refId ?? '';
      } else if (frame.type === SimFrameTypeEnum.LINK) {
        if (frame.refId) passed.add(frame.refId);
        active = frame.sourceId ?? '';
      } else {
        active = '';
      }
    }

    sim.activeNodeId = active;
    sim.visitedNodeIds = Array.from(visited);
    sim.passedLinkIds = Array.from(passed);

    flowData.linkList.forEach((link: ILink) => {
      if (passed.has(link.id)) {
        highlightLink(link);
      } else {
        restoreLink(link);
      }
    });
  }

  // 清除全部模拟高亮
  function clearVisuals() {
    sim.activeNodeId = '';
    sim.visitedNodeIds = [];
    sim.passedLinkIds = [];
    flowData.linkList.forEach((link: ILink) => restoreLink(link));
  }

  // ========== 执行步骤构建(DFS,按连线创建顺序) ==========

  // 构建一次模拟运行的全部步骤帧
  function buildFrames() {
    let frames: ISimFrame[] = [];
    let usedEdges = new Set<string>();
    let nodeStepCount = 0;

    let startNodes = flowData.nodeList.filter((n: INode) => n.type === CommonNodeTypeEnum.START);

    function dfs(nodeId: string) {
      frames.push({
        type: SimFrameTypeEnum.NODE,
        refId: nodeId,
        nodeName: getNodeName(nodeId),
        time: 0,
      });
      nodeStepCount++;

      // 按 linkList 中的顺序(即连线创建顺序)依次执行
      let outs = flowData.linkList.filter((l: ILink) => l.sourceId === nodeId);
      if (outs.length === 0) {
        frames.push({
          type: SimFrameTypeEnum.END,
          endText: `节点「${getNodeName(nodeId)}」无后续连线，分支自动结束`,
          time: 0,
        });
        return;
      }

      outs.forEach((link: ILink) => {
        let edgeKey = link.sourceId + '->' + link.targetId;
        // 环路保护,已走过的连线不再重复
        if (usedEdges.has(edgeKey)) return;
        usedEdges.add(edgeKey);

        frames.push({
          type: SimFrameTypeEnum.LINK,
          refId: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
          sourceName: getNodeName(link.sourceId),
          targetName: getNodeName(link.targetId),
          time: 0,
        });
        dfs(link.targetId as string);
      });
    }

    startNodes.forEach((node: INode) => dfs(node.id));

    frames.push({
      type: SimFrameTypeEnum.END,
      endText: `流程模拟运行结束,共执行 ${nodeStepCount} 个节点步骤`,
      time: 0,
    });
    return frames;
  }

  // ========== 调度 ==========

  // 执行当前帧并输出对应日志
  function applyCurrentFrame() {
    let frame = sim.frames[sim.frameIndex];
    if (!frame) return;

    // 运行模式下在真正执行时记录时间
    if (sim.mode === SimModeEnum.RUN && !frame.time) {
      frame.time = Date.now();
    }

    if (frame.type === SimFrameTypeEnum.NODE) {
      addLog(`执行节点:${frame.nodeName}`, frame.time);
    } else if (frame.type === SimFrameTypeEnum.END) {
      addLog(frame.endText ?? '流程结束', frame.time);
    }
    renderProgress();
  }

  function tick() {
    if (sim.status !== SimStatusEnum.RUNNING) return;
    if (sim.frameIndex >= sim.frames.length - 1) {
      finish();
      return;
    }
    sim.frameIndex++;
    applyCurrentFrame();
    timer = setTimeout(tick, BASE_INTERVAL / sim.speed);
  }

  // ========== 对外操作 ==========

  // 开始模拟运行
  function startRun() {
    if (locked.value) {
      message.warning('正在运行或回放中,请先退出当前会话!');
      return;
    }
    if (flowData.nodeList.length <= 0) {
      message.error('流程图中无任何节点,无法模拟运行!');
      return;
    }
    let hasStart = flowData.nodeList.some((n: INode) => n.type === CommonNodeTypeEnum.START);
    if (!hasStart) {
      message.error('未找到起始节点,无法模拟运行!');
      return;
    }

    sim.mode = SimModeEnum.RUN;
    sim.replayRecord = null;
    sim.status = SimStatusEnum.RUNNING;
    sim.speed = 1;
    sim.frameIndex = -1;
    sim.frames = buildFrames();
    sim.logs = [];
    addLog('开始模拟运行');
    message.success('模拟运行已开始,画布已锁定为只读');

    timer = setTimeout(tick, BASE_INTERVAL / sim.speed);
  }

  // 暂停 / 继续
  function togglePause() {
    if (sim.status === SimStatusEnum.RUNNING) {
      clearTimer();
      sim.status = SimStatusEnum.PAUSED;
      message.info('已暂停');
    } else if (sim.status === SimStatusEnum.PAUSED) {
      sim.status = SimStatusEnum.RUNNING;
      message.info('继续运行');
      timer = setTimeout(tick, BASE_INTERVAL / sim.speed);
    }
  }

  // 单步执行
  function stepOnce() {
    if (sim.status !== SimStatusEnum.PAUSED) {
      message.warning('请先暂停后再单步执行!');
      return;
    }
    if (sim.frameIndex >= sim.frames.length - 1) {
      message.info('已经是最后一步了!');
      return;
    }
    sim.frameIndex++;
    applyCurrentFrame();
    if (sim.frameIndex >= sim.frames.length - 1) {
      finish();
    }
  }

  // 重置到起始位置
  function reset() {
    if (!locked.value) return;
    clearTimer();
    sim.frameIndex = -1;
    // 运行模式重置时清空已记录的执行时间,便于重新计时
    if (sim.mode === SimModeEnum.RUN) {
      sim.frames.forEach((f) => (f.time = 0));
    }
    sim.logs = [];
    clearVisuals();
    sim.status = SimStatusEnum.PAUSED;
    addLog('已重置到起始位置,可单步或继续执行');
    message.info('已重置');
  }

  // 切换倍速
  function changeSpeed(speed: number) {
    if (sim.speed === speed) return;
    sim.speed = speed;
    message.success(`已切换到 ${speed} 倍速`);
  }

  // 结束(自然执行完毕)
  function finish() {
    clearTimer();
    sim.status = SimStatusEnum.FINISHED;
    renderProgress();
    if (sim.mode === SimModeEnum.RUN) {
      message.success('模拟运行结束,画布仍保持只读,可保存记录或退出');
      Modal.confirm({
        title: '模拟运行结束',
        content: '是否将本次运行保存为运行记录?保存后可在历史记录中回放。',
        okText: '保存记录',
        cancelText: '暂不保存',
        onOk: () => saveRecord(),
      });
    } else {
      message.success('回放结束');
    }
  }

  // 退出运行/回放,恢复编辑
  function exit() {
    if (!locked.value) return;
    clearTimer();
    clearVisuals();
    sim.mode = SimModeEnum.NONE;
    sim.status = SimStatusEnum.IDLE;
    sim.replayRecord = null;
    sim.frameIndex = -1;
    sim.frames = [];
    sim.logs = [];
    sim.speed = 1;
    message.success('已退出,画布已恢复编辑');
  }

  // ========== 运行记录 ==========

  // 读取本地全部记录
  function loadRecords() {
    let all: IRunRecord[] = ls.get(RECORDS_KEY) || [];
    sim.records = all.filter((r) => r.flowId === flowData.attr.id);
  }

  // 保存当前运行记录
  function saveRecord() {
    if (!canSaveRecord.value) {
      message.warning('只有模拟运行结束后才能保存运行记录!');
      return;
    }
    let d = new Date();
    let record: IRunRecord = {
      id: 'record-' + d.getTime(),
      flowId: flowData.attr.id,
      name: `运行记录 ${d.getMonth() + 1}-${d.getDate()} ${pad(d.getHours())}:${pad(
        d.getMinutes(),
      )}:${pad(d.getSeconds())}`,
      savedAt: d.getTime(),
      frames: cloneDeep(sim.frames),
    };
    let all: IRunRecord[] = ls.get(RECORDS_KEY) || [];
    all.push(record);
    ls.set(RECORDS_KEY, all);
    loadRecords();
    message.success('运行记录已保存');
  }

  // 回放指定记录
  function replay(recordId: string) {
    if (locked.value) {
      message.warning('请先退出当前运行/回放会话!');
      return;
    }
    let all: IRunRecord[] = ls.get(RECORDS_KEY) || [];
    let record = all.find((r) => r.id === recordId);
    if (!record) {
      message.error('未找到该运行记录!');
      loadRecords();
      return;
    }

    sim.mode = SimModeEnum.REPLAY;
    sim.replayRecord = record;
    sim.status = SimStatusEnum.RUNNING;
    sim.speed = 1;
    sim.frames = cloneDeep(record.frames);
    sim.frameIndex = -1;
    sim.logs = [];
    clearVisuals();
    addLog(`开始回放:${record.name}`);
    message.success('开始回放运行记录,画布已锁定为只读');

    timer = setTimeout(tick, BASE_INTERVAL / sim.speed);
  }

  // 删除单条记录
  function deleteRecord(recordId: string) {
    Modal.confirm({
      title: '删除运行记录',
      content: '确认删除这条运行记录吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => doDeleteRecord(recordId),
    });
  }

  function doDeleteRecord(recordId: string) {
    let all: IRunRecord[] = ls.get(RECORDS_KEY) || [];
    all = all.filter((r) => r.id !== recordId);
    ls.set(RECORDS_KEY, all);
    loadRecords();
    message.success('运行记录已删除');
  }

  // 清空当前画布的历史记录
  function clearRecords() {
    if (sim.records.length <= 0) {
      message.info('暂无运行记录可清空');
      return;
    }
    Modal.confirm({
      title: '清空历史记录',
      content: `确认清空当前画布的全部 ${sim.records.length} 条运行记录吗？此操作不可恢复。`,
      okText: '确认清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => doClearRecords(),
    });
  }

  function doClearRecords() {
    let all: IRunRecord[] = ls.get(RECORDS_KEY) || [];
    all = all.filter((r) => r.flowId !== flowData.attr.id);
    ls.set(RECORDS_KEY, all);
    loadRecords();
    message.success('已清空当前画布的历史运行记录');
  }

  onBeforeUnmount(() => clearTimer());

  return {
    sim,
    locked,
    canSaveRecord,
    formatTime,
    startRun,
    togglePause,
    stepOnce,
    reset,
    exit,
    changeSpeed,
    saveRecord,
    replay,
    deleteRecord,
    clearRecords,
    loadRecords,
  };
}
