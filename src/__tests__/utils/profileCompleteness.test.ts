import { checkProfileCompleteness } from '../../utils/profileCompleteness';

describe('checkProfileCompleteness', () => {
  it('returns complete when all required fields are present', () => {
    const completeProfile = {
      username: 'testuser',
      dob: '1990-01-01',
      gender: 'male',
      status: 'single',
      sexualOrientation: 'straight',
    };

    const result = checkProfileCompleteness(completeProfile);

    expect(result.isComplete).toBe(true);
    expect(result.missingFields).toHaveLength(0);
    expect(result.message).toBeUndefined();
  });

  it('identifies missing username', () => {
    const profile = {
      dob: '1990-01-01',
      gender: 'male',
      status: 'single',
      sexualOrientation: 'straight',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toContain('username');
    expect(result.message).toContain('username');
  });

  it('identifies empty username', () => {
    const profile = {
      username: '   ',
      dob: '1990-01-01',
      gender: 'male',
      status: 'single',
      sexualOrientation: 'straight',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toContain('username');
  });

  it('identifies missing dob', () => {
    const profile = {
      username: 'testuser',
      gender: 'male',
      status: 'single',
      sexualOrientation: 'straight',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toContain('date of birth');
  });

  it('identifies missing gender', () => {
    const profile = {
      username: 'testuser',
      dob: '1990-01-01',
      status: 'single',
      sexualOrientation: 'straight',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toContain('gender');
  });

  it('identifies missing status', () => {
    const profile = {
      username: 'testuser',
      dob: '1990-01-01',
      gender: 'male',
      sexualOrientation: 'straight',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toContain('status');
  });

  it('identifies missing sexual orientation', () => {
    const profile = {
      username: 'testuser',
      dob: '1990-01-01',
      gender: 'male',
      status: 'single',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toContain('sexual orientation');
  });

  it('identifies multiple missing fields', () => {
    const profile = {
      username: 'testuser',
    };

    const result = checkProfileCompleteness(profile);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toHaveLength(4);
    expect(result.missingFields).toContain('date of birth');
    expect(result.missingFields).toContain('gender');
    expect(result.missingFields).toContain('status');
    expect(result.missingFields).toContain('sexual orientation');
    expect(result.message).toContain('date of birth');
    expect(result.message).toContain('gender');
    expect(result.message).toContain('status');
    expect(result.message).toContain('sexual orientation');
  });

  it('handles null userProfile', () => {
    const result = checkProfileCompleteness(null);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toHaveLength(5);
  });

  it('handles undefined userProfile', () => {
    const result = checkProfileCompleteness(undefined);

    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toHaveLength(5);
  });
});

export {};
