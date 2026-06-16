import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

//component import 
import Sidebar from './components/Sidebar/Sidebar';
import Navbar from './components/Navbar/Navbar';

//pages import 
import Dashboard from './Pages/Dashboard';
import MarketCoins from './Pages/MarketCoins';
import AllUsers from './Pages/AllUsers';
import MakeManager from './Pages/MakeOrRemoveManager';
import MakeReseller from './Pages/MakeReseller';
import AppadminPage from './Pages/MakeAppAdmin';  
import AllEarnings from './Pages/AllEarnings';
import AllAgencyHistory from './Pages/AllAgencyHistory';
// import OnlyAdmins from './Pages/AllAdmins';
import DailyBonusPage from './Pages/DailyBonus';
import AppSettingsPage from './Pages/AppSettings';
import Posts from './Pages/Posts';
import Comments from './Pages/Comments';
import BannerPage from './Pages/Banner';
import SplashBannerPage from './Pages/SplashBanner';
import LiveBonusPage from './Pages/LiveBonus';
import LiveStreaming from './Pages/LiveStreaming';
import TopStreamsPage from './Pages/TopStreams';  
import StoriesPage from './Pages/Stories';
import GiftsPage from './Pages/AllGifts';
import AddNewGiftsPage from './Pages/AddNewGifts';
import AddNewAssetsPage from './Pages/AddNewAssets';
// import AvatarFramesPage from './Pages/AvatarFrames';
import AddNewFramePage from './Pages/AddNewFrame';
// import AllPartyThemes from './Pages/AllPartyThemes';
import AddPartyThemesPage from './Pages/AddPartyThemes';
// import EntranceEffectPage from './Pages/AllEntranceEffect';
import AddEntranceEffectPage from './Pages/AddEntranceEffect';
import AllAnnouncementsPage from './Pages/Announcements';
import AddNewAnnouncementPage from './Pages/AddNewAnnouncement';
import GamesHistoryPage from './Pages/GamesHistory';
import AgoraPage from './Pages/Agora';
import ReportsPage from './Pages/Reports';
// import Streamings from './Pages/Streamings';
import AllAgency from './Pages/AllAgency';
import AllMessagesPage from './Pages/AllMessages';
import AdminLoginHistoryPage from './Pages/AdminLoginHistory';
import BannedDevicePage from './Pages/BannedDevice';
import SalaryQueryPage from './Pages/SalaryQuery';
import FullReportPage from './Pages/FullReport';
import GiftHistory from './Pages/GiftHistory';
import CoinHistory from './Pages/CoinHistory';
import Panels from './Pages/Panels';






import Login from './Pages/Login';

import ProtectedRoute from './components/ProtectedRoute';

import './App.css';
import Profile from "./Pages/Profile";
import GiftHistoryPage from './Pages/GiftHistory';
import CoinHistoryPage from './Pages/CoinHistory';


import { StreamingProvider } from "../src/components/LiveStreaming/StreamingContext";





function App() {

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);


  return (
    <StreamingProvider>
    <Routes>

      {/* LOGIN ROUTE */}
      <Route path="/login" element={<Login />} />


      {/* PROTECTED ROUTES */}
      <Route path="/*" element={

        <ProtectedRoute>

          <div className="app-wrapper">

            <Navbar
              onHamburgerClick={() =>
                setIsMobileOpen(!isMobileOpen)
              }
            />

            <div className={`layout-body ${isCollapsed ? 'collapsed' : ''}`}>

              <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
              />

              <main className="main-content">

                <div className="content-container">

                  <Routes>

                    <Route path="/" element={<Dashboard />} />

                    <Route path="/profile" element={<Profile />} />
                    
                    <Route path="/market-coins" element={<MarketCoins />} />

                    <Route path="/users/all" element={<AllUsers />} />

                    <Route path="/manager/create" element={<MakeManager />} />

                    <Route path="/reseller/create" element={<MakeReseller />} />

                    <Route path="/app-admin/create" element={<AppadminPage />} />

                    <Route path="/host/earnings" element={<AllEarnings />} />

                    <Route path="/host/history" element={<AllAgencyHistory />} /> 

                    {/* <Route path="/app-admin/list" element={<OnlyAdmins />} />   */}

                    <Route path="/app-admin/daily-bonus" element={<DailyBonusPage />} />  

                    <Route path="/app-settings" element={<AppSettingsPage />} />

                    <Route path="/posts" element={<Posts />} />

                    <Route path="/comments" element={<Comments />} />

                    <Route path ="/banner-image" element={<BannerPage />} />

                    <Route path ="/splash-banner" element={<SplashBannerPage />} />

                    <Route path ="/live-bonus" element={<LiveBonusPage />} />

                    <Route path ="/live-streaming" element={<LiveStreaming />} />

                    <Route path ="/top-streams" element={<TopStreamsPage />} />

                    <Route path ="/stories" element={<StoriesPage />} />  

                    <Route path ="/gifts/all" element={<GiftsPage />} />

                    <Route path ="/gifts/add-new" element={<AddNewGiftsPage />} />

                    {/* <Route path ="/vip-assets" element={<AllAssetsPage />} />  */}

                    <Route path ="/vip/add" element={<AddNewAssetsPage />} /> 

                    {/* <Route path ="/avatar-frames" element={<AvatarFramesPage />} /> */}

                    <Route path ="/avatar/add" element={<AddNewFramePage />} />

                

                    <Route path ="/party-themes/add" element={<AddPartyThemesPage />} />

                    {/* <Route path ="/entrance-effects" element={<EntranceEffectPage />} /> */}

                    <Route path ="/entrance-effects/add" element={<AddEntranceEffectPage />} />

                    <Route path ="/announcements/all" element={<AllAnnouncementsPage />} />

                    <Route path ="/announcements/add" element={<AddNewAnnouncementPage />} />

                    <Route path ="/games-history" element={<GamesHistoryPage />} />

                    <Route path ="/agora-settings" element={<AgoraPage />} />

                    <Route path ="/reports" element={<ReportsPage />} />

                    {/* <Route path ="/live-streaming" element={<Streamings />} /> */}

                    <Route path ="/all-agencies" element={<AllAgency />} />

                    <Route path ="/messages" element={<AllMessagesPage />} />

                    <Route path ="/adminloginhistory" element={<AdminLoginHistoryPage />} />

                    <Route path ="/banned-devices" element={<BannedDevicePage />} />

                    <Route path ="/salary-queries" element={<SalaryQueryPage />} />

                    <Route path ="/full-reports" element={<FullReportPage />} />

                    <Route path ="/gift-history" element={<GiftHistoryPage   />} />

                    <Route path ="/coin-history" element={<CoinHistoryPage/>} />

                     <Route path ="/panels" element={<Panels/>} />

                    

                  
                    
                  </Routes>

                </div>

              </main>

            </div>

          </div>

        </ProtectedRoute>

      } />

    </Routes>

    </StreamingProvider>

  );

}

export default App;