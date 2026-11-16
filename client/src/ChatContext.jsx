import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { socket } from './socket';
import { useAuth } from './AuthContext';
import ChatModal from './components/ChatModal';
import Inbox from './components/Inbox';

const ChatContext = createContext(null);

const byUpdated = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [panel, setPanel] = useState(null); 
  const [active, setActive] = useState(null); 
  const [conversations, setConversations] = useState([]);
  const [toast, setToast] = useState(null);
  const activeIdRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = panel === 'chat' && active ? active.id : null;
  }, [panel, active]);

  
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setPanel(null);
      setActive(null);
      return;
    }

    function loadConversations() {
      socket.emit('conversations:list', (res) => {
        if (res?.ok) setConversations(res.conversations);
      });
    }
    function onUpdated(view) {
      setConversations((prev) => [view, ...prev.filter((c) => c.id !== view.id)].sort(byUpdated));
    }
    function onNotify(n) {
      if (activeIdRef.current === n.conversationId) return; // этот диалог уже открыт
      setToast({ conversationId: n.conversationId, text: `${n.fromEmail}: ${n.text}` });
    }

    socket.on('connect', loadConversations);
    socket.on('conversation:updated', onUpdated);
    socket.on('notify', onNotify);
    socket.connect();

    return () => {
      socket.off('connect', loadConversations);
      socket.off('conversation:updated', onUpdated);
      socket.off('notify', onNotify);
      socket.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function startChat(listing) {
    socket.emit('conversation:start', listing.id, (res) => {
      if (!res?.ok) return setToast({ text: res?.error || 'Не удалось открыть чат' });
      setActive(res.conversation);
      setPanel('chat');
    });
  }

  function openConversation(conv) {
    setActive(conv);
    setPanel('chat');
  }

  function onToastClick() {
    const conv = conversations.find((c) => c.id === toast?.conversationId);
    if (conv) openConversation(conv);
    setToast(null);
  }

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <ChatContext.Provider value={{ startChat, openInbox: () => setPanel('inbox'), unreadTotal }}>
      {children}

      {user && panel === 'inbox' && (
        <Inbox
          conversations={conversations}
          onOpen={openConversation}
          onClose={() => setPanel(null)}
        />
      )}
      {user && panel === 'chat' && active && (
        <ChatModal
          key={active.id}
          conversation={active}
          onBack={() => setPanel('inbox')}
          onClose={() => setPanel(null)}
        />
      )}

      {toast && (
        <div className="toast toast--chat" role="alert" onClick={toast.conversationId ? onToastClick : undefined}>
          <span>{toast.conversationId ? `Новое сообщение от ${toast.text}` : toast.text}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}