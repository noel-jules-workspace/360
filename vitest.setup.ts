import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

(globalThis as any).jest = vi;

// Mock canvas
const mockFillRect = vi.fn();
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: mockFillRect,
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(10), width: 10, height: 10 }),
    putImageData: vi.fn()
}) as any;

// Produce a valid dummy jpeg dataurl so piexifjs doesn't crash on tests
const dummyJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(dummyJpegDataUrl) as any;

// Mock URL.createObjectURL
globalThis.URL.createObjectURL = vi.fn();

// Mock Worker
class MockWorker {
    onmessage: any;
    postMessage(data: any) {
        if (data.type === 'init') {
            setTimeout(() => {
                if (this.onmessage) this.onmessage({ data: { type: 'ready' } });
            }, 10);
        }
        if (data.type === 'stitch') {
            setTimeout(() => {
                if (this.onmessage) this.onmessage({ data: { type: 'result', payload: { result: { data: new Uint8ClampedArray(), width: 10, height: 10} } } });
            }, 10);
        }
    }
    terminate() {}
}
(globalThis as any).Worker = MockWorker;

// Mock window.DeviceOrientationEvent to allow attaching listener without failing
(globalThis.window as any).DeviceOrientationEvent = {};

afterEach(() => {
  cleanup();
});
