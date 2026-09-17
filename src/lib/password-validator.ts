export interface PasswordCriteria {
  length: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
  special: boolean
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  criteria: PasswordCriteria
}

export function checkPasswordCriteria(password: string): PasswordCriteria {
  return {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function validatePassword(password: string): PasswordValidationResult {
  const criteria = checkPasswordCriteria(password)
  const errors: string[] = []

  if (!criteria.length) {
    errors.push('Password must be at least 10 characters long.')
  }
  if (!criteria.uppercase) {
    errors.push('Include at least one uppercase letter (A-Z).')
  }
  if (!criteria.lowercase) {
    errors.push('Include at least one lowercase letter (a-z).')
  }
  if (!criteria.number) {
    errors.push('Include at least one number (0-9).')
  }
  if (!criteria.special) {
    errors.push('Include at least one special character (!@#$%...).')
  }

  return {
    isValid: errors.length === 0,
    errors,
    criteria,
  }
}
