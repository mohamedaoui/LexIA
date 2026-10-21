import { PrismaClient, User, Role } from "../generated/prisma";

const prisma = new PrismaClient();

export const userService = {
  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<User> {
    return prisma.user.create({ data });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { chats: true, Season: true },
    });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      password: string;
      role: Role;
    }>
  ): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  },

  async delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  },
};
