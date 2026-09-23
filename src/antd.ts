import type { App } from 'vue';
import {
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Slider,
  Tabs,
  Tag,
  Table,
  Tooltip,
  Tree,
} from 'ant-design-vue';

export function registerAntdComp(app: App) {
  app.use(Badge);
  app.use(Breadcrumb);
  app.use(Button);
  app.use(Checkbox);
  app.use(Collapse);
  app.use(Divider);
  app.use(Drawer);
  app.use(Empty);
  app.use(Form);
  app.use(Input);
  app.use(InputNumber);
  app.use(Layout);
  app.use(List);
  app.use(Modal);
  app.use(Popconfirm);
  app.use(Row);
  app.use(Select);
  app.use(Space);
  app.use(Switch);
  app.use(Slider);
  app.use(Tabs);
  app.use(Tag);
  app.use(Table);
  app.use(Tooltip);
  app.use(Tree);
}
