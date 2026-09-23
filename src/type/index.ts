import {
  ActionsTypeEnum,
  NodeTypeEnum,
  CommonNodeTypeEnum,
  HighNodeTypeEnum,
  LaneNodeTypeEnum,
} from './enums';

import { settingConfig } from '../config/flow';

export type NodesType = CommonNodeTypeEnum | HighNodeTypeEnum | LaneNodeTypeEnum;

export interface IDragInfo {
  type: Nullable<NodesType>;
  belongTo: Nullable<NodeTypeEnum>;
  // 自定义模板节点数据（从模板库拖入时携带）
  template?: Nullable<Recordable>;
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
  // 是否为折叠子流程节点
  isSubflow?: boolean;
  // 子流程内部画布数据
  subflow?: {
    nodeList: INode[];
    linkList: ILink[];
  };
}

// 连线拐点
export interface IWaypoint {
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
    // 虚线样式，如 ''(实线) '5,5'(虚线) '2,2'(点线)
    linkDash?: string;
    // 箭头样式 arrow-终点箭头 none-无箭头 both-双向箭头
    arrowStyle?: string;
  };
  // 手动拐点（存在时按拐点走线）
  waypoints?: IWaypoint[];
}

// 自定义节点模板
export interface INodeTemplate {
  id: string;
  name: string;
  node: Recordable;
}

export interface IShortcutKey {
  code: string;
  codeName: string;
  shortcutName: string;
}

export type ISettingConfig = typeof settingConfig;
