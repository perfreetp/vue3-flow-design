import {
  ActionsTypeEnum,
  NodeTypeEnum,
  CommonNodeTypeEnum,
  HighNodeTypeEnum,
  LaneNodeTypeEnum,
  SimFrameTypeEnum,
} from './enums';

import { settingConfig } from '../config/flow';

export type NodesType = CommonNodeTypeEnum | HighNodeTypeEnum | LaneNodeTypeEnum;

export interface IDragInfo {
  type: Nullable<NodesType>;
  belongTo: Nullable<NodeTypeEnum>;
}

export interface ITool {
  type: ActionsTypeEnum;
  nodeName: string;
  icon: string;
}

export interface IElement {
  type: NodesType;
  nodeName: string;
  icon: string;
}

export interface INode {
  height: number;
  icon?: string;
  id: string;
  nodeName: string;
  type: string;
  width: number;
  x: number;
  y: number;
}

export interface ILink {
  type: string;
  id: string;
  sourceId?: string;
  targetId?: string;
  label: string;
  cls: {
    linkType: string;
    linkColor: string;
    linkThickness: number;
  };
}

export interface IShortcutKey {
  code: string;
  codeName: string;
  shortcutName: string;
}

export type ISettingConfig = typeof settingConfig;

// 单步模拟帧
export interface ISimFrame {
  type: SimFrameTypeEnum;
  // NODE / LINK 时为对应元素ID
  refId?: string;
  // 用于渲染时解析名称（节点名/源->目标）
  nodeName?: string;
  // LINK 帧的来源、目标
  sourceId?: string;
  targetId?: string;
  sourceName?: string;
  targetName?: string;
  // END 帧的日志文案
  endText?: string;
  // 记录时的真实时间戳
  time: number;
}

// 运行日志条目
export interface ISimLog {
  time: number;
  text: string;
}

// 历史运行记录
export interface IRunRecord {
  id: string;
  flowId: string;
  name: string;
  savedAt: number;
  frames: ISimFrame[];
}
