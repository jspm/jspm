import { initDependencies } from './dependencies.js';
import { installFromDependencies } from './api.js';
import { toast } from './toast.js';
import mapapp from './mapapp.js';

window.addEventListener('load', initDragDrop);
async function initDragDrop() {
  const { default: DragDrop } = await import('drag-drop');

  const elm = document.getElementById('drop-target');
  if (!elm)
    return;

  DragDrop('#drop-target', {
    onDragEnter: () => {
      elm.style.border = '1px dashed red';
    },
    onDrop: async (files) => {
      const file = files.find((file) => file.type === 'application/json');
      let content;
      try {
        content = await file.text();
      } catch (e) {
        toast('Failed to read contents of file.');
  
        console.error(e)
        return;
      }
  
      let json;
      try {
        json = JSON.parse(content || '');
      } catch (e) {
        toast('File contents were not valid JSON.');
  
        console.error(e);
        return;
      }
  
      try {
        const installedDeps = await installFromDependencies(json?.dependencies || {});
        mapapp.state.deps = [...mapapp.state.deps, ...installedDeps];
        initDependencies(mapapp.state.deps);
      } catch (e) {
        toast(e);
        console.error(e);
        return;
      }
  
      mapapp.renderMap();
    },
    onDragLeave: () => {
      elm.style.borderLeft = '1px solid #fff';
      elm.style.borderRight = '1px solid #fff';
      elm.style.borderTop = '1px solid #fff';
      elm.style.borderBottom = '1px solid #ededed';
    }
  });
}
