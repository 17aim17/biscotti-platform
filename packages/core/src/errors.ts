// Expected business failures (as opposed to bugs). The web app maps each code
// to a friendly message instead of showing a raw error.
export type DomainErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "ITEM_UNAVAILABLE"
  | "LOCATION_CLOSED"
  | "OUT_OF_RANGE"
  | "FULFILLMENT_NOT_AVAILABLE"
  | "PAYMENT_METHOD_NOT_AVAILABLE"
  | "INVALID_STATUS_CHANGE"
  | "STATUS_CONFLICT"
  | "PAYMENT_MISMATCH"
  | "INVALID_SIGNATURE"

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = "DomainError"
    this.code = code
  }
}
