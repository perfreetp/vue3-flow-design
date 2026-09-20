import { INode, ILink } from '/@/type/index';
import { CommonNodeTypeEnum, LaneNodeTypeEnum } from '/@/type/enums';

export interface IFlowIssue {
  key: string;
  type: 'isolated' | 'cycle' | 'noCondition' | 'noStart' | 'noEnd';
  typeName: string;
  message: string;
  nodeIds: string[];
  linkIds: string[];
}

// 流程校验
export function useValidateFlow() {
  // 检测孤立节点
  function checkIsolatedNodes(nodeList: INode[], linkList: ILink[], issues: IFlowIssue[]) {
    nodeList.forEach((node: INode) => {
      if (node.type === LaneNodeTypeEnum.X_LANE || node.type === LaneNodeTypeEnum.Y_LANE) return;
      const related = linkList.find(
        (link: ILink) => link.sourceId === node.id || link.targetId === node.id,
      );
      if (!related) {
        issues.push({
          key: 'isolated-' + node.id,
          type: 'isolated',
          typeName: '孤立节点',
          message: `节点「${node.nodeName}」(${node.id}) 没有任何连线`,
          nodeIds: [node.id],
          linkIds: [],
        });
      }
    });
  }

  // 检测环形连线
  function checkCycleLinks(nodeList: INode[], linkList: ILink[], issues: IFlowIssue[]) {
    const adjacency: Record<string, string[]> = {};
    linkList.forEach((link: ILink) => {
      if (!link.sourceId || !link.targetId) return;
      if (!adjacency[link.sourceId]) adjacency[link.sourceId] = [];
      adjacency[link.sourceId].push(link.targetId);
    });

    const visited: Record<string, number> = {}; // 0未访问 1访问中 2已完成
    const reported: string[] = [];

    function dfs(nodeId: string, path: string[]) {
      visited[nodeId] = 1;
      path.push(nodeId);
      const nextIds = adjacency[nodeId] || [];
      nextIds.forEach((nextId) => {
        if (visited[nextId] === 1) {
          // 找到环
          const cycleNodes = path.slice(path.indexOf(nextId)).concat(nextId);
          const cycleKey = cycleNodes.slice().sort().join(',');
          if (!reported.includes(cycleKey)) {
            reported.push(cycleKey);
            const cycleLinks = linkList.filter((link: ILink) => {
              const inx = cycleNodes.indexOf(link.sourceId ?? '');
              return inx >= 0 && cycleNodes[inx + 1] === link.targetId;
            });
            const nodeNames = cycleNodes
              .slice(0, -1)
              .map((id) => nodeList.find((n: INode) => n.id === id)?.nodeName ?? id)
              .join(' -> ');
            issues.push({
              key: 'cycle-' + cycleKey,
              type: 'cycle',
              typeName: '环形连线',
              message: `存在环形连线：${nodeNames}`,
              nodeIds: cycleNodes.slice(0, -1),
              linkIds: cycleLinks.map((l: ILink) => l.id),
            });
          }
        } else if (!visited[nextId]) {
          dfs(nextId, path);
        }
      });
      path.pop();
      visited[nodeId] = 2;
    }

    nodeList.forEach((node: INode) => {
      if (!visited[node.id]) dfs(node.id, []);
    });
  }

  // 检测未配置条件的连线
  function checkNoConditionLinks(nodeList: INode[], linkList: ILink[], issues: IFlowIssue[]) {
    linkList.forEach((link: ILink) => {
      const sourceNode = nodeList.find((n: INode) => n.id === link.sourceId);
      if (sourceNode?.type === CommonNodeTypeEnum.GATEWAY && !link.label) {
        issues.push({
          key: 'noCondition-' + link.id,
          type: 'noCondition',
          typeName: '未配置条件',
          message: `网关「${sourceNode.nodeName}」到「${
            nodeList.find((n: INode) => n.id === link.targetId)?.nodeName ?? link.targetId
          }」的连线未配置条件`,
          nodeIds: [],
          linkIds: [link.id],
        });
      }
    });
  }

  // 检测开始/结束节点
  function checkStartEndNode(nodeList: INode[], issues: IFlowIssue[]) {
    if (nodeList.length <= 0) return;
    const hasStart = nodeList.some((n: INode) => n.type === CommonNodeTypeEnum.START);
    const hasEnd = nodeList.some((n: INode) => n.type === CommonNodeTypeEnum.END);
    if (!hasStart) {
      issues.push({
        key: 'noStart',
        type: 'noStart',
        typeName: '缺少开始节点',
        message: '流程中没有开始节点',
        nodeIds: [],
        linkIds: [],
      });
    }
    if (!hasEnd) {
      issues.push({
        key: 'noEnd',
        type: 'noEnd',
        typeName: '缺少结束节点',
        message: '流程中没有结束节点',
        nodeIds: [],
        linkIds: [],
      });
    }
  }

  // 校验流程
  function validateFlow(nodeList: INode[], linkList: ILink[]): IFlowIssue[] {
    const issues: IFlowIssue[] = [];
    checkIsolatedNodes(nodeList, linkList, issues);
    checkCycleLinks(nodeList, linkList, issues);
    checkNoConditionLinks(nodeList, linkList, issues);
    checkStartEndNode(nodeList, issues);
    return issues;
  }

  return {
    validateFlow,
  };
}
