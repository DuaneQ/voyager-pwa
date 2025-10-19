// @ts-nocheck
// Minimal canvas and Image polyfill for tests.
// Provides a stubbed 2D context and a simple Image implementation that calls onload.
// This keeps tests from failing when code uses canvas APIs under jsdom.

// Avoid redefining if already present
if (typeof HTMLCanvasElement !== 'undefined' && !(HTMLCanvasElement.prototype as any).getContextPolyfilled) {
  (HTMLCanvasElement.prototype as any).getContextPolyfilled = true;

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
    if (type !== '2d') return null as any;

    // Basic stub implementation covering methods used in the codebase
    const ctx: any = {
      fillStyle: '#000',
      strokeStyle: '#000',
      font: '10px sans-serif',
      textAlign: 'start',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      createLinearGradient: () => ({ addColorStop: (_: number, __: string) => {} }),
      measureText: (text: string) => ({ width: (text && text.length) ? text.length * 8 : 0 }),
      toDataURL: () => 'data:image/png;base64,FAKE_CANVAS',
      putImageData: () => {},
      getImageData: () => ({ data: [] }),
    };

    return ctx;
  };
}

// Minimal Image polyfill that triggers onload asynchronously when src is set.
// If a real environment provides Image, don't overwrite it.
if (typeof (global as any).Image === 'undefined') {
  function TestImageConstructor(this: any) {
    this.onload = null;
    this.onerror = null;
    this._src = '';

    Object.defineProperty(this, 'src', {
      configurable: true,
      enumerable: true,
      get: function () { return this._src; },
      set: function (val: string) {
        this._src = val;
        // Simulate async load
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    });
  }

  (global as any).Image = TestImageConstructor as any;
}

// Ensure canvas.toDataURL exists on element instances returned in tests
try {
  const proto = HTMLCanvasElement.prototype as any;
  if (!proto.toDataURL) {
    proto.toDataURL = function () { return 'data:image/png;base64,FAKE_CANVAS'; };
  }
} catch (e) {
  // ignore - some test environments may not have HTMLCanvasElement
}

// Make this file a module so TypeScript's --isolatedModules accepts it
export {};
