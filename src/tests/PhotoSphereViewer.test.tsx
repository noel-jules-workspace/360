import { render, screen, fireEvent } from '@testing-library/react';
import PhotoSphereViewer from '../components/PhotoSphereViewer';
import React from 'react';
import { vi } from 'vitest';

vi.mock('react-photo-sphere-viewer', () => ({
  ReactPhotoSphereViewer: () => <div data-testid="photo-sphere-viewer">Viewer</div>
}));

describe('PhotoSphereViewer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the viewer and buttons', () => {
    render(<PhotoSphereViewer imageSrc="test.jpg" onReset={vi.fn()} />);

    expect(screen.getByTestId('photo-sphere-viewer')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Restart')).toBeInTheDocument();
  });

  it('calls onReset when restart button is clicked', () => {
    const onResetMock = vi.fn();
    render(<PhotoSphereViewer imageSrc="test.jpg" onReset={onResetMock} />);

    fireEvent.click(screen.getByText('Restart'));
    expect(onResetMock).toHaveBeenCalledTimes(1);
  });

  it('triggers download when download button is clicked', () => {
    render(<PhotoSphereViewer imageSrc="test.jpg" onReset={vi.fn()} />);

    const mockElement = document.createElement('a');
    mockElement.click = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
            return mockElement as any;
        }
        return originalCreateElement(tag);
    });

    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

    fireEvent.click(screen.getByText('Download'));

    expect(mockElement.click).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalledWith(mockElement);
    expect(removeChildSpy).toHaveBeenCalledWith(mockElement);
  });
});
