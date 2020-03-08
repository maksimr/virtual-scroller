const {toMatchImageSnapshot} = require('jest-image-snapshot');
const config = require('../../package.json').config;
expect.extend({toMatchImageSnapshot});

describe('VirtualScroller', () => {
  beforeEach(async () => {
    await page.setViewport({width: 800, height: 600});
  });

  it('should render items', async () => {
    await openTestPage();
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  it('should render only one item', async () => {
    await openTestPage({itemCount: 1});
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  it('should scroll to the bottom', async () => {
    await openTestPage();
    await scrollToBottom();
    // Wait util we render item and do scroll correction
    // because actual items size is bigger than expected
    // so we should jump on the top to add extra scroll space
    // for possibility to scroll at the last item
    await page.waitForSelector('[index="2999998"]');
    await scrollToBottom();

    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  it('should re-layout items after resize', async () => {
    await openTestPage();
    await page.setViewport({width: 400, height: 600});
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  it('should render items for passed scroll top', async () => {
    await openTestPage({scrollTop: 300});
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot();
  });

  async function openTestPage(params = {itemCount: 3000000}) {
    const serializedConfig = encodeURIComponent(JSON.stringify(params));
    await page.goto(`${config.url}?${serializedConfig}`);
  }

  async function scrollToBottom() {
    await scrollTo(Infinity);
  }

  async function scrollTo(scrollTop) {
    await page.evaluate((scrollTop) => {
      const appElement = document.getElementById('app');
      appElement.scrollTop = isFinite(scrollTop) ? scrollTop : appElement.scrollHeight;
    }, scrollTop);
  }
});