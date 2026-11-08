export class AppError extends Error {
  constructor(
    message: string,
    public code: "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "UNAUTHORIZED" | "RATE_LIMITED" | "CONFLICT" = "VALIDATION",
  ) {
    super(message);
    this.name = "AppError";
  }
}
