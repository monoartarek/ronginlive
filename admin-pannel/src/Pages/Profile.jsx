import React, { useState, useEffect } from "react";
import Parse from "../parseConfig";
import { handleLogout } from "./Login"; 
import { useNavigate } from "react-router-dom";
// 1. Added Eye and EyeOff icons
import { User, Lock, LogOut, ShieldCheck, Eye, EyeOff } from "lucide-react"; 
import "./Profile.css";
import logo from "../../src/assets/logo.png";


function Profile() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  // 2. State for toggling password visibility
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await Parse.User.currentAsync();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const changeUsername = async () => {
    try {
      if(!username) return alert("Please enter a new username");
      currentUser.set("username", username);
      await currentUser.save();
      alert("Username updated successfully!");
      window.location.reload();
    } catch (error) {
      alert(error.message);
    }
  };

  const changePassword = async () => {
    try {
      if(!password) return alert("Please enter a new password");
      currentUser.set("password", password);
      await currentUser.save();
      alert("Password updated successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="pro-profile-viewport">
      <div className="pro-profile-card">
        <div className="pro-profile-header">
          <div className="pro-avatar-wrapper">
             <div className="pro-avatar-inner">

                {/* <img src="https://priyulive.com/logo.png" alt="Profile" className="pro-avatar-img" /> */}
                <img src={logo} alt="Profile" className="pro-avatar-img" />
                 
             </div>
             <div className="pro-online-badge"></div>
          </div>
          <h2>Account Settings</h2>
          <p className="pro-user-email">
            {currentUser ? currentUser.get("username") : "Administrator"}
          </p>
          <div className="pro-admin-tag">
            <ShieldCheck size={14} /> <span>Verified Admin</span>
          </div>
        </div>

        <div className="pro-profile-body">
          <div className="pro-input-section">
            <label>Change Username</label>
            <div className="pro-input-wrapper">
              <User className="pro-field-icon" size={18} />
              <input
                placeholder="New username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <button className="pro-action-btn" onClick={changeUsername}>
              Update Username
            </button>
          </div>

          <div className="pro-divider"></div>

          {/* Password Section - Updated with Toggle */}
          <div className="pro-input-section">
            <label>Security</label>
            <div className="pro-input-wrapper">
              <Lock className="pro-field-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                className="pro-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button className="pro-action-btn pro-secondary" onClick={changePassword}>
              Change Password
            </button>
          </div>

          <button 
            className="pro-logout-btn" 
            onClick={() => handleLogout(navigate)}
          >
            <LogOut size={18} />
            <span>Logout Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;