import { VirtualScroller } from '../lib/virtual-scroller';

function main() {
  const params = JSON.parse(decodeURIComponent(window.location.search.slice(1)) || '{}');
  const count = params.itemCount || 3000000;

  const appElement = document.getElementById('app');

  if (!params.window) {
    appElement.style.height = '80vh';
    appElement.style.overflow = 'auto';
  }

  VirtualScroller.builder(appElement, Object.assign({
    itemCount: count,
    itemBuilder(it) {
      const item = document.createElement('div');
      item.style.padding = '8px';
      item.innerHTML = it % 2 ?
        `<b>${it + 1}</b>/${count} - Lorem Ipsum is simply dummy text` :
        `<b>${it + 1}</b>/${count} - Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`;
      return item;
    }
  }, params));
}

main();
