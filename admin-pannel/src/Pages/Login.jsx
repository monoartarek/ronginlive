import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Parse from "../parseConfig";
import { saveLoginHistory } from "../utils/saveLoginHistory";
import { Eye, EyeOff, ShieldAlert, Clock } from "lucide-react"; 
import "./Login.css";
import logo from "../../src/assets/logo.png"

export async function handleLogout(navigate) {
  try {
    const user = Parse.User.current();
    await saveLoginHistory(user, "logout");
    await Parse.User.logOut();
    navigate("/login");
  } catch (err) {
    console.error("Logout error:", err.message);
    await Parse.User.logOut();
    navigate("/login");
  }
}

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Security States
  const [userIp, setUserIp] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  // 1. Get IP and Check Security on Mount
  useEffect(() => {
    const initSecurity = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        setUserIp(data.ip);
        checkSecurityStatus(data.ip);
      } catch (err) {
        console.error("IP Verification failed");
      }
    };
    initSecurity();
  }, []);

  const checkSecurityStatus = async (ip) => {
    const query = new Parse.Query("SecurityLogs");
    query.equalTo("deviceIp", ip);
    const log = await query.first();

    if (log) {
      const attempts = log.get("attempts") || 0;
      const lastAttempt = log.get("updatedAt");
      const now = new Date();
      
      // 24 Hours in milliseconds
      const cooldown = 24 * 60 * 60 * 1000;

      if (attempts >= 5) {
        if (now - lastAttempt < cooldown) {
          setIsLocked(true);
        } else {
          // Cooldown finished: Auto-unban
          await log.destroy();
          setIsLocked(false);
          setAttemptsLeft(5);
        }
      } else {
        setAttemptsLeft(5 - attempts);
      }
    }
  };

  const recordFailure = async () => {
    const query = new Parse.Query("SecurityLogs");
    query.equalTo("deviceIp", userIp);
    let log = await query.first();

    if (!log) {
      const SecurityLogs = Parse.Object.extend("SecurityLogs");
      log = new SecurityLogs();
      log.set("deviceIp", userIp);
      log.set("attempts", 0);
      log.set("isBanned", false);//for true or false
    }

    const newAttempts = (log.get("attempts") || 0) + 1;
    log.set("attempts", newAttempts);
    await log.save();

    setAttemptsLeft(5 - newAttempts);
    if (newAttempts >= 5) setIsLocked(true);
  };

  const handleLogin = async () => {
    if (!username || !password || isLocked) return;
    setLoading(true);

    try {
      const user = await Parse.User.logIn(username, password);

      if (user.get("isAdmin") !== true && user.get("role") !== "admin") {
        await saveLoginHistory(user, "failed");
        await Parse.User.logOut();
        alert("You are not an admin");
        setLoading(false);
        return;
      }

      // Success: Clear security logs for this IP
      const query = new Parse.Query("SecurityLogs");
      query.equalTo("deviceIp", userIp);
      const log = await query.first();
      if (log) await log.destroy();

      await saveLoginHistory(user, "login");
      navigate("/");
    } catch (error) {
      await recordFailure();
      await saveLoginHistory(null, "failed", username);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- BANNED UI STATE ---
  if (isLocked) {
    return (
      <div className="login-container">
        <div className="login-card-3d banned-card">
          <div className="banned-content">
            <div className="banned-icon-wrapper">
              <ShieldAlert size={50} color="#ff4d4f" />
            </div>
            <h2>Access Restricted</h2>
            <p>Too many failed attempts from this device.</p>
            <div className="ip-badge">{userIp}</div>
            <div className="cooldown-timer">
              <Clock size={16} />
              <span>Blocked for 24 Hours</span>
            </div>
            <p className="footer-note">Contact system administrator if this is an error.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>

      <div className="login-card-3d">
        <div className="login-header-3d">
          <div className="logo-container-3d">
            {/* <img src="https://priyulive.com/logo.png" alt="Logo" className="login-logo-3d" /> */}
            <img src={logo} alt="Profile" />
          </div>
          <div className="illustration-placeholder-3d">
            <img 
              src="https://illustrations.popsy.co/amber/designer.svg" 
              alt="Illustration" 
              className="illustration-3d"
            />
          </div>
        </div>

        <div className="login-body-3d">
          <h2>Log In Now</h2>
          <p className="subtitle">Admin Authentication Required</p>

          <div className="input-group-3d">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="neumorphic-input"
            />
          </div>

          <div className="input-group-3d password-wrapper-3d neumorphic-input">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="password-inner-input"
            />
            <button 
              type="button" 
              className="toggle-password-3d"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} color="#777" /> : <Eye size={20} color="#777" />}
            </button>
          </div>

          {attemptsLeft < 5 && (
            <p className="attempts-warning">
              Warning: {attemptsLeft} attempts remaining before IP block.
            </p>
          )}

          <button 
            className={`login-submit-btn-3d ${loading ? 'loading' : ''}`} 
            onClick={handleLogin} 
            disabled={loading}
          >
            {loading ? "Verifying..." : "Log In"}
          </button>

          <div className="login-footer-3d">
            <p>Security Monitoring Enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;