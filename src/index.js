import { VirtualScroller } from './virtual-scroller';

function main() {
  VirtualScroller.builder(document.getElementById('app'), {
    itemCount: 10000,
    itemBuilder() {
      const placeholder = document.createElement('div');
      placeholder.style.padding = '8px';
      placeholder.innerHTML = `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`;
      return placeholder;
    }
  });
}

main();
