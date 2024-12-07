
export function isValidDate(dateOfBirth: Date): boolean {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDay();

    if (age > 120) {
        return false;
    }

    if (birthMonth > 12 || birthMonth < 1) {
        return false
    }

    if (birthDay > 31 || birthDay < 1) {
        return false
    }

    return true;
}