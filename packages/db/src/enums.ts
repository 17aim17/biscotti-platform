// Database enums (OrderStatus, PaymentStatus, ...) without the Prisma client.
// Pure logic imports these from "@workspace/db/enums" so it doesn't need a
// database connection just to use a status value.
export * from "./generated/prisma/enums"
