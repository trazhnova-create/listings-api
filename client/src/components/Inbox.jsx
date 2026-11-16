const fmt = (iso) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function Inbox({ conversations, onOpen, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="chat" onClick={(e) => e.stopPropagation()}>
        <div className="chat__head">
          <h2 className="chat__title">Сообщения</h2>
          <button className="chat__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {conversations.length === 0 ? (
          <p className="inbox__empty">
            Диалогов пока нет. Нажмите «Написать продавцу» в карточке чужого объявления.
          </p>
        ) : (
          <ul className="inbox__list">
            {conversations.map((c) => (
              <li key={c.id}>
                <button className="inbox__item" onClick={() => onOpen(c)}>
                  <span className="inbox__title">{c.listingTitle}</span>
                  <span className="inbox__with">
                    {c.role === 'seller' ? 'Покупатель' : 'Продавец'}: {c.withEmail}
                    {c.lastAt && ` · ${fmt(c.lastAt)}`}
                  </span>
                  <span className="inbox__last">{c.lastText || 'Сообщений пока нет'}</span>
                  {c.unread > 0 && <span className="inbox__badge">{c.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Inbox;