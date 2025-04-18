import { isUserOver18 } from "../../components/utilities/DateChecker";

describe("isUserOver18", () => {
  test("should return true for a user who is exactly 18 years old", () => {
    const today = new Date();
    const birthDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    expect(isUserOver18(birthDate)).toBe(true);
  });

  test("should return true for a user older than 18 years", () => {
    const birthDate = new Date("2000-01-01");
    expect(isUserOver18(birthDate)).toBe(true);
  });

  test("should return false for a user younger than 18 years", () => {
    const today = new Date();
    const birthDate = new Date(
      today.getFullYear() - 17,
      today.getMonth(),
      today.getDate() + 1
    );
    expect(isUserOver18(birthDate)).toBe(false);
  });

  test("should return false for a future date", () => {
    const futureDate = new Date("3000-01-01");
    expect(isUserOver18(futureDate)).toBe(false);
  });

  test("should handle leap year birthdays correctly", () => {
    const today = new Date("2024-02-29"); // Leap year
    const birthDate = new Date("2006-02-29"); // 18 years before
    expect(isUserOver18(birthDate)).toBe(true);
  });

  test("should return false for an invalid date", () => {
    const invalidDate = new Date("invalid-date");
    expect(isUserOver18(invalidDate)).toBe(false);
  });
});