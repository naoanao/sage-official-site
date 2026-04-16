import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import SageOS from './pages/SageOS'
import SubscriberGate from './pages/SubscriberGate'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import ThankYou from './pages/ThankYou'
import Shop from './pages/Shop'
import SalesPage from './pages/SalesPage'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import StoreManager from './pages/StoreManager'
import Contact from './pages/Contact'
import Onboarding from './pages/Onboarding'
import ToastContainer from './components/ToastContainer'
import { initUTMCapture, trackPageView } from './utils/tracking'
import './App.css'

// UTMキャプチャ + ページビュートラッキング（ルート変更ごとに実行）
function TrackingInit() {
  const location = useLocation();
  React.useEffect(() => {
    initUTMCapture();
  }, []); // 初回のみ
  React.useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <TrackingInit />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<SubscriberGate />} />
        <Route path="/dashboard/*" element={<SubscriberGate />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        {/* /thank-you は /onboarding にリダイレクト（Stripe payment link の success_url は変更不要） */}
        <Route path="/thank-you" element={<Navigate to="/onboarding" replace />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/manager" element={<StoreManager />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/automations" element={<Navigate to="/dashboard" stat