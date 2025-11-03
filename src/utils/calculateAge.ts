/**
 * Calculate age from date of birth
 * @param dob - Date of birth in YYYY-MM-DD format or Date object
 * @returns Age in years, or 0 if date is invalid
 */
export const calculateAge = (dob: string | Date): number => {
  if (!dob) return 0;
  
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  
  // Return 0 if date is invalid
  if (isNaN(birthDate.getTime())) return 0;
  
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};
