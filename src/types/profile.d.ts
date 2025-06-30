export type Profile = {
    email: string;
    username: string;
    userBio: string;
    dob: Date;
    gender: string;
    sexo: string;
    education: string;
    drinkingHabits: string;
    smokingHabits: string;
    blocked: string[];
    ratings?: {
      average: number;
      count: number;
      ratedBy: {
        [userId: string]: {
          rating: number;
          timestamp: number;
        }
      }
    };
  };