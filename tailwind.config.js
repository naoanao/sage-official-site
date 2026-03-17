export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'shake': 'shake 0.4s ease-in-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '20%':      { transform: 'translateX(-6px)' },
                    '40%':      { transform: 'translateX(6px)' },
                    '60%':      { transform: 'translateX(-4px)' },
                    '80%':      { transform: 'translateX(4px)' },
                },
            }
        },
    },
    plugins: [],
}
