import { VirtualScroller } from '../lib/virtual-scroller';

function main() {
  const count = location.search ? Number(location.search.slice(1)) : 3000000;
  VirtualScroller.builder(document.getElementById('app'), {
    bufferSize: 0,
    itemCount: count,
    itemBuilder(it) {
      const icon = it % 2 ? '🦊' : '🐶';
      const item = document.createElement('div');
      item.style.padding = '8px';
      item.innerHTML = it % 2 ?
        `<b>${it + 1}</b>/${count} - ${icon} Lorem Ipsum is simply dummy text` :
        `<b>${it + 1}</b>/${count} - ${icon} Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`;
      return item;
    }
  });
}

main();
