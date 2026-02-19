import React, { useEffect, useRef } from 'react';

class Star {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.reset();
        this.x = Math.random() * width;
    }

    reset() {
        this.x = this.width + 10;
        this.y = Math.random() * this.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speed = Math.random() * 2 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.shimmer = Math.random() * 100;
        this.shimmerSpeed = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x -= this.speed;
        this.shimmer += this.shimmerSpeed;

        if (this.x < -10) {
            this.reset();
        }
    }

    draw(ctx) {
        const currentOpacity = this.opacity * (0.6 + Math.abs(Math.sin(this.shimmer)) * 0.4);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const SpaceBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const stars = [];
        const numStars = 200;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            stars.length = 0;
            for (let i = 0; i < numStars; i++) {
                stars.push(new Star(canvas.width, canvas.height));
            }
        };

        window.addEventListener('resize', resize);
        resize();

        const animate = () => {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            stars.forEach(star => {
                star.update();
                star.draw(ctx);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{
                zIndex: 0,
                backgroundColor: '#000'
            }}
        />
    );
};

export default SpaceBackground;
