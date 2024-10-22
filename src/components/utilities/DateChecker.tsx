export function isUserOver18(dateOfBirth: Date): boolean {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();

    if (age >= 18) {
        return true;
    }

    return false;
}