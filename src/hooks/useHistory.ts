import { reactive } from 'vue';

// 撤销重做历史记录
export function useHistory(maxLength = 50) {
  const historyState = reactive({
    stack: [] as string[],
    index: -1,
  });

  // 记录快照
  function record(snap: string) {
    if (historyState.stack[historyState.index] === snap) return;
    historyState.stack = historyState.stack.slice(0, historyState.index + 1);
    historyState.stack.push(snap);
    if (historyState.stack.length > maxLength) {
      historyState.stack.shift();
    }
    historyState.index = historyState.stack.length - 1;
  }

  // 重置历史记录
  function reset(snap: string) {
    historyState.stack = [snap];
    historyState.index = 0;
  }

  // 撤销
  function undo(): string | undefined {
    if (historyState.index <= 0) return undefined;
    historyState.index--;
    return historyState.stack[historyState.index];
  }

  // 重做
  function redo(): string | undefined {
    if (historyState.index >= historyState.stack.length - 1) return undefined;
    historyState.index++;
    return historyState.stack[historyState.index];
  }

  return {
    historyState,
    record,
    reset,
    undo,
    redo,
  };
}
