import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getCredits(email: string) {
  return prisma.userCredits.findUnique({
    where: { email },
  });
}
