import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Token requis'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    let companyId = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });
      companyId = user?.companyId;
    } catch (_) {}
    if (!companyId) {
      socket.disconnect();
      return;
    }
    const room = `company:${companyId}`;
    socket.join(room);
    socket.companyId = companyId;

    socket.on('chat:message', async (data) => {
      try {
        const { content, receiverId } = data || {};
        if (!content || typeof content !== 'string') return;
        const trimmed = content.trim();
        if (!trimmed) return;
        const msg = await prisma.chatMessage.create({
          data: {
            companyId,
            senderId: userId,
            receiverId: receiverId || null,
            content: trimmed,
            type: 'text',
          },
          include: {
            sender: { select: { id: true, name: true, email: true } },
          },
        });
        io.to(room).emit('chat:new', msg);
      } catch (err) {
        console.error('Socket chat:', err);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}
