import { message } from 'ant-design-vue';
import { utils } from '/@/utils/common';
import { INode } from '/@/type/index';

export function useAlign() {
  // 节点排列前校验节点数量
  function checkAlign(currentSelectGroup) {
    if (currentSelectGroup.length < 2) {
      message.error('请选择至少两个节点！');
      return false;
    }
    return true;
  }

  // 移动节点到指定位置（动画）
  function moveNodeTo(nodeList, node, x, y, flowConfig, plumb) {
    const f = nodeList.find((n: INode) => n.id === node.id);
    if (!f) return;
    plumb.animate(
      node.id,
      { top: y, left: x },
      {
        duration: flowConfig.defaultStyle.alignDuration,
        complete: function () {
          f.x = x;
          f.y = y;
        },
      },
    );
  }

  // 左对齐
  function alignLeft({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const minX = Math.min(...currentSelectGroup.map((n: INode) => n.x));
    currentSelectGroup.forEach((node: INode) => {
      moveNodeTo(nodeList, node, minX, node.y, flowConfig, plumb);
    });
    message.success('左对齐完成！');
  }

  // 右对齐
  function alignRight({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const maxRight = Math.max(...currentSelectGroup.map((n: INode) => n.x + n.width));
    currentSelectGroup.forEach((node: INode) => {
      moveNodeTo(nodeList, node, maxRight - node.width, node.y, flowConfig, plumb);
    });
    message.success('右对齐完成！');
  }

  // 水平等间距
  function horizontalEvenSpacing({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = [...currentSelectGroup].sort((a: INode, b: INode) => a.x - b.x);
    const totalWidth = selectGroup.reduce((sum: number, n: INode) => sum + n.width, 0);
    const minX = selectGroup[0].x;
    const maxRight = Math.max(...selectGroup.map((n: INode) => n.x + n.width));
    const gap = utils.div(maxRight - minX - totalWidth, selectGroup.length - 1);
    let currentX = minX;
    selectGroup.forEach((node: INode) => {
      moveNodeTo(nodeList, node, currentX, node.y, flowConfig, plumb);
      currentX += node.width + gap;
    });
    message.success('水平等间距完成！');
  }

  // 垂直等间距
  function verticalEvenSpacing({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = [...currentSelectGroup].sort((a: INode, b: INode) => a.y - b.y);
    const totalHeight = selectGroup.reduce((sum: number, n: INode) => sum + n.height, 0);
    const minY = selectGroup[0].y;
    const maxBottom = Math.max(...selectGroup.map((n: INode) => n.y + n.height));
    const gap = utils.div(maxBottom - minY - totalHeight, selectGroup.length - 1);
    let currentY = minY;
    selectGroup.forEach((node: INode) => {
      moveNodeTo(nodeList, node, node.x, currentY, flowConfig, plumb);
      currentY += node.height + gap;
    });
    message.success('垂直等间距完成！');
  }

  // 垂直左对齐
  function verticaLeft({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = currentSelectGroup;
    const baseX = selectGroup[0].x;
    let baseY = selectGroup[0].y;
    for (let i = 1; i < selectGroup.length; i++) {
      baseY = baseY + selectGroup[i - 1].height + flowConfig.defaultStyle.alignSpacing.vertical;
      const f = nodeList.find((n: INode) => n.id === selectGroup[i].id);
      f.tx = baseX;
      f.ty = baseY;
      plumb.animate(
        selectGroup[i].id,
        { top: baseY, left: baseX },
        {
          duration: flowConfig.defaultStyle.alignDuration,
          complete: function () {
            f.x = f.tx;
            f.y = f.ty;
          },
        },
      );
    }
    message.success('垂直左对齐完成！');
  }

  // 垂直居中
  function verticalCenter({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = currentSelectGroup;
    let baseX = selectGroup[0].x;
    let baseY = selectGroup[0].y;
    const firstX = baseX;
    for (let i = 1; i < selectGroup.length; i++) {
      baseY = baseY + selectGroup[i - 1].height + flowConfig.defaultStyle.alignSpacing.vertical;
      baseX = firstX + utils.div(selectGroup[0].width, 2) - utils.div(selectGroup[i].width, 2);
      const f = nodeList.find((n: INode) => n.id === selectGroup[i].id);
      f.tx = baseX;
      f.ty = baseY;
      plumb.animate(
        selectGroup[i].id,
        { top: baseY, left: baseX },
        {
          duration: flowConfig.defaultStyle.alignDuration,
          complete: function () {
            f.x = f.tx;
            f.y = f.ty;
          },
        },
      );
    }
    message.success('垂直居中完成！');
  }

  // 垂直右对齐
  function verticalRight({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = currentSelectGroup;
    let baseX = selectGroup[0].x;
    let baseY = selectGroup[0].y;
    const firstX = baseX;
    for (let i = 1; i < selectGroup.length; i++) {
      baseY = baseY + selectGroup[i - 1].height + flowConfig.defaultStyle.alignSpacing.vertical;
      baseX = firstX + selectGroup[0].width - selectGroup[i].width;
      const f = nodeList.find((n: INode) => n.id === selectGroup[i].id);
      f.tx = baseX;
      f.ty = baseY;
      plumb.animate(
        selectGroup[i].id,
        { top: baseY, left: baseX },
        {
          duration: flowConfig.defaultStyle.alignDuration,
          complete: function () {
            f.x = f.tx;
            f.y = f.ty;
          },
        },
      );
    }
    message.success('垂直右对齐完成！');
  }

  // 水平上对齐
  function horizontalUp({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = currentSelectGroup;
    let baseX = selectGroup[0].x;
    const baseY = selectGroup[0].y;
    for (let i = 1; i < selectGroup.length; i++) {
      baseX = baseX + selectGroup[i - 1].width + flowConfig.defaultStyle.alignSpacing.horizontal;
      const f = nodeList.find((n: INode) => n.id === selectGroup[i].id);
      f.tx = baseX;
      f.ty = baseY;
      plumb.animate(
        selectGroup[i].id,
        { top: baseY, left: baseX },
        {
          duration: flowConfig.defaultStyle.alignDuration,
          complete: function () {
            f.x = f.tx;
            f.y = f.ty;
          },
        },
      );
    }
    message.success('水平上对齐完成！');
  }

  // 水平居中
  function horizontalCenter({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = currentSelectGroup;
    let baseX = selectGroup[0].x;
    let baseY = selectGroup[0].y;
    const firstY = baseY;
    for (let i = 1; i < selectGroup.length; i++) {
      baseY = firstY + utils.div(selectGroup[0].height, 2) - utils.div(selectGroup[i].height, 2);
      baseX = baseX + selectGroup[i - 1].width + flowConfig.defaultStyle.alignSpacing.horizontal;
      const f = nodeList.find((n: INode) => n.id === selectGroup[i].id);
      f.tx = baseX;
      f.ty = baseY;
      plumb.animate(
        selectGroup[i].id,
        { top: baseY, left: baseX },
        {
          duration: flowConfig.defaultStyle.alignDuration,
          complete: function () {
            f.x = f.tx;
            f.y = f.ty;
          },
        },
      );
    }
    message.success('水平居中完成！');
  }

  // 水平下对齐
  function horizontalDown({ currentSelectGroup, flowData, flowConfig, plumb }) {
    if (!checkAlign(currentSelectGroup)) return;
    const nodeList = flowData.nodeList;
    const selectGroup = currentSelectGroup;
    let baseX = selectGroup[0].x;
    let baseY = selectGroup[0].y;
    const firstY = baseY;
    for (let i = 1; i < selectGroup.length; i++) {
      baseY = firstY + selectGroup[0].height - selectGroup[i].height;
      baseX = baseX + selectGroup[i - 1].width + flowConfig.defaultStyle.alignSpacing.horizontal;
      const f = nodeList.find((n: INode) => n.id === selectGroup[i].id);
      f.tx = baseX;
      f.ty = baseY;
      plumb.animate(
        selectGroup[i].id,
        { top: baseY, left: baseX },
        {
          duration: flowConfig.defaultStyle.alignDuration,
          complete: function () {
            f.x = f.tx;
            f.y = f.ty;
          },
        },
      );
    }
    message.success('水平下对齐完成！');
  }

  return {
    verticaLeft,
    verticalCenter,
    verticalRight,
    horizontalUp,
    horizontalCenter,
    horizontalDown,
    alignLeft,
    alignRight,
    horizontalEvenSpacing,
    verticalEvenSpacing,
  };
}
