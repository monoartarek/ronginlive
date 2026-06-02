import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; 
import App from './App';
import './index.css';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    {/* remove basname at others app */}

    <BrowserRouter basename="/RonginLiveNewUpdatedAdminPanel3dhdie78">
    {/* <BrowserRouter> */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);