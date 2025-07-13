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

export function calculateAge(dateOfBirth: string | Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}