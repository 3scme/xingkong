"use strict";

(() => {
  const canvas = document.querySelector("#sky");
  const ctx = canvas.getContext("2d", { alpha: true });

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let width = 0;
  let height = 0;
  let dpr = 1;

  let stars = [];
  let temporaryStars = [];
  let shootingStars = [];

  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;

  let previousTime = performance.now();
  let nextShootingStarAt = 0;

  const layers = [
    {
      density: 0.00006,
      minRadius: 0.25,
      maxRadius: 0.7,
      alphaMin: 0.16,
      alphaMax: 0.42,
      parallax: 2.5,
      twinkle: 0.05
    },
    {
      density: 0.000032,
      minRadius: 0.45,
      maxRadius: 1.0,
      alphaMin: 0.28,
      alphaMax: 0.70,
      parallax: 5,
      twinkle: 0.10
    },
    {
      density: 0.000014,
      minRadius: 0.8,
      maxRadius: 1.55,
      alphaMin: 0.50,
      alphaMax: 0.96,
      parallax: 8,
      twinkle: 0.14
    }
  ];

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    generateStars();
  }

  function generateStars() {
    stars = [];
    const area = width * height;

    for (const layer of layers) {
      const count = Math.max(10, Math.round(area * layer.density));

      for (let i = 0; i < count; i += 1) {
        const radius = random(layer.minRadius, layer.maxRadius);

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha: random(layer.alphaMin, layer.alphaMax),
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: random(0.00018, 0.0007),
          parallax: layer.parallax,
          twinkle: layer.twinkle,
          revealDelay: random(0, 5000),
          hueShift: random(-8, 8),
          flare: radius > 1.1 && Math.random() < 0.5
        });
      }
    }
  }

  function updatePointer(delta) {
    if (reducedMotion) {
      pointerX = 0;
      pointerY = 0;
      return;
    }

    const smoothing = Math.min(1, delta * 0.0045);
    pointerX += (targetPointerX - pointerX) * smoothing;
    pointerY += (targetPointerY - pointerY) * smoothing;
  }

  function drawBackground(time) {
    ctx.clearRect(0, 0, width, height);

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#030816");
    base.addColorStop(0.55, "#02050d");
    base.addColorStop(1, "#010309");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const driftX = pointerX * 18;
    const driftY = pointerY * 14;

    const glowA = ctx.createRadialGradient(
      width * 0.5 + driftX,
      height * 0.42 + driftY,
      0,
      width * 0.5 + driftX,
      height * 0.42 + driftY,
      Math.max(width, height) * 0.52
    );
    glowA.addColorStop(0, "rgba(60, 110, 255, 0.12)");
    glowA.addColorStop(0.4, "rgba(34, 70, 165, 0.06)");
    glowA.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, width, height);

    const glowB = ctx.createRadialGradient(
      width * 0.22 - driftX * 0.5,
      height * 0.18 - driftY * 0.5,
      0,
      width * 0.22 - driftX * 0.5,
      height * 0.18 - driftY * 0.5,
      Math.max(width, height) * 0.22
    );
    glowB.addColorStop(0, "rgba(90, 145, 255, 0.08)");
    glowB.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, width, height);

    const glowC = ctx.createRadialGradient(
      width * 0.82 + driftX * 0.4,
      height * 0.22 + driftY * 0.3,
      0,
      width * 0.82 + driftX * 0.4,
      height * 0.22 + driftY * 0.3,
      Math.max(width, height) * 0.18
    );
    glowC.addColorStop(0, "rgba(120, 180, 255, 0.06)");
    glowC.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glowC;
    ctx.fillRect(0, 0, width, height);

    if (!reducedMotion) {
      const shimmer = 0.012 + Math.sin(time * 0.00018) * 0.006;
      const veil = ctx.createLinearGradient(0, 0, width, height);
      veil.addColorStop(0, `rgba(120, 170, 255, ${shimmer})`);
      veil.addColorStop(0.5, "rgba(0, 0, 0, 0)");
      veil.addColorStop(1, `rgba(90, 130, 220, ${shimmer * 0.7})`);
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawStar(x, y, radius, alpha, flare = false) {
    if (alpha <= 0) return;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(237, 243, 255, ${alpha})`;
    ctx.fill();

    const glowRadius = radius > 1 ? radius * 6 : radius * 3.5;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glow.addColorStop(0, `rgba(176, 210, 255, ${alpha * 0.20})`);
    glow.addColorStop(1, "rgba(176, 210, 255, 0)");
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    if (flare) {
      ctx.save();
      ctx.strokeStyle = `rgba(215, 230, 255, ${alpha * 0.18})`;
      ctx.lineWidth = 0.6;

      ctx.beginPath();
      ctx.moveTo(x - radius * 5.5, y);
      ctx.lineTo(x + radius * 5.5, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y - radius * 5.5);
      ctx.lineTo(x, y + radius * 5.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPermanentStars(time) {
    for (const star of stars) {
      const reveal = reducedMotion
        ? 1
        : clamp((time - star.revealDelay) / 4200, 0, 1);

      const twinkle = reducedMotion
        ? 1
        : 1 + Math.sin(time * star.twinkleSpeed + star.phase) * star.twinkle;

      const alpha = clamp(star.baseAlpha * reveal * twinkle, 0, 1);

      const x = star.x + pointerX * star.parallax;
      const y = star.y + pointerY * star.parallax;

      drawStar(x, y, star.radius, alpha, star.flare);
    }
  }

  function createTemporaryStar(x, y) {
    temporaryStars.push({
      x,
      y,
      created: performance.now(),
      lifetime: random(6500, 11000),
      radius: random(1.1, 1.9),
      alpha: random(0.72, 0.96),
      phase: Math.random() * Math.PI * 2
    });

    if (temporaryStars.length > 18) {
      temporaryStars.shift();
    }
  }

  function drawTemporaryStars(time) {
    temporaryStars = temporaryStars.filter((star) => {
      const age = time - star.created;
      if (age >= star.lifetime) return false;

      const progress = age / star.lifetime;
      const fadeIn = Math.min(1, progress / 0.08);
      const fadeOut = progress < 0.45 ? 1 : 1 - (progress - 0.45) / 0.55;
      const pulse = reducedMotion
        ? 1
        : 1 + Math.sin(time * 0.0012 + star.phase) * 0.07;

      const alpha = star.alpha * fadeIn * Math.max(0, fadeOut) * pulse;

      drawStar(star.x, star.y, star.radius, alpha, true);
      return true;
    });
  }

  function scheduleNextShootingStar(time) {
    if (reducedMotion) {
      nextShootingStarAt = Infinity;
      return;
    }

    nextShootingStarAt = time + random(3500, 9000);
  }

  function spawnShootingStar(time) {
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? random(-width * 0.15, width * 0.2) : random(width * 0.8, width * 1.15);
    const startY = random(height * 0.08, height * 0.42);

    const angle = fromLeft
      ? random(0.42, 0.72)
      : random(2.42, 2.72);

    const speed = random(760, 1120);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    shootingStars.push({
      x: startX,
      y: startY,
      vx,
      vy,
      life: 0,
      maxLife: random(700, 1100),
      length: random(90, 170),
      alpha: random(0.65, 0.95)
    });

    scheduleNextShootingStar(time);
  }

  function drawShootingStars(delta) {
    shootingStars = shootingStars.filter((star) => {
      star.life += delta;
      if (star.life >= star.maxLife) return false;

      const t = star.life / star.maxLife;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;

      const seconds = delta / 1000;
      star.x += star.vx * seconds;
      star.y += star.vy * seconds;

      const dx = star.vx;
      const dy = star.vy;
      const mag = Math.hypot(dx, dy) || 1;
      const ux = dx / mag;
      const uy = dy / mag;

      const tailX = star.x - ux * star.length;
      const tailY = star.y - uy * star.length;

      const gradient = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.alpha * fade})`);
      gradient.addColorStop(0.18, `rgba(180, 215, 255, ${star.alpha * fade * 0.9})`);
      gradient.addColorStop(1, "rgba(120, 170, 255, 0)");

      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, 18);
      glow.addColorStop(0, `rgba(255, 255, 255, ${star.alpha * fade * 0.9})`);
      glow.addColorStop(1, "rgba(150, 200, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return star.x > -200 && star.x < width + 200 && star.y > -200 && star.y < height + 200;
    });
  }

  function frame(time) {
    const delta = Math.min(50, time - previousTime);
    previousTime = time;

    updatePointer(delta);
    drawBackground(time);
    drawPermanentStars(time);
    drawTemporaryStars(time);

    if (time >= nextShootingStarAt) {
      spawnShootingStar(time);
    }

    drawShootingStars(delta);

    requestAnimationFrame(frame);
  }

  function setPointer(clientX, clientY) {
    targetPointerX = (clientX / width - 0.5) * 2;
    targetPointerY = (clientY / height - 0.5) * 2;
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      setPointer(event.clientX, event.clientY);
    },
    { passive: true }
  );

  window.addEventListener("pointerleave", () => {
    targetPointerX = 0;
    targetPointerY = 0;
  });

  window.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-contact]")) {
      return;
    }

    createTemporaryStar(event.clientX, event.clientY);
  });

  window.addEventListener("resize", resize, { passive: true });

  resize();
  scheduleNextShootingStar(performance.now());

  requestAnimationFrame(() => {
    document.body.classList.add("ready");
  });

  requestAnimationFrame(frame);
})();
