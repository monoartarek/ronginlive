import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import Version from "../Version"

function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const [openSub, setOpenSub] = useState(null);

  // Full structured menu with FontAwesome classes
  const menu = [
    { title: 'Dashboard', icon: 'fas fa-home', path: '/' },
    { title: 'Panels', icon: 'fas fa-cog', path: '/panels' },
    // { title: 'Market Coins', icon: 'fas fa-coins', path: '/market-coins' },

    {
      title: 'Manager',
      icon: 'fas fa-user-shield',
      label: 'Make/Remove Manager', path: '/manager/create' 
      
    },

    {
      title: 'Reseller',
      icon: 'fas fa-user',
      
       label: 'Make/Remove Reseller', path: '/reseller/create' 
        
    },

    {
      title: 'Users',
      icon: 'fas fa-users',
      label: 'All Users', path: '/users/all'
        
    },

    {
      title: 'App Admin',
      icon: 'fas fa-cogs',
      label: 'Make App Admin', path: '/app-admin/create' 
    },

    {
      title: 'HOST/Agency',
      icon: 'fas fa-building',
      sub: [
        { label: 'All Earning', path: '/host/earnings' },
        { label: 'All Agency', path: '/all-agencies' },
        { label: 'All Agency History', path: '/host/history' }
        
      ]
    },

    { title: 'Daily Bonus', icon: 'fas fa-gift', path: '/app-admin/daily-bonus' },
    { title: 'Live Bonus', icon: 'fas fa-gift', path: '/live-bonus' },
    { title: 'Live Streams', icon: 'fas fa-video', path: '/live-streaming' },
    { title: 'Splash Banner', icon: 'fas fa-bolt', path: '/splash-banner' },
    { title: 'Banner Image', icon: 'fas fa-image', path: '/banner-image' },
    { title: 'Messages', icon: 'fas fa-envelope', path: '/messages' },
    { title: 'Posts', icon: 'fas fa-file-alt', path: '/posts' },
    { title: 'Comments', icon: 'fas fa-comments', path: '/comments' },
    { title: 'Stories', icon: 'fas fa-film', path: '/stories' },
    {
      title: 'Official Announce',
      icon: 'fas fa-bullhorn',
      sub: [
        { label: 'All Announcements', path: '/announcements/all' },
        { label: 'Add New Announcement', path: '/announcements/add' }
      ]
    },
    {
      title: 'Gifts',
      icon: 'fas fa-gift',
      sub: [
        { label: 'All Gifts', path: '/gifts/all' },
        { label: 'Add New Gift', path: '/gifts/add-new' }
      ]
    },
    // {
    //   title: 'VIP',
    //   icon: 'fas fa-gem',
    //   sub: [
    //     { label: 'All Assets', path: '/vip-assets' },
    //     { label: 'Add New Assets', path: '/vip/add' }
    //   ]
    // },


    { title: 'VIP', icon: 'fas fa-gem', path: '/vip/add' },

    { title: 'Avatar Frame', icon: 'fas fa-image', path: '/avatar/add' },



    // {
    //   title: 'Avatar Frame',
    //   icon: 'fas fa-image',
    //   sub: [
    //     { label: 'All Avatar Frame', path: '/avatar-frames' },
    //     { label: 'Add New Avatar Frame', path: '/avatar/add' }
    //   ]
    // },


{ title: 'Party Theme', icon: 'fas fa-palette', path: '/party-themes/add' },
    // {
    //   title: 'Party Theme',
    //   icon: 'fas fa-palette',
    //   sub: [
    //     { label: 'All Party Themes', path: '/party-themes' },
    //     { label: 'Add New Party Theme', path: '/party-themes/add' }
    //   ]
    // },

    { title: 'Entrance Effect', icon: 'fas fa-magic', path: '/entrance-effects/add' },


    // {
    //   title: 'Entrance Effect',
    //   icon: 'fas fa-magic',
    //   sub: [
    //     { label: 'All Entrance Effects', path: '/entrance-effects' },
    //     { label: 'Add New Entrance Effects', path: '/entrance-effects/add' }
    //   ]
    // },


    {
      title: 'Salary Reports',
      icon: 'fas fa-file-invoice-dollar',
      sub: [
        { label: 'Salary Queries', path: '/salary-queries' },
        { label: 'Full Reports', path: '/full-reports' }
      ]
    },


    
    { title: 'Top Streams', icon: 'fas fa-star', path: '/top-streams' },
    



    {title: 'Gift & Coin History',
      icon: 'fas fa-history',
      sub: [
        { label: 'Gift History', path: '/gift-history' },
        { label: 'Coin History', path: '/coin-history' }
      ]
    },

    { title: 'Game History', icon: 'fas fa-gamepad', path: '/games-history' },
    { title: 'App Settings', icon: 'fas fa-cogs', path: '/app-settings' },
    // { title: 'Agora Settings', icon: 'fas fa-cogs', path: '/agora-settings' },
    // { title: 'Payments', icon: 'fas fa-hand-holding-usd', path: '/payments' },

    // {
    //   title: 'Gift & Coin History',
    //   icon: 'fas fa-history',
    //   sub: [
    //     { label: 'Gift History', path: '/gift-history' },
    //     { label: 'Coin History', path: '/coin-history' }
    //   ]
    // },

    { title: 'Reports', icon: 'fas fa-chart-line', path: '/reports' },
    { title: 'Login History', icon: 'fas fa-history', path: '/adminloginhistory' },
    // { title: 'Banned Devices', icon: 'fas fa-ban', path: '/banned-devices' },

    // {
    //   title: 'Streamings',
    //   icon: 'fas fa-tv',
    //   sub: [
    //     { label: 'Streamings', path: '/live-streaming' },
    //     // { label: 'Create New Ad', path: '/ads/create' },
    //     // { label: 'Google Admob', path: '/ads/admob' }
    //   ]
    // }
  ];

  const handleToggleSub = (title) => {
    setOpenSub(openSub === title ? null : title);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'show' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-controls">
          <button
            className="arrow-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menu.map(item => (
            <div key={item.title} className="menu-block">

              {!item.sub ? (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <i className={item.icon}></i>
                  {!isCollapsed && <span className="label">{item.title}</span>}
                </NavLink>
              ) : (
                <>
                  <div
                    className={`menu-item ${openSub === item.title ? 'active' : ''}`}
                    onClick={() => handleToggleSub(item.title)}
                  >
                    <i className={item.icon}></i>
                    {!isCollapsed && <span className="label">{item.title}</span>}
                    {!isCollapsed && <span className="chevron">{openSub === item.title ? '▾' : '▸'}</span>}
                  </div>

                  {openSub === item.title && (
                    <div className="submenu">
                      {item.sub.map(subItem => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          className={({ isActive }) => `sub-item ${isActive ? 'active' : ''}`}
                          onClick={() => setIsMobileOpen(false)}
                        >
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          ))}
        </nav>

        {/* update version control */}
        <Version/>


      </aside>

      
    </>
  );
}

export default Sidebar;
