import { renderHook, act } from '@testing-library/react';
import useUploadImage from '../../hooks/useUploadImage';
import * as firebaseStorage from 'firebase/storage';

// Mock firebase/storage
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn().mockReturnValue({}),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock environments to expose auth
jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
  auth: { currentUser: { uid: 'user-123' } }
}));

describe('useUploadImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads and returns download URL on success', async () => {
    const mockRefObj = { fullPath: 'photos/user-123/profile/my.png' };
    (firebaseStorage.ref as jest.Mock).mockReturnValue(mockRefObj);
    (firebaseStorage.uploadBytes as jest.Mock).mockResolvedValue({ ref: mockRefObj });
    (firebaseStorage.getDownloadURL as jest.Mock).mockResolvedValue('https://cdn.example.com/my.png');

    const { result } = renderHook(() => require('../../hooks/useUploadImage').default());

    const file = new File(['data'], 'my.png', { type: 'image/png' });

    let url: any;
    await act(async () => {
      url = await result.current.uploadImage(file, 'profile');
    });

  expect(firebaseStorage.ref).toHaveBeenCalled();
  const calledPath = (firebaseStorage.ref as jest.Mock).mock.calls[0][1];
  expect(calledPath).toEqual(expect.stringContaining('photos/user-123/profile/'));
    expect(firebaseStorage.uploadBytes).toHaveBeenCalledWith(mockRefObj, file);
    expect(firebaseStorage.getDownloadURL).toHaveBeenCalledWith(mockRefObj);
    expect(url).toBe('https://cdn.example.com/my.png');
  });

  it('handles uploadBytes throwing and does not throw (returns undefined)', async () => {
    const mockRefObj = { fullPath: 'photos/user-123/profile/bad.png' };
    (firebaseStorage.ref as jest.Mock).mockReturnValue(mockRefObj);
    (firebaseStorage.uploadBytes as jest.Mock).mockRejectedValue(new Error('upload failed'));

    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { result } = renderHook(() => require('../../hooks/useUploadImage').default());
    const file = new File(['data'], 'bad.png', { type: 'image/png' });

    let res: any;
    await act(async () => {
      res = await result.current.uploadImage(file, 'profile');
    });

    expect(firebaseStorage.uploadBytes).toHaveBeenCalled();
    expect(res).toBeUndefined();
    spy.mockRestore();
  });

  it('sanitizes filename before creating storage ref', async () => {
    const mockRefObj = { fullPath: 'photos/user-123/slot/safe_name.png' };
    const captured: any[] = [];
    (firebaseStorage.ref as jest.Mock).mockImplementation((storage: any, path: string) => {
      captured.push(path);
      return mockRefObj;
    });
    (firebaseStorage.uploadBytes as jest.Mock).mockResolvedValue({ ref: mockRefObj });
    (firebaseStorage.getDownloadURL as jest.Mock).mockResolvedValue('https://cdn.example.com/safe_name.png');

    const { result } = renderHook(() => require('../../hooks/useUploadImage').default());

    // filename with spaces and special chars should be sanitized
    const file = new File(['data'], '../weird name$#.png', { type: 'image/png' });

    await act(async () => {
      await result.current.uploadImage(file, 'slot');
    });

    expect(captured.length).toBeGreaterThan(0);
    const path = captured[0];
    const filename = path.split('/').pop() as string;
    // filename should not contain spaces or dollar signs and should be allowed chars
    expect(filename).not.toMatch(/\s/);
    expect(filename).not.toMatch(/\$/);
    expect(filename).toMatch(/^[A-Za-z0-9_\-\.]+$/);
  });
});
// ...existing code...