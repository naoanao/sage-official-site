import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

const Landing = lazy(() => import('./pages/Landing'))
const SageOS = lazy(() => import('./pages/SageOS'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const ThankYou = lazy(() => import('./pages/ThankYou'))
const Shop = lazy(() => import('./pages/Shop'))
const SalesPage = lazy(() => import('./pages/SalesPage'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const NotFound = lazy(() => import('./pages/Landing'))  // reuse Landing as 404 fallback

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0F1E',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '3px solid #1A56DB',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: '#64748b', fontSize: '14px', fontFamily: 'monospace' }}>Loading Sage...</span>
    </div>
  )
}

function App() {
  // Hide splash after React's first paint (root.render is async in React 18)
  useEffect(() => {
    if (typeof window.__hideSplash === 'function') window.__hideSplash()
  }, [])

  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<SageOS />} />
          <Route path="/dashboard/*" element={<SageOS />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/offer" element={<SalesPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
