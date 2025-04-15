import { renderHook, act } from '@testing-library/react-hooks';
import useUploadImage from '../../hooks/useUploadImage';

describe('useUploadImage', () => {
    test('should initialize with uploading as false and error as null', () => {
        //Arrange
        const { result } = renderHook(() => useUploadImage());

        //Act
        expect(result.current.uploading).toBe(false);
        expect(result.current.error).toBe(null);
    });
});