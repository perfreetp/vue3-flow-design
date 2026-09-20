import type { App } from 'vue';
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Drawer,
  Dropdown,
  Form,
  Input,
  Layout,
  List,
  Menu,
  Modal,
  Popconfirm,
  Result,
  Row,
  Select,
  Switch,
  Slider,
  Tabs,
  Tag,
  Table,
  Tooltip,
} from 'ant-design-vue';

export function registerAntdComp(app: App) {
  app.use(Alert);
  app.use(Button);
  app.use(Checkbox);
  app.use(Divider);
  app.use(Drawer);
  app.use(Dropdown);
  app.use(Form);
  app.use(Input);
  app.use(Layout);
  app.use(List);
  app.use(Menu);
  app.use(Modal);
  app.use(Popconfirm);
  app.use(Result);
  app.use(Row);
  app.use(Select);
  app.use(Switch);
  app.use(Slider);
  app.use(Tabs);
  app.use(Tag);
  app.use(Table);
  app.use(Tooltip);
}
