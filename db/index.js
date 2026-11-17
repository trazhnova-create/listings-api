
const SUPPORTED = ['mongo', 'postgres'];
const type = (process.env.DB_TYPE || 'mongo').trim().toLowerCase();

if (!SUPPORTED.includes(type)) {
  throw new Error(`Неизвестный DB_TYPE="${process.env.DB_TYPE}". Допустимо: ${SUPPORTED.join(', ')}`);
}

const impl = type === 'postgres' ? require('./postgres') : require('./mongo');

module.exports = {
  type,
  connect: impl.connect,
  isHealthy: impl.isHealthy,
  isValidId: impl.isValidId, 
  normalizeError: impl.normalizeError, 
  users: impl.users,
  listings: impl.listings,
  conversations: impl.conversations,
  messages: impl.messages,
};