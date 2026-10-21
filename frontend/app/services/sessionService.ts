import { PrismaClient, Session, Prisma } from '../generated/prisma';
const prisma = new PrismaClient();

export const sessionService = {
  async create(data: {
    userId: string;
    title: string;
  }): Promise<Session> {
    return prisma.session.create({
      data: {
        userId: data.userId,
        title: data.title,
      },
    });
  },

  async findById(id: string): Promise<Prisma.SessionGetPayload<{
    include: { Chat: true };
  }> | null> {
    return prisma.session.findUnique({
      where: { id },
      include: { Chat: true },
    });
  },

  async findAllByUser(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
      include: { Chat: true },
    });
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      startDate: Date;
    }>
  ): Promise<Session> {
    return prisma.session.update({ where: { id }, data });
  },

  async delete(id: string): Promise<Session> {
    return prisma.session.delete({ where: { id } });
  },
};
