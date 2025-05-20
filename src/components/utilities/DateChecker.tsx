export function isUserOver18(dateOfBirth: Date): boolean {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    console.log("Current Date:", today);
    console.log("Birth Date:", dateOfBirth);
    if (age >= 18) {
        return true;
    }

    return false;
}