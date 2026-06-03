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
            {/* Admin link for owner */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #1e293b' }}>
                <p style={{ color: '#475569', fontSize: 12, marginBottom: 12, fontFamily: 'monospace' }}>
                    Already set up? Open the admin panel:
                </p>
                <a
                    href="/admin"
                    style={{
                        display: 'inline-block', padding: '10px 24px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #334155',
                        color: '#94a3b8', borderRadius: 8, fontWeight: 600,
                        textDecoration: 'none', fontSize: 14,
                    }}
                >
                    Open Admin Dashboard →
                </a>
                <p style={{ color: '#334155', fontSize: 11, marginTop: 8, fontFamily: 'monospace' }}>
                    Requires run_sage.ps1 to be running
                </p>
            </div>

            <br />
            <a href="/" style={{ color: '#64748b', fontSize: 14 }}>← Back to Home</a>
        </div>
    </div>
);

export default AccessCockpit;
