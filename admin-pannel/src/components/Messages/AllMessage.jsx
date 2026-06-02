import React, { useEffect, useState, useCallback } from "react";
import Parse from "../../parseConfig";
import "./AllMessage.css";

const PAGE_SIZE = 50;

export default function MessageListPage() {
  const [list, setList] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Chat States
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [senderUid, setSenderUid] = useState("");
  const [receiverUid, setReceiverUid] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /**
   * Copy UID and prevent card click
   */
  const copyToClipboard = (e, text) => {
    e.stopPropagation(); 
    navigator.clipboard.writeText(String(text));
    alert(`Copied UID: ${text}`);
  };

  /**
   * Reset all filters to default
   */
  const handleRefresh = () => {
    setSearch("");
    setSenderUid("");
    setReceiverUid("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  /**
   * Server-Side Fetching Logic
   */
  const fetchList = useCallback(async () => {
    setLoading(true);
    const MessageList = Parse.Object.extend("MessageList");
    const query = new Parse.Query(MessageList);

    query.include("Author");
    query.include("Receiver");

    // 1. Global Text Search
    if (search.trim()) {
      query.contains("text", search.trim());
    }
    
    // 2. Sender UID Search (AuthorId in MessageList)
    if (senderUid.trim()) {
      query.equalTo("AuthorId", senderUid.trim());
    }

    // 3. Receiver UID Search (ReceiverId in MessageList)
    if (receiverUid.trim()) {
      query.equalTo("ReceiverId", receiverUid.trim());
    }

    // 4. Date Filtering
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      query.greaterThanOrEqualTo("createdAt", start);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query.lessThanOrEqualTo("createdAt", end);
    }

    query.limit(PAGE_SIZE);
    query.skip(page * PAGE_SIZE);
    query.descending("createdAt");

    try {
      const [res, count] = await Promise.all([
        query.find({ useMasterKey: true }),
        query.count({ useMasterKey: true }),
      ]);

      setTotal(count);
      setList(res.map((m) => ({
        id: m.id,
        text: m.get("text"),
        createdAt: m.get("createdAt"),
        Author: m.get("Author"),
        Receiver: m.get("Receiver"),
        AuthorId: m.get("AuthorId"),
        ReceiverId: m.get("ReceiverId"),
      })));
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  }, [page, search, senderUid, receiverUid, fromDate, toDate]);

  /**
   * Open Chat Modal and fetch history
   */
  const openChat = async (item) => {
    setActiveChat(item);
    setMessages([]); 

    const Message = Parse.Object.extend("Message");
    const query = new Parse.Query(Message);

    // Filter messages for this specific conversation
    query.equalTo("AuthorId", item.AuthorId);
    query.equalTo("ReceiverId", item.ReceiverId);
    query.ascending("createdAt");
    query.limit(100);

    try {
      const res = await query.find({ useMasterKey: true });
      setMessages(res.map((m) => ({
        text: m.get("text"),
        createdAt: m.get("createdAt"),
        sender: m.get("AuthorId"),
      })));
    } catch (err) {
      console.error("Chat fetch error:", err);
    }
  };

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <div className="ml-root">
      <header className="ml-header-flex">
        <div className="ml-title-area">
          <h1>Message Center</h1>
          <p>Real-time server logs • {total} Total</p>
        </div>
        <button className="refresh-btn" onClick={handleRefresh}>
          <span className="icon">↻</span> Refresh Dashboard
        </button>
      </header>

      {/* ───────── FILTERS ───────── */}
      <section className="ml-filter-container">
        <div className="filter-item">
          <label>Global Search</label>
          <input className="modern-input" placeholder="Search message text..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-item">
          <label>Sender UID</label>
          <input className="modern-input" placeholder="Filter by Sender ID" value={senderUid} onChange={(e) => setSenderUid(e.target.value)} />
        </div>
        <div className="filter-item">
          <label>Receiver UID</label>
          <input className="modern-input" placeholder="Filter by Receiver ID" value={receiverUid} onChange={(e) => setReceiverUid(e.target.value)} />
        </div>
        <div className="filter-item date-section">
          <label>Date Filter</label>
          <div className="date-row">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="to-txt">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </section>

      {/* ───────── CARDS GRID ───────── */}
      <main className="ml-grid">
        {list.map((item) => (
          <div key={item.id} className="ml-card-modern" onClick={() => openChat(item)}>
            <div className="card-top">
              <div className="user-profile">
                <img src={item.Author?.get("avatar")?.url() || "https://via.placeholder.com/40"} alt="av" className="av" />
                <div className="u-info">
                  <span className="u-name">{item.Author?.get("name") || "Sender"}</span>
                  <span className="u-uid" onClick={(e) => copyToClipboard(e, item.Author?.get("uid") || item.AuthorId)}>
                    ID: {item.Author?.get("uid") || item.AuthorId}
                  </span>
                </div>
              </div>
              <div className="arrow-indicator">→</div>
              <div className="user-profile text-right">
                <img src={item.Receiver?.get("avatar")?.url() || "https://via.placeholder.com/40"} alt="av" className="av" />
                <div className="u-info">
                  <span className="u-name">{item.Receiver?.get("name") || "Receiver"}</span>
                  <span className="u-uid" onClick={(e) => copyToClipboard(e, item.Receiver?.get("uid") || item.ReceiverId)}>
                    ID: {item.Receiver?.get("uid") || item.ReceiverId}
                  </span>
                </div>
              </div>
            </div>
            <div className="card-body">
              <p className="preview-text">{item.text}</p>
              <div className="card-meta">
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* ───────── PAGINATION ───────── */}
      <footer className="ml-pagination-modern">
        <button className="p-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
        <span className="p-info">Page <b>{page + 1}</b></span>
        <button className="p-btn" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Next</button>
      </footer>

      {/* ───────── CHAT MODAL ───────── */}
      {activeChat && (
        <div className="ml-modal-overlay" onClick={() => setActiveChat(null)}>
          <div className="ml-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-names">
                <h3>Log View</h3>
                <small>{activeChat.AuthorId} → {activeChat.ReceiverId}</small>
              </div>
              <button className="close-x" onClick={() => setActiveChat(null)}>&times;</button>
            </div>
            <div className="chat-stream">
              {messages.length > 0 ? messages.map((m, i) => (
                <div key={i} className={`msg-wrapper ${m.sender === activeChat.AuthorId ? 'sent' : 'received'}`}>
                  <div className="msg-bubble">
                    {m.text}
                    <span className="msg-time">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              )) : <p className="loading-text">Loading chat log...</p>}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="ml-loader-overlay"><div className="spinner"></div></div>}
    </div>
  );
}