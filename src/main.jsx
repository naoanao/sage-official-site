import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)

// Hide native splash screen once React has rendered
if (typeof window.__hideSplash === 'function') {
    window.__hideSplash()
} else {
    // Fallback: hide after first paint
    requestAnimationFrame(() => {
        if (typeof window.__hideSplash === 'function') window.__hideSplash()
    })
}
