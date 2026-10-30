import { inject360Metadata } from '../lib/exif';
import { vi } from 'vitest';


describe('EXIF Injection', () => {
    it('should successfully inject basic EXIF data', () => {
        const dummyDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
        const result = inject360Metadata(dummyDataUrl, 2000, 1000);
        expect(result).not.toBe(dummyDataUrl);
        expect(result.startsWith('data:image/jpeg')).toBe(true);
    });

    it('should return original data URL if injection fails', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // providing a totally invalid jpeg to force piexif to throw an error internally during splitIntoSegments
        const dummyDataUrl = 'data:image/jpeg;base64,invalid';
        const result = inject360Metadata(dummyDataUrl, 2000, 1000);
        expect(result).toBe(dummyDataUrl);
        expect(spy).toHaveBeenCalled();

        spy.mockRestore();
    });
});
