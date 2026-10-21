import { PrismaClient, Chat, Sender, ChatType } from "../generated/prisma";
const prisma = new PrismaClient();

export const chatService = {
  async create({
    userId,
    sessionId,
    sender,
    message,
    type = "chat"
  }: {
    userId: string;
    sessionId: string;
    sender: Sender;
    message: string;
    type?: ChatType;
  }): Promise<Chat> {
    return prisma.chat.create({
      data: {
        userId,
        sessionId,
        sender,
        message,
        type,
      },
    });
  },

  async findBySession(
    sessionId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<{ chats: Chat[]; nextCursor: string | null }> {
    const chats = await prisma.chat.findMany({
      where: { sessionId },
      orderBy: { sentAt: "asc" },

      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,

      include: { user: true },
    });

    const nextCursor =
      chats.length === limit ? chats[chats.length - 1].id : null;

    return { chats, nextCursor };
  },

  async findRecentByUser(userId: string, limit = 20): Promise<Chat[]> {
    return prisma.chat.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: limit,
      include: { season: true },
    });
  },

  async delete(id: string): Promise<Chat> {
    return prisma.chat.delete({ where: { id } });
  },
};
