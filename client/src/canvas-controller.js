const MIN_MAGNIFICATION = 0.05;
const MAX_MAGNIFICATION = 200;


export class CanvasController {

  drawingParameters = {
    nodeFillColor: "#FFF",
    nodeSize: 8,
    handleColor: "#888",
    handleLineWidth: 1,
    hoverNodeSize: 14,
    hoverNodeColor: "#48F",
    hoverNodeLineWidth: 2,
    pathStrokeColor: "#BBB",
    pathLineWidth: 1
  }

  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.scene = null;

    this.magnification = 1;
    this.origin = {x: 0, y: 800};  // TODO choose y based on initial canvas height
    this.needsUpdate = false;

    const resizeObserver = new ResizeObserver(entries => {
      this.setupSize();
      this.draw();
      // console.log('Size changed');
    });
    resizeObserver.observe(this.canvas);

    window.addEventListener("resize", event => this.handleResize(event));
    canvas.addEventListener("wheel", event => this.handleWheel(event));

    // Safari pinch zoom:
    canvas.addEventListener("gesturestart", event => this.handleSafariGestureStart(event));
    canvas.addEventListener("gesturechange", event => this.handleSafariGestureChange(event));
    canvas.addEventListener("gestureend", event => this.handleSafariGestureEnd(event));

    // canvas.addEventListener("mousedown", async (e) => this.testing(e));
    // canvas.addEventListener("scroll", this.onEvent.bind(this));
    // canvas.addEventListener("touchstart", this.onEvent.bind(this), false);
    // canvas.addEventListener("touchmove", this.onEvent.bind(this), false);
    // canvas.addEventListener("touchend", this.onEvent.bind(this), false);
    // canvas.addEventListener("pointerdown", async (e) => this.testing(e), false);
    // canvas.addEventListener("pointermove", this.onEvent.bind(this), false);
    // canvas.addEventListener("pointerup", this.onEvent.bind(this), false);
    // canvas.addEventListener("pointercancel", this.onEvent.bind(this), false);

    this.setupSize();
    this.setNeedsUpdate();
  }

  setupSize() {
    const width = this.canvas.parentElement.getBoundingClientRect().width;
    const height = this.canvas.parentElement.getBoundingClientRect().height;

    const scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.
    this.canvas.width = Math.floor(width * scale);
    this.canvas.height = Math.floor(height * scale);
    this.canvas.style.width = width;
    this.canvas.style.height = height;
  }

  setNeedsUpdate() {
    if (!this.needsUpdate) {
      this.needsUpdate = true;
      setTimeout(() => this.draw(), 0);
    }
  }

  draw() {
    this.needsUpdate = false;
    const scale = window.devicePixelRatio;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.save();
    this.context.scale(scale, scale);
    this.context.translate(this.origin.x, this.origin.y);
    this.context.scale(this.magnification, -this.magnification);
    if (this.scene) {
      this.scene.draw(this);
    }
    this.context.restore();
  }

  // Event handlers

  handleResize(event) {
    this.setupSize();
    this.draw();
  }

  handleWheel(event) {
    event.preventDefault();
    if (event.ctrlKey) {
      this._doPinchMagnify(event, 1 - event.deltaY / 100);
    } else {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        this.origin.x -= event.deltaX;
      } else {
        this.origin.y -= event.deltaY;
      }
      this.setNeedsUpdate();
    }
  }

  handleSafariGestureStart(event) {
    event.preventDefault();
    this._initialMagnification = this.magnification;
    this._doPinchMagnify(event, event.scale);
  }

  handleSafariGestureChange(event) {
    event.preventDefault();
    const zoomFactor = this._initialMagnification * event.scale / this.magnification;
    this._doPinchMagnify(event, zoomFactor);
  }

  handleSafariGestureEnd(event) {
    event.preventDefault();
    delete this._initialMagnification;
  }

  _doPinchMagnify(event, zoomFactor) {
    const center = this.localPoint({x: event.pageX, y: event.pageY});
    const prevMagnification = this.magnification;

    this.magnification = this.magnification * zoomFactor;
    this.magnification = Math.min(Math.max(this.magnification, MIN_MAGNIFICATION), MAX_MAGNIFICATION);

    // adjust origin
    this.origin.x += (1 - zoomFactor) * center.x * prevMagnification;
    this.origin.y -= (1 - zoomFactor) * center.y * prevMagnification;
    this.setNeedsUpdate();
  }

  onEvent(event) {
    console.log(event.type, event);
    event.preventDefault();
  }

  async testing(event) {
    console.log("testing async 1");
    await new Promise(r => setTimeout(r, 500));
    console.log("testing async 2");
  }

  // helpers

  localPoint(point) {
    const x = (point.x - this.canvas.offsetLeft - this.origin.x) / this.magnification;
    const y = -(point.y - this.canvas.offsetTop - this.origin.y) / this.magnification;
    return {x: x, y: y}
  }

}
