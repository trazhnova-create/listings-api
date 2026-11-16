import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { useAuth } from '../AuthContext';

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function ChatModal({ conversation, onBack, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState({}); 
  const [text, setText] = useState('');
  const [status, setStatus] = useState('connecting'); 
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const endRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    
    function join() {
      setStatus('connecting');
      socket.emit('conversation:join', conversation.id, (res) => {
        if (!res?.ok) {
          setStatus('error');
          setError(res?.error || 'Не удалось войти в диалог');
          return;
        }
        setMessages(res.history);
        setUsers(res.users);
        setError('');
        setStatus('connected');
      });
    }

    function onNewMessage(msg) {
      if (msg.conversationId !== conversation.id) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      
      setTyping((prev) => {
        const next = { ...prev };
        delete next[msg.userId];
        return next;
      });
    }

    function onSystem(s) {
      setMessages((prev) => [
        ...prev,
        { id: `sys-${s.at}-${Math.random()}`, system: true, text: s.text },
      ]);
    }

    function onTyping({ userId, email, isTyping }) {
      setTyping((prev) => {
        const next = { ...prev };
        if (isTyping) next[userId] = email;
        else delete next[userId];
        return next;
      });
    }

    function onConnectError(err) {
      setStatus('error');
      setError(err.message);
    }

    function onDisconnect() {
      setStatus('connecting');
      setTyping({});
    }

    socket.on('connect', join);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onNewMessage);
    socket.on('system', onSystem);
    socket.on('room:users', setUsers);
    socket.on('typing', onTyping);
    if (socket.connected) join();

    return () => {
      clearTimeout(typingTimer.current);
      socket.off('connect', join);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onNewMessage);
      socket.off('system', onSystem);
      socket.off('room:users', setUsers);
      socket.off('typing', onTyping);
      socket.emit('conversation:leave', conversation.id); 
    };
  }, [conversation.id]);

  
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function stopTyping() {
    clearTimeout(typingTimer.current);
    if (typingRef.current) {
      typingRef.current = false;
      socket.emit('typing', { conversationId: conversation.id, isTyping: false });
    }
  }

  function handleChange(e) {
    setText(e.target.value);
    
    if (!typingRef.current) {
      typingRef.current = true;
      socket.emit('typing', { conversationId: conversation.id, isTyping: true });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1500);
  }

  function handleSend(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || status !== 'connected' || sending) return;

    stopTyping();
    setSending(true);
    
    socket
      .timeout(5000)
      .emit('message:send', { conversationId: conversation.id, text: value }, (err, res) => {
        setSending(false);
        if (err) return setError('Сервер не ответил, попробуйте ещё раз');
        if (!res.ok) return setError(res.error);
        setError('');
        setText('');
      });
  }

  const otherOnline = users.some((u) => u.email === conversation.withEmail);
  const typingNames = Object.values(typing);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="chat" onClick={(e) => e.stopPropagation()}>
        <div className="chat__head">
          <div className="chat__head-main">
            <button className="chat__back" onClick={onBack} aria-label="К списку диалогов">
              ←
            </button>
            <div>
              <h2 className="chat__title">{conversation.listingTitle}</h2>
              <p className="chat__online">
                {conversation.role === 'seller' ? 'Покупатель' : 'Продавец'}: {conversation.withEmail}
                {status === 'connected' && (otherOnline ? ' · в сети' : ' · не в сети')}
                {status === 'connecting' && ' · подключение...'}
              </p>
            </div>
          </div>
          <button className="chat__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="chat__messages">
          {status === 'connected' && messages.length === 0 && (
            <div className="chat__system">Сообщений пока нет. Напишите первым.</div>
          )}
          {messages.map((m) =>
            m.system ? (
              <div key={m.id} className="chat__system">{m.text}</div>
            ) : (
              <div
                key={m.id}
                className={`chat__msg${m.userId === user.id ? ' chat__msg--own' : ''}`}
              >
                <div className="chat__author">
                  {m.author}
                  <span className="chat__time">{fmtTime(m.createdAt)}</span>
                </div>
                <p className="chat__text">{m.text}</p>
              </div>
            )
          )}
          <div ref={endRef} />
        </div>

        <div className="chat__typing">
          {typingNames.length > 0 && `${typingNames.join(', ')} печатает...`}
        </div>

        {error && <p className="chat__error">{error}</p>}

        <form className="chat__form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Сообщение..."
            value={text}
            onChange={handleChange}
            maxLength={1000}
            disabled={status !== 'connected'}
            autoFocus
          />
          <button type="submit" disabled={status !== 'connected' || sending || !text.trim()}>
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatModal;