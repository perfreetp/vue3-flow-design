import type { App } from 'vue';
import {
  Button,
  Checkbox,
  Divider,
  Dropdown,
  Drawer,
  Form,
  Input,
  Layout,
  List,
  Modal,
  Menu,
  Popconfirm,
  Row,
  Select,
  Switch,
  Slider,
  Tabs,
  Tag,
  Table,
  Tooltip,
  Radio,
} from 'ant-design-vue';

export function registerAntdComp(app: App) {
  app.use(Button);
  app.use(Checkbox);
  app.use(Divider);
  app.use(Dropdown);
  app.use(Drawer);
  app.use(Form);
  app.use(Input);
  app.use(Layout);
  app.use(List);
  app.use(Modal);
  app.use(Menu);
  app.use(Popconfirm);
  app.use(Row);
  app.use(Select);
  app.use(Switch);
  app.use(Slider);
  app.use(Tabs);
  app.use(Tag);
  app.use(Table);
  app.use(Tooltip);
  app.use(Radio);
}
