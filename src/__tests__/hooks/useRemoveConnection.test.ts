// Use Jest's automatic mocking for firebase/firestore and provide a simple app mock
jest.mock('firebase/firestore');
jest.mock('../../../src/environments/firebaseConfig', () => ({ app: {} }));

import { deleteDoc, doc, getFirestore } from 'firebase/firestore';
import { useRemoveConnection } from '../../../src/hooks/useRemoveConnection';

describe('useRemoveConnection', () => {
  const mockedGetFirestore = getFirestore as unknown as jest.Mock;
  const mockedDoc = doc as unknown as jest.Mock;
  const mockedDeleteDoc = deleteDoc as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  mockedGetFirestore.mockReturnValue({} as any);
  mockedDoc.mockImplementation((...args: any[]) => ({ db: args[0], id: args[2] } as any));
  });

  test('returns success when deleteDoc resolves', async () => {
    mockedDeleteDoc.mockResolvedValueOnce(undefined as any);

    const remove = useRemoveConnection();
    const result = await remove('conn-123');

    expect(mockedGetFirestore).toHaveBeenCalled();
    expect(mockedDoc).toHaveBeenCalledWith(expect.any(Object), 'connections', 'conn-123');
    expect(mockedDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'conn-123' }));
    expect(result).toEqual({ success: true });
  });

  test('returns failure and logs error when deleteDoc throws', async () => {
    const err = new Error('delete failed');
    mockedDeleteDoc.mockRejectedValueOnce(err as any);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const remove = useRemoveConnection();
    const result = await remove('bad-conn');

    expect(mockedDeleteDoc).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to remove connection:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
