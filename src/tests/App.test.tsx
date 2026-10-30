import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import React from 'react';
import { vi } from 'vitest';

// Mocking the video/camera and components
vi.mock('react-photo-sphere-viewer', () => ({
  ReactPhotoSphereViewer: () => <div data-testid="photo-sphere-viewer">Viewer</div>
}));

describe('App Component', () => {
  let mockGetUserMedia: any;

  beforeEach(() => {
    mockGetUserMedia = vi.fn().mockImplementation(() =>
      Promise.resolve({
        getTracks: () => [{ stop: vi.fn() }]
      })
    );
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders camera capture by default', async () => {
    render(<App />);
    expect(screen.getByText('Capture 360° Photo')).toBeInTheDocument();

    // Check if camera was requested
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });
  });

  it('transitions to photo sphere viewer after capturing', async () => {
    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('Start Capture')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Capture');

    await act(async () => {
        fireEvent.click(startButton);
    });

    expect(screen.getByText(/Capturing/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('photo-sphere-viewer')).toBeInTheDocument();
    }, { timeout: 6000 });
  }, 10000);

  it('transitions back to capture mode when reset button is clicked', async () => {
    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('Start Capture')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Capture');

    await act(async () => {
        fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('photo-sphere-viewer')).toBeInTheDocument();
    }, { timeout: 6000 });

    const restartButton = screen.getByText('Restart');

    await act(async () => {
        fireEvent.click(restartButton);
    });

    expect(screen.getByText('Capture 360° Photo')).toBeInTheDocument();
  }, 10000);
});
