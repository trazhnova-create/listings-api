const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../db');

const convRoom = (id) => `conv:${id}`;
const userRoom = (id) => `user:${id}`;
const reply = (ack, data) => typeof ack === 'function' && ack(data);
const plain = (doc) => JSON.parse(JSON.stringify(doc));

const isMember = (conv, userId) =>
  String(conv.sellerId) === userId || String(conv.buyerId) === userId;

function toView(conv, userId) {
  const isSeller = String(conv.sellerId) === userId;
  return {
    id: conv.id,
    listingId: String(conv.listingId),
    listingTitle: conv.listingTitle,
    role: isSeller ? 'seller' : 'buyer',
    withEmail: isSeller ? conv.buyerEmail : conv.sellerEmail,
    unread: isSeller ? conv.unreadSeller : conv.unreadBuyer,
    lastText: conv.lastText,
    lastAt: conv.lastAt,
    updatedAt: conv.updatedAt,
  };
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Нужно войти в аккаунт'));
    try {
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET); // { id, email, role }
      next();
    } catch {
      next(new Error('Недействительный или истёкший токен'));
    }
  });

  async function getOnline(room) {
    const sockets = await io.in(room).fetchSockets();
    const byId = new Map();
    sockets.forEach((s) => byId.set(s.data.user.id, { id: s.data.user.id, email: s.data.user.email }));
    return [...byId.values()];
  }

  async function announceLeft(room, user) {
    const users = await getOnline(room);
    if (!users.some((u) => u.id === user.id)) {
      io.to(room).emit('system', { text: `${user.email} покинул чат`, at: Date.now() });
    }
    io.to(room).emit('room:users', users);
  }

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`socket connected: ${user.email} (${socket.id})`);
    socket.join(userRoom(user.id));
    let joined = [];

    socket.on('conversations:list', async (ack) => {
      try {
        const convs = await db.conversations.listForUser(user.id);
        reply(ack, { ok: true, conversations: convs.map((c) => toView(c, user.id)) });
      } catch (err) {
        console.error('conversations:list', err);
        reply(ack, { ok: false, error: 'Не удалось загрузить диалоги' });
      }
    });

    socket.on('conversation:start', async (listingId, ack) => {
      try {
        if (!db.isValidId(listingId)) {
          return reply(ack, { ok: false, error: 'Некорректный id объявления' });
        }
        const listing = await db.listings.findById(listingId);
        if (!listing) return reply(ack, { ok: false, error: 'Объявление не найдено' });
        if (!listing.sellerId) return reply(ack, { ok: false, error: 'У объявления нет владельца' });
        if (String(listing.sellerId) === user.id) {
          return reply(ack, { ok: false, error: 'Это ваше объявление. Диалоги с покупателями в разделе «Сообщения»' });
        }
        const seller = await db.users.findById(listing.sellerId);
        if (!seller) return reply(ack, { ok: false, error: 'Продавец не найден' });

        // находит диалог по (объявление, покупатель) или создаёт новый
        const conv = await db.conversations.findOrCreate(
          { listingId, buyerId: user.id },
          {
            listingTitle: listing.title,
            sellerId: listing.sellerId,
            sellerEmail: seller.email,
            buyerEmail: user.email,
          }
        );
        reply(ack, { ok: true, conversation: toView(conv, user.id) });
      } catch (err) {
        console.error('conversation:start', err);
        reply(ack, { ok: false, error: 'Не удалось открыть чат' });
      }
    });

    socket.on('conversation:join', async (conversationId, ack) => {
      try {
        if (!db.isValidId(conversationId)) {
          return reply(ack, { ok: false, error: 'Некорректный id диалога' });
        }
        const conv = await db.conversations.findById(conversationId);
        if (!conv || !isMember(conv, user.id)) {
          return reply(ack, { ok: false, error: 'Диалог не найден' });
        }

        const room = convRoom(conversationId);
        const wasHere = (await getOnline(room)).some((u) => u.id === user.id);
        await socket.join(room);

        const isSellerHere = String(conv.sellerId) === user.id;
        await db.conversations.resetUnread(conv.id, isSellerHere ? 'seller' : 'buyer');
        conv[isSellerHere ? 'unreadSeller' : 'unreadBuyer'] = 0;

        const [history, users] = await Promise.all([
          db.messages.history(conversationId, 50),
          getOnline(room),
        ]);

        if (!wasHere) {
          socket.to(room).emit('system', { text: `${user.email} присоединился к чату`, at: Date.now() });
        }
        io.to(room).emit('room:users', users);

        io.to(userRoom(user.id)).emit('conversation:updated', toView(conv, user.id));

        reply(ack, {
          ok: true,
          conversation: toView(conv, user.id),
          users,
          history: plain(history),
        });
      } catch (err) {
        console.error('conversation:join', err);
        reply(ack, { ok: false, error: 'Не удалось войти в диалог' });
      }
    });

    socket.on('conversation:leave', async (conversationId, ack) => {
      try {
        if (!db.isValidId(conversationId)) return reply(ack, { ok: false });
        const room = convRoom(conversationId);
        if (!socket.rooms.has(room)) return reply(ack, { ok: true });
        await socket.leave(room);
        await announceLeft(room, user);
        reply(ack, { ok: true });
      } catch (err) {
        console.error('conversation:leave', err);
        reply(ack, { ok: false });
      }
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const { conversationId, text } = payload || {};
        const room = db.isValidId(conversationId) ? convRoom(conversationId) : null;
        if (!room || !socket.rooms.has(room)) {
          return reply(ack, { ok: false, error: 'Сначала откройте диалог' });
        }
        const clean = typeof text === 'string' ? text.trim() : '';
        if (!clean) return reply(ack, { ok: false, error: 'Пустое сообщение' });
        if (clean.length > 1000) return reply(ack, { ok: false, error: 'Не длиннее 1000 символов' });

        const conv = await db.conversations.findById(conversationId);
        if (!conv || !isMember(conv, user.id)) {
          return reply(ack, { ok: false, error: 'Диалог не найден' });
        }

        const message = await db.messages.create({
          conversationId,
          userId: user.id,
          author: user.email,
          text: clean,
        });

        const isSeller = String(conv.sellerId) === user.id;
        const otherId = String(isSeller ? conv.buyerId : conv.sellerId);
        const otherInRoom = (await getOnline(room)).some((u) => u.id === otherId);

        // если собеседника нет в комнате, ему добавляется непрочитанное сообщение
        const updated = await db.conversations.touch(conversationId, {
          text: clean.slice(0, 100),
          at: message.createdAt,
          unreadFor: otherInRoom ? null : isSeller ? 'buyer' : 'seller',
        });

        io.to(room).emit('message:new', plain(message));
        for (const id of [String(updated.sellerId), String(updated.buyerId)]) {
          io.to(userRoom(id)).emit('conversation:updated', toView(updated, id));
        }
        if (!otherInRoom) {
          io.to(userRoom(otherId)).emit('notify', {
            conversationId,
            fromEmail: user.email,
            text: clean.slice(0, 80),
          });
        }

        reply(ack, { ok: true, id: message.id });
      } catch (err) {
        console.error('message:send', err);
        reply(ack, { ok: false, error: 'Не удалось отправить сообщение' });
      }
    });

    socket.on('typing', (payload) => {
      const { conversationId, isTyping } = payload || {};
      if (!db.isValidId(conversationId)) return;
      const room = convRoom(conversationId);
      if (!socket.rooms.has(room)) return;
      socket.to(room).emit('typing', { userId: user.id, email: user.email, isTyping: !!isTyping });
    });

    socket.on('disconnecting', () => {
      joined = [...socket.rooms].filter((r) => r.startsWith('conv:'));
    });

    socket.on('disconnect', async (reason) => {
      console.log(`socket disconnected: ${user.email} (${reason})`);
      try {
        for (const room of joined) await announceLeft(room, user);
      } catch (err) {
        console.error('disconnect', err);
      }
    });
  });

  return io;
}

module.exports = { initSocket };