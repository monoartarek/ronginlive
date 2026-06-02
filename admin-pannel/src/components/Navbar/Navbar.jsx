import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Parse from "../../parseConfig";
import { Menu, X, LayoutDashboard, Terminal } from "lucide-react";
import "./Navbar.css";
import logo from "../../../src/assets/logo.png";

function Navbar({ onHamburgerClick }) {
  const [user, setUser] = useState(null);
  const [visitedHistory, setVisitedHistory] = useState([]);
  const [liveStats, setLiveStats] = useState([
    { type: "audio", count: 0 },
    { type: "video", count: 0 },
    { type: "multi", count: 0 },
  ]);
  const [statIndex, setStatIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await Parse.User.currentAsync();
      if (currentUser) setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const query = new Parse.Query("Streaming");
        query.equalTo("streaming", true);
        query.limit(1000);
        const results = await query.find();

        const counts = { audio: 0, video: 0, multi: 0 };
        results.forEach((row) => {
          const type = row.get("liveType");
          if (type === "audio") counts.audio++;
          else if (type === "video") counts.video++;
          else if (type === "multi") counts.multi++;
        });

        setLiveStats([
          { type: "audio", count: counts.audio },
          { type: "video", count: counts.video },
          { type: "multi", count: counts.multi },
        ]);
      } catch (err) {
        console.error("Failed to fetch live stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setStatIndex((prev) => (prev + 1) % 3);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [visitedHistory, location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/login") return;

    setVisitedHistory((prev) => {
      if (prev.find((item) => item.path === path)) return prev;
      const name = path.substring(1).charAt(0).toUpperCase() + path.slice(2);
      return [...prev, { name, path }];
    });
  }, [location]);

  const removeHistoryItem = (e, pathToRemove) => {
    e.stopPropagation();
    setVisitedHistory((prev) => prev.filter((item) => item.path !== pathToRemove));
  };

  const current = liveStats[statIndex];

  return (
    <nav className="priyu-nav-container">
      <div className="priyu-nav-left-group">
        <button className="priyu-nav-mobile-toggle" onClick={onHamburgerClick}>
          <Menu size={20} />
        </button>

        <div className="priyu-nav-brand-box" onClick={() => navigate("/")}>
          <div className="priyu-brand-icon">
            <Terminal size={18} color="#fff" />
          </div>
          <div className="priyu-brand-text">
            <span className="brand-main">Rongin</span>
            <span className="brand-sub">Live</span>
          </div>
        </div>

        <div className="priyu-nav-history-viewport" ref={scrollRef}>
          {visitedHistory.map((item) => (
            <div
              key={item.path}
              className={`priyu-history-tab ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <LayoutDashboard size={12} className="tab-icon" />
              <span>{item.name}</span>
              <X
                size={12}
                className="tab-close"
                onClick={(e) => removeHistoryItem(e, item.path)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="priyu-nav-right-group">

    
          {/* Live Stats Carousel */}
          <div
            key={current.type}
            className={`priyu-stat-carousel ${current.type}`}
            onClick={() => navigate("/live-streaming")}
            style={{ cursor: "pointer" }}
          >
            <span className="stat-dot" />
            <span className="stat-label">{current.type}</span>
            <span className="stat-count">{current.count}</span>
            <span className="stat-suffix">live</span>
          </div>
        

        {/* Profile */}
        {user && (
          <div className="priyu-nav-profile-pill" onClick={() => navigate("/profile")}>
            <div className="priyu-nav-user-info">
              <p className="priyu-nav-username">{user.getUsername()}</p>
              <p className="priyu-nav-role">{user.get("role") || "Admin"}</p>
            </div>
            <div className="priyu-nav-avatar-box">
              {/* <img src="https://priyulive.com/logo.png" alt="Profile" className="priyu-nav-avatar-img" /> */}
              <img src={logo} alt="Profile" className="pro-avatar-img" />
              <div className="priyu-nav-status-dot"></div>
            </div>
          </div>
        )}

      </div>
    </nav>
  );
}

export default Navbar;