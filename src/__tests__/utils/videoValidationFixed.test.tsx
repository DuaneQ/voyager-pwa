import { validateVideoMetadata } from '../../utils/videoValidation';
import { VIDEO_CONSTRAINTS } from '../../types/Video';

describe('videoValidation', () => {
  describe('validateVideoMetadata', () => {
    it('should validate correct metadata', () => {
      const result = validateVideoMetadata('Valid Title', 'Valid description');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject title that is too long', () => {
      const longTitle = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH + 1);
      
      const result = validateVideoMetadata(longTitle, 'Valid description');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Title too long');
    });

    it('should reject description that is too long', () => {
      const longDescription = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH + 1);
      
      const result = validateVideoMetadata('Valid Title', longDescription);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Description too long');
    });

    it('should detect inappropriate language in title', () => {
      const result = validateVideoMetadata('badword1 in title', 'Clean description');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate language');
    });

    it('should detect inappropriate language in description', () => {
      const result = validateVideoMetadata('Clean title', 'Description with badword2');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate language');
    });

    it('should handle undefined title and description', () => {
      const result = validateVideoMetadata();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
