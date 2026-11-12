import { bridgeWheel } from "./wheelBridge";

/** A board root with Excalidraw's interactive canvas, a frame name, a chip on top, and a panel. */
function board() {
  document.body.innerHTML = `
    <div id="root">
      <div class="excalidraw">
        <canvas class="excalidraw__canvas interactive"></canvas>
        <div id="abc-frame-name-f1">โปรเจกต์ · Mint</div>
      </div>
      <div class="layer"><button data-wheel-through id="chip"><span id="chip-label">ทีม</span></button></div>
      <div class="panel" id="panel">a list that scrolls</div>
    </div>
    <button id="outside">elsewhere on the page</button>`;
  const root = document.getElementById("root")!;
  const canvas = root.querySelector("canvas")!;
  const forwarded: WheelEvent[] = [];
  canvas.addEventListener("wheel", (e) => forwarded.push(e as WheelEvent));
  const stop = bridgeWheel(root);
  return { root, canvas, forwarded, stop };
}

function wheel(target: Element, init: WheelEventInit = {}) {
  const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -40, clientX: 300, clientY: 200, ...init });
  target.dispatchEvent(event);
  return event;
}

describe("bridgeWheel", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("zooms the board, not the page, when someone pinches over a chip", () => {
    const { forwarded } = board();
    const event = wheel(document.getElementById("chip-label")!, { ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0]).toMatchObject({ deltaY: -40, ctrlKey: true, clientX: 300, clientY: 200 });
  });

  it("pans the board when someone scrolls over a chip", () => {
    const { forwarded } = board();
    const event = wheel(document.getElementById("chip")!, { deltaX: 12, deltaY: 30, shiftKey: true });
    expect(event.defaultPrevented).toBe(true);
    expect(forwarded[0]).toMatchObject({ deltaX: 12, deltaY: 30, shiftKey: true, ctrlKey: false });
  });

  it("zooms the board over a canvas's name, which Excalidraw itself ignores", () => {
    const { forwarded } = board();
    wheel(document.getElementById("abc-frame-name-f1")!, { metaKey: true });
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0].metaKey).toBe(true);
  });

  it("leaves the canvas's own wheel events alone", () => {
    const { canvas, forwarded } = board();
    const event = wheel(canvas, { ctrlKey: true });
    expect(forwarded).toEqual([event]);
  });

  it("lets panels scroll, but never zooms the page over them", () => {
    const { forwarded } = board();
    const panel = document.getElementById("panel")!;
    expect(wheel(panel).defaultPrevented).toBe(false);
    expect(wheel(panel, { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(forwarded).toHaveLength(0);
  });

  it("ignores the page outside the board, and stops when asked", () => {
    const { forwarded, stop } = board();
    expect(wheel(document.getElementById("outside")!, { ctrlKey: true }).defaultPrevented).toBe(false);
    stop();
    expect(wheel(document.getElementById("chip")!, { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(forwarded).toHaveLength(0);
  });
});
