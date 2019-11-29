import { VirtualScroller } from './virtual-scroller';

function main() {
  const count = 100000;
  VirtualScroller.builder(document.getElementById('app'), {
    itemCount: count,
    itemBuilder(it) {
      const icon = it % 2 ? '🦊' : '🐶';
      const item = document.createElement('div');
      item.style.padding = '8px';
      item.innerHTML = `<b>${it + 1}</b>/${count} - ${icon} Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`;
      return item;
    }
  });
}

main();
