import '@testing-library/jest-dom'

// jsdom's Blob/File don't implement arrayBuffer(); FileReader does work, so bridge through it.
if (typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function arrayBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}

// jsdom has no IntersectionObserver. PageThumbnail uses one to defer canvas
// rendering until it scrolls into view; in tests we report "always visible" so the
// thumbnail renders immediately.
if (typeof globalThis.IntersectionObserver !== 'function') {
  class TestIntersectionObserver {
    private readonly callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }

    observe(target: Element): void {
      this.callback(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }

    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  globalThis.IntersectionObserver =
    TestIntersectionObserver as unknown as typeof IntersectionObserver
}

// jsdom has no PointerEvent. TextBoxItem's drag handles listen for pointer events;
// a MouseEvent-backed shim lets tests dispatch them.
if (typeof globalThis.PointerEvent !== 'function') {
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? 'mouse'
    }
  }
  globalThis.PointerEvent = TestPointerEvent as unknown as typeof PointerEvent
}
