import React from 'react';

const AccessCockpit = () => (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 480, textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Sage Cockpit</h1>
            <p style={{ color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
                The Cockpit runs locally with your AI stack.<br />
                After purchase, follow the setup guide to launch it on your machine.
            </p>
            <a
                href="https://whop.com/segeai/"
                style={{
                    display: 'inline-block', padding: '14px 32px',
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff', borderRadius: 12, fontWeight: 700,
                    textDecoration: 'none', fontSize: 16, marginBottom: 16,
                }}
            >
                Get Access on Whop →
            </a>
            <br />
            <a href="/" style={{ color: '#64748b', fontSize: 14 }}>← Back to Home</a>
        </div>
    </div>
);

export default AccessCockpit;
