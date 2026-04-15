export const VALID_USER_TYPES = ["employee", "contractor", "sole_trader"] as const;
export type UserType = typeof VALID_USER_TYPES[number];

export function isValidUserType(value: unknown): value is UserType {
  return VALID_USER_TYPES.includes(value as UserType);
}
