import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BlogPost from './pages/BlogPost'
import AccessCockpit from './pages/AccessCockpit'
import Builder from './pages/Builder'
import AdminDashboard from './pages/admin/Dashboard'
import ThankYou from './pages/ThankYou'
import SalesPage from './pages/SalesPage'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                {/* /dashboard: Cockpit setup guide (purchase page) */}
                <Route path="/dashboard" element={<AccessCockpit />} />
                {/* /admin: Actual Admin Dashboard (requires Flask running via ngrok) */}
                <Route path="/admin" element={<AdminDashboard />} />
                {/* /builder: AI Code Builder tool (runs locally on port 3001) */}
                <Route path="/builder" element={<Builder />} />
                {/* /thank-you: Post-purchase confirmation page */}
                <Route path="/thank-you" element={<ThankYou />} />
                {/* /sales: Dedicated sales page */}
                <Route path="/sales" element={<SalesPage />} />
                {/* Catch-all: send back to landing */}
                <Route path="*" element={<Landing />} />
            </Routes>
        </Router>
    )
}

export default App
