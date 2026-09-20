import { INode, ILink } from '/@/type/index';
import { CommonNodeTypeEnum, LaneNodeTypeEnum } from '/@/type/enums';

export type FlowIssueType = 'isolated' | 'cycle' | 'noCondition' | 'noStart' | 'noEnd';

export interface IFlowIssue {
  key: string;
  type: FlowIssueType;
  typeName: string;
  message: string;
  nodeId?: string;
  linkId?: string;
}

const laneTypes: string[] = [LaneNodeTypeEnum.X_LANE, LaneNodeTypeEnum.Y_LANE];

// 校验流程：孤立节点、环形连线、未配置条件的连线、缺少开始/结束节点
export function validateFlow(nodeList: INode[], linkList: ILink[]): IFlowIssue[] {
  const issues: IFlowIssue[] = [];
  const bizNodes = nodeList.filter((node: INode) => !laneTypes.includes(node.type));

  if (bizNodes.length <= 0) {
    issues.push({
      key: 'empty',
      type: 'noStart',
      typeName: '流程为空',
      message: '流程图中没有任何节点！',
    });
    return issues;
  }

  // 缺少开始/结束节点
  if (!bizNodes.some((node: INode) => node.type === CommonNodeTypeEnum.START)) {
    issues.push({
      key: 'no-start',
      type: 'noStart',
      typeName: '缺少开始节点',
      message: '流程中没有开始节点！',
    });
  }
  if (!bizNodes.some((node: INode) => node.type === CommonNodeTypeEnum.END)) {
    issues.push({
      key: 'no-end',
      type: 'noEnd',
      typeName: '缺少结束节点',
      message: '流程中没有结束节点！',
    });
  }

  // 孤立节点
  bizNodes.forEach((node: INode) => {
    const linked = linkList.some(
      (link: ILink) => link.sourceId === node.id || link.targetId === node.id,
    );
    if (!linked && bizNodes.length > 1) {
      issues.push({
        key: 'isolated-' + node.id,
        type: 'isolated',
        typeName: '孤立节点',
        message: `节点「${node.nodeName}」(${node.id}) 没有任何连线！`,
        nodeId: node.id,
      });
    }
  });

  // 未配置条件的连线（网关节点的出线必须配置条件文本）
  linkList.forEach((link: ILink) => {
    const sourceNode = nodeList.find((node: INode) => node.id === link.sourceId);
    if (
      sourceNode &&
      sourceNode.type === CommonNodeTypeEnum.GATEWAY &&
      (!link.label || link.label.trim() === '')
    ) {
      issues.push({
        key: 'no-condition-' + link.id,
        type: 'noCondition',
        typeName: '未配置条件',
        message: `网关「${sourceNode.nodeName}」的出线 (${link.id}) 未配置条件文本！`,
        linkId: link.id,
      });
    }
  });

  // 环形连线检测（DFS）
  const adj = new Map<string, string[]>();
  linkList.forEach((link: ILink) => {
    if (!link.sourceId || !link.targetId) return;
    if (!adj.has(link.sourceId)) adj.set(link.sourceId, []);
    adj.get(link.sourceId)!.push(link.targetId);
  });
  const visitState = new Map<string, number>(); // 1: 访问中 2: 已完成
  const stack: string[] = [];
  const cycleLinkIds = new Set<string>();

  function dfs(nodeId: string) {
    visitState.set(nodeId, 1);
    stack.push(nodeId);
    (adj.get(nodeId) || []).forEach((nextId) => {
      if (visitState.get(nextId) === 1) {
        // 发现回边，提取环上的所有连线
        const idx = stack.indexOf(nextId);
        const cycleNodes = stack.slice(idx).concat([nextId]);
        for (let i = 0; i < cycleNodes.length - 1; i++) {
          const link = linkList.find(
            (l: ILink) => l.sourceId === cycleNodes[i] && l.targetId === cycleNodes[i + 1],
          );
          if (link) cycleLinkIds.add(link.id);
        }
      } else if (!visitState.get(nextId)) {
        dfs(nextId);
      }
    });
    stack.pop();
    visitState.set(nodeId, 2);
  }

  nodeList.forEach((node: INode) => {
    if (!visitState.get(node.id)) dfs(node.id);
  });

  cycleLinkIds.forEach((linkId) => {
    const link = linkList.find((l: ILink) => l.id === linkId);
    issues.push({
      key: 'cycle-' + linkId,
      type: 'cycle',
      typeName: '环形连线',
      message: `连线 (${link?.sourceId} → ${link?.targetId}) 形成环路！`,
      linkId,
    });
  });

  return issues;
}
