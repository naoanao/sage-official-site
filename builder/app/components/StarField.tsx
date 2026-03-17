"use client";

import { useEffect, useRef } from "react";

interface Star {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    shimmer: number;
    shimmerSpeed: number;
    width: number;
    height: number;
}

function createStar(width: number, height: number): Star {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.2 + 0.3,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random() * 0.5 + 0.2,
        shimmer: Math.random() * 100,
        shimmerSpeed: Math.random() * 0.02 + 0.005,
        width,
        height,
    };
}

export function StarField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let rafId: number;
        const stars: Star[] = [];
        const NUM_STARS = 180;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            stars.length = 0;
            for (let i = 0; i < NUM_STARS; i++) {
                stars.push(createStar(canvas.width, canvas.height));
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const star of stars) {
                star.shimmer += star.shimmerSpeed;
                star.x -= star.speed;
                if (star.x < -2) {
                    Object.assign(star, createStar(canvas.width, canvas.height));
                    star.x = canvas.width + 2;
                }
                const opacity = star.opacity * (0.5 + Math.abs(Math.sin(star.shimmer)) * 0.5);
                ctx.fillStyle = `rgba(255,255,255,${opacity})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
            rafId = requestAnimationFrame(animate);
        };

        window.addEventListener("resize", resize);
        resize();
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
