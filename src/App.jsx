import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import SageOS from './components/SageOS';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page (Public) */}
        <Route path="/" element={<Landing />} />

        {/* Dashboard / SageOS (Original Interface) */}
        <Route path="/dashboard" element={<SageOS />} />

        {/* Blog Placeholder */}
        <Route path="/blog" element={
          <div className="min-h-screen bg-gradient-to-br from-[hsl(240,20%,8%)] to-[hsl(280,25%,10%)] text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-black mb-4">Blog Coming Soon</h1>
              <p className="text-gray-400 mb-8">SEO自動化エージェントが記事を生成中...</p>
              <Link to="/" className="text-purple-400 hover:text-purple-300 underline">
                ← ホームに戻る
              </Link>
            </div>
          </div>
        } />

        {/* Docs Placeholder */}
        <Route path="/docs" element={
          <div className="min-h-screen bg-gradient-to-br from-[hsl(240,20%,8%)] to-[hsl(280,25%,10%)] text-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-black mb-4">Documentation</h1>
              <p className="text-gray-400 mb-8">Sage 3.0の完全ドキュメント準備中...</p>
              <Link to="/" className="text-cyan-400 hover:text-cyan-300 underline">
                ← ホームに戻る
              </Link>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
