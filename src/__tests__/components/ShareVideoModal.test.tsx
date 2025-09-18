import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareVideoModal } from '../../../src/components/modals/ShareVideoModal';

jest.mock('../../../src/utils/videoSharing', () => ({
  shareVideoWithBranding: jest.fn(() => Promise.resolve())
}));

describe('ShareVideoModal', () => {
  const video = {
    id: 'vid123',
    title: 'Test Video',
    description: 'A lovely trip',
    thumbnailUrl: '/thumb.jpg'
  };

  beforeEach(() => {
    // mock clipboard
    // @ts-ignore
    global.navigator.clipboard = { writeText: jest.fn(() => Promise.resolve()) };
    // mock window.open
    // @ts-ignore
    global.open = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal content and copies link when Copy Link button clicked', async () => {
    render(<ShareVideoModal open={true} onClose={() => {}} video={video as any} />);

  // Click the Copy Link quick action (there is also a small icon button with same accessible name)
  const copyBtns = screen.getAllByRole('button', { name: /copy link/i });
  // use the first full-width copy button
  userEvent.click(copyBtns[0]);

  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  expect(screen.getByText(/Link copied to clipboard!/i)).toBeInTheDocument();
  });

  it('opens social share urls when social platform button clicked', () => {
    render(<ShareVideoModal open={true} onClose={() => {}} video={video as any} />);

    const twitterBtn = screen.getByRole('button', { name: /X \(Twitter\)/i });
    userEvent.click(twitterBtn);

  expect(global.open).toHaveBeenCalled();
  const calledWith = (global.open as jest.Mock).mock.calls[0][0];
  // URL parameters are encoded; assert the video id and share path are present in the encoded URL
  expect(calledWith).toEqual(expect.stringContaining('vid123'));
  expect(calledWith).toEqual(expect.stringContaining('video-share'));
  });

  it('calls native share util when Native Share clicked and falls back to copy on failure', async () => {
    const { shareVideoWithBranding } = require('../../../src/utils/videoSharing');
    // make native share fail first
    shareVideoWithBranding.mockImplementationOnce(() => Promise.reject(new Error('fail')));

    render(<ShareVideoModal open={true} onClose={() => {}} video={video as any} />);

    const nativeBtn = screen.getByRole('button', { name: /native share/i });
    userEvent.click(nativeBtn);

    await waitFor(() => expect(shareVideoWithBranding).toHaveBeenCalled());
    // on failure the fallback calls clipboard.writeText
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  });

  it('copies full details when Copy Title, Description & Link clicked', async () => {
    render(<ShareVideoModal open={true} onClose={() => {}} video={video as any} />);

    const copyDetails = screen.getByRole('button', { name: /copy title, description & link/i });
    userEvent.click(copyDetails);

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]).toContain('Test Video');
  });
});
