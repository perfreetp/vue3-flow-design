#### 在线演示

[点击预览](https://a63149300.github.io/vue3-flow-design/)

#### 介绍

- VUE3 FLOW DESIGN 流程设计器，基于 Vue3 + TypeScript + Vite + Ant Design Vue 3 + JSPlumb，你也可以选择 VUE2 版本[Vue-flow-design-plus](https://gitee.com/zhangyeping/vue-flow-design-plus)。
- Vue3 版本以全新的技术栈重构了代码，并在原版基础上实现了更好的操作方式，新版会作为优先版本持续迭代。

#### 主要功能

- 画布多选与框选：支持左对齐、右对齐、水平等间距、垂直等间距，多选节点可成组拖动、复制粘贴（含组内连线）与批量删除，右键菜单提供以上操作
- 撤销重做：节点增删改、连线增删、属性面板修改均支持 Ctrl+Z 撤销、Ctrl+Y 重做，顶部工具栏同步显示可撤销/重做状态
- 流程校验：自动检测孤立节点、环形连线、未配置条件的连线、缺少开始/结束节点等问题，校验结果列表展示，点击问题可定位并高亮对应节点或连线
- 导入导出：支持将整个流程图导出为 JSON 与 PNG 图片，导入 JSON 后完整还原节点位置、连线与全部属性

#### 环境版本

- 新的技术栈需要较高的 node 版本，我用的 node: v16.15.1, npm: 8.11.0

#### 技术栈

- VUE3
- TypeScript
- Vite
- Ant Design Vue 3
- JSPlumb
- resizable-dom
- vue3-json-viewer
- ...

#### 操作命令

- 安装项目 node_modules 包：yarn or pnpm

- 启动项目：yarn run dev or pnmp run dev

- 构建项目 dist 文件夹资源：yarn run build or pnpm run build

#### 效果演示

- 最新界面效果 ![01](README.assets/01.png)
