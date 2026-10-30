import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clear all mocks and cleanup after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Polyfill for structureClone
if (typeof structuredClone === 'undefined') {
    global.structuredClone = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    };
}

// Mock Worker for jsdom environment
if (typeof Worker === 'undefined') {
    class WorkerMock {
        url: string;
        onmessage: any;
        constructor(stringUrl: string) {
            this.url = stringUrl;
        }
        postMessage(msg: any) {
            if (this.onmessage && msg.type === 'init') {
                setTimeout(() => {
                    this.onmessage({ data: { type: 'ready' } });
                }, 0);
            }
            if (this.onmessage && msg.type === 'stitch') {
                setTimeout(() => {
                    // Mock ImageData since jsdom doesn't provide it
                    class MockImageData {
                        width: number;
                        height: number;
                        data: Uint8ClampedArray;
                        constructor(width: number, height: number) {
                            this.width = width;
                            this.height = height;
                            this.data = new Uint8ClampedArray(width * height * 4);
                        }
                    }
                    this.onmessage({ data: { type: 'result', payload: { result: new MockImageData(1, 1) } } });
                }, 0);
            }
        }
        terminate() {}
    }
    (global as any).Worker = WorkerMock;
}
// Mock canvas toDataURL

HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/jpeg;base64,mock';
}

// Mock for valid base64 JPEG structure to pass EXIF injector
const validMockJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
HTMLCanvasElement.prototype.toDataURL = function () {
    return validMockJpeg;
}
