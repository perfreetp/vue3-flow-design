import { ref, watch } from 'vue';
import { ls } from 'vue-lsp';
import { cloneDeep } from 'lodash-es';
import { utils } from '/@/utils/common';
import { INodeTemplate } from '/@/type/index';

const TEMPLATE_LS_KEY = 'nodeTemplates';

const templates = ref<INodeTemplate[]>([]);
let inited = false;

// 延迟初始化（需在 app.use(Storage) 之后调用）
function init() {
  if (inited) return;
  inited = true;
  templates.value = ls.get(TEMPLATE_LS_KEY) || [];
  watch(
    templates,
    (val) => {
      ls.set(TEMPLATE_LS_KEY, cloneDeep(val));
    },
    { deep: true },
  );
}

export function useTemplates() {
  init();

  // 新增模板
  function addTemplate(name: string, node: Recordable) {
    templates.value.push({
      id: 'tpl-' + utils.getId(),
      name,
      node: cloneDeep(node),
    });
  }

  // 重命名模板
  function renameTemplate(id: string, name: string) {
    const tpl = templates.value.find((t) => t.id === id);
    if (tpl) tpl.name = name;
  }

  // 删除模板
  function deleteTemplate(id: string) {
    const inx = templates.value.findIndex((t) => t.id === id);
    if (inx > -1) templates.value.splice(inx, 1);
  }

  return {
    templates,
    addTemplate,
    renameTemplate,
    deleteTemplate,
  };
}
