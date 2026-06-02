import React, { useEffect, useState, useRef } from "react";
import Parse from "../../parseConfig";
import AgoraRTC from "agora-rtc-sdk-ng";
import "./LivePage.css";

const PER_PAGE = 10;

export default function LivePage() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [loadingJoin, setLoadingJoin] = useState(false);

  const clientRef = useRef(null);

  // ✅ stable UID (no Math.random in render)
  const uidRef = useRef(Math.floor(Math.random() * 100000));

  /* ───────── FETCH ───────── */
  const fetchLive = async () => {
    try {
      const q = new Parse.Query("Streaming");
      q.equalTo("streaming", true);
      const res = await q.find();
      setData(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLive();
    const i = setInterval(fetchLive, 5000); // auto-refresh
    return () => clearInterval(i);
  }, []);

  /* ───────── FILTER ───────── */
  const filtered = data.filter((i) => {
    if (filter === "video") return i.get("party_type") === "video";
    if (filter === "audio") return i.get("party_type") === "audio";
    if (filter === "multi") return i.get("liveType") === "multi";
    return true;
  });

  /* ───────── PAGINATION ───────── */
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  /* ───────── WATCH ───────── */
  const handleWatch = async (item) => {
    try {
      setLoadingJoin(true);

      const uid = uidRef.current; // ✅ stable UID

      const res = await Parse.Cloud.run("generateAgoraToken", {
        channelName: item.get("streaming_channel"),
        uid,
      });

      setViewer(item);

      await joinAgora(item, res, uid);

    } catch (err) {
      console.error("Token error:", err);
      alert("Failed to join stream");
      setLoadingJoin(false);
    }
  };

  /* ───────── AGORA JOIN ───────── */
  const joinAgora = async (item, res, uid) => {
    try {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      clientRef.current = client;

      await client.setClientRole("audience");

      client.on("user-published", async (user, type) => {
        await client.subscribe(user, type);

        if (type === "video") {
          setTimeout(() => {
            user.videoTrack.play(`player-${user.uid}`);
          }, 100);
        }

        if (type === "audio") {
          user.audioTrack.play();
        }

        setRemoteUsers((prev) => [
          ...prev.filter(u => u.uid !== user.uid),
          user
        ]);
      });

      client.on("user-unpublished", (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      client.on("user-left", (user) => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      await client.join(
        res.appId,
        item.get("streaming_channel"),
        res.token,
        uid
      );

      setLoadingJoin(false);

    } catch (err) {
      console.error("Join error:", err);
      setLoadingJoin(false);
    }
  };

  /* ───────── LEAVE ───────── */
  const leave = async () => {
    await clientRef.current?.leave();
    setRemoteUsers([]);
    setViewer(null);
  };

  /* ───────── UI ───────── */
  return (
    <div className="lv-page">

      {/* FILTERS */}
      <div className="lv-filters">
        <button onClick={() => setFilter("ALL")}>All</button>
        <button onClick={() => setFilter("video")}>🎥 Video</button>
        <button onClick={() => setFilter("audio")}>🎧 Audio</button>
        <button onClick={() => setFilter("multi")}>👥 Multi</button>
      </div>

      {/* GRID */}
      <div className="lv-grid">
        {pageItems.map((item) => (
          <div key={item.id} className="lv-card">
            <div className="lv-badge">LIVE</div>
            <img src={item.get("image")} alt="" />
            <h3>{item.get("username")}</h3>
            <p>{item.get("party_type")} | {item.get("liveType")}</p>
            <p>👁 {item.get("joined_users")?.length || 0}</p>
            <button onClick={() => handleWatch(item)}>
              Watch
            </button>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="lv-pagination">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} onClick={() => setPage(i)}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* MODAL */}
      {viewer && (
        <div className="lv-modal">
          <div className="lv-header">
            <h3>{viewer.get("streaming_channel")}</h3>
            <button onClick={leave}>Leave</button>
          </div>

          {loadingJoin && <div className="lv-loader">Joining...</div>}

          <div className="lv-video-grid">
            {remoteUsers.map((u) => (
              <div key={u.uid} className="lv-video-box">
                <div id={`player-${u.uid}`} className="lv-player" />
              </div>
            ))}
          </div>

          <div className="lv-count">
            Users: {remoteUsers.length}
          </div>
        </div>
      )}
    </div>
  );
}