export interface UserProfile {
  id: string
  userId: string
  fullName: string
  email: string
  age: number | null
  sex: string
  onboardingComplete: boolean
}

export interface AuthFormState {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}
