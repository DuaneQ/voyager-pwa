import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareVideoModal } from '../../components/modals/ShareVideoModal';

// Mock shareVideoWithBranding util
jest.mock('../../utils/videoSharing', () => ({
  shareVideoWithBranding: jest.fn()
}));
import { shareVideoWithBranding } from '../../utils/videoSharing';

describe('ShareVideoModal', () => {
  const video = {
    id: 'vid-1',
    title: 'Test Video',
    description: 'A description of the test video',
    thumbnailUrl: '/thumb.jpg',
    videoUrl: 'https://cdn.example/video.mp4'
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    (window as any).open = jest.fn();
  });

  it('copies link to clipboard when Copy Link quick action clicked and shows snackbar', async () => {
    render(<ShareVideoModal open={true} onClose={jest.fn()} video={video} />);

  const copyBtn = screen.getByText(/Copy Link/i);
  await userEvent.click(copyBtn);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/video-share/${video.id}`);
    expect(await screen.findByText(/Link copied to clipboard!/i)).toBeInTheDocument();
  });

  it('calls native share util when Native Share clicked (success path)', async () => {
    (shareVideoWithBranding as jest.Mock).mockResolvedValueOnce(undefined);
    render(<ShareVideoModal open={true} onClose={jest.fn()} video={video} />);

  const nativeBtn = screen.getByText(/Native Share/i);
  await userEvent.click(nativeBtn);

    await waitFor(() => expect(shareVideoWithBranding).toHaveBeenCalledWith(video, `${window.location.origin}/video-share/${video.id}`));
  });

  it('renders social platform buttons and they are clickable', async () => {
    render(<ShareVideoModal open={true} onClose={jest.fn()} video={video} />);

    const heading = screen.getByText(/Share on Social Media/i);
    const container = heading.closest('div');
    expect(container).toBeTruthy();
    const buttons = container ? Array.from(container.querySelectorAll('button')) : [];
    expect(buttons.length).toBeGreaterThan(0);

    // Click each button to ensure handlers don't throw in this environment
    for (const btn of buttons) {
      fireEvent.click(btn);
    }
  });

  it('copies full video details when Copy Title, Description & Link clicked', async () => {
    render(<ShareVideoModal open={true} onClose={jest.fn()} video={video} />);

  const copyDetailsBtn = screen.getByText(/Copy Title, Description & Link/i);
  await userEvent.click(copyDetailsBtn);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    const written = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0] as string;
    expect(written).toContain(video.title);
    expect(written).toContain(video.description);
    expect(written).toContain(`/video-share/${video.id}`);
    expect(await screen.findByText(/Video details copied to clipboard!/i)).toBeInTheDocument();
  });
});
