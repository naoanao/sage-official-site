"use client";

import { useEffect, useRef } from "react";

class Star {
  private width: number;
  private height: number;
  x: number;
  y: number;
  private size: number;
  private speed: number;
  private opacity: number;
  private shimmer: number;
  private shimmerSpeed: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 1.5 + 0.5;
    this.speed = Math.random() * 2 + 0.5;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.shimmer = Math.random() * 100;
    this.shimmerSpeed = Math.random() * 0.05 + 0.02;
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
    if (this.x < -10) this.reset();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const currentOpacity = this.opacity * (0.6 + Math.abs(Math.sin(this.shimmer)) * 0.4);
    ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    const stars: Star[] = [];
    const numStars = 200;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push(new Star(canvas.width, canvas.height));
      }
    };

    window.addEventListener("resize", resize);
    resize();

    const animate = () => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const star of stars) {
        star.update();
        star.draw(ctx);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ backgroundColor: "#000" }}
    />
  );
}
