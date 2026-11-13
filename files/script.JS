"use strict";

(() => {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const settings = {
    pink: "#eb5a94",
    lightPink: "#ffd5e5",
    frequency: 0.004,
    phaseSpeed: 0.00042,
    burstMinDelay: 2000,
    burstMaxDelay: 3000,
    burstMaxStars: 5,
  };

  const surfaces = ["waveCanvas", "waveCanvasMirror"].flatMap((id) => {
    const canvas = document.getElementById(id);
    const context = canvas?.getContext("2d");
    return context ? [{
      canvas, context, mirrored: id === "waveCanvasMirror", width: 0, height: 0,
    }] : [];
  });

  const stars = [];

  function randomBurstDelay() {
    return settings.burstMinDelay
      + Math.random() * (settings.burstMaxDelay - settings.burstMinDelay);
  }

  let nextBurstIn = randomBurstDelay();

  function spawnStarBurst() {
    const count = 1 + Math.floor(Math.random() * settings.burstMaxStars);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: 0.05 + Math.random() * 0.9,
        y: Math.random() * 0.22,
        size: 6 + Math.random() * 7,
        age: -Math.random() * 250,
        lifetime: 1800 + Math.random() * 1000,
        drop: 0.45 + Math.random() * 0.3,
        drift: (0.35 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
        rotation: (Math.random() - 0.5) * Math.PI / 3,
        spin: (Math.random() - 0.5) * Math.PI / 3,
      });
    }
  }

  function starPosition(star, progress, width, height) {
    const distance = Math.min(width, height);
    const travel = progress * (0.3 + 0.7 * progress);
    return {
      x: star.x * width + star.drift * travel * distance,
      y: star.y * height + star.drop * travel * distance,
    };
  }

  function drawStar(context, star, width, height) {
    if (star.age < 0) return;
    const progress = Math.min(star.age / star.lifetime, 1);
    const { x, y } = starPosition(star, progress, width, height);
    const tail = starPosition(star, Math.max(0, progress - 0.14), width, height);
    const rotation = star.rotation + star.spin * progress;
    context.save();
    context.globalAlpha = Math.min(1, progress / 0.12, (1 - progress) / 0.3);
    // A short transparent tail follows the same trajectory as the star.
    if (progress > 0) {
      const trail = context.createLinearGradient(tail.x, tail.y, x, y);
      trail.addColorStop(0, "rgba(235, 90, 148, 0)");
      trail.addColorStop(1, "rgba(235, 90, 148, 0.38)");
      context.strokeStyle = trail;
      context.lineWidth = 1.5;
      context.lineCap = "round";
      context.shadowColor = "rgba(235, 90, 148, 0.35)";
      context.shadowBlur = 4;
      context.beginPath();
      context.moveTo(tail.x, tail.y);
      context.lineTo(x, y);
      context.stroke();
    }

    context.fillStyle = settings.pink;
    context.shadowColor = "rgba(235, 90, 148, 0.55)";
    context.shadowBlur = 10;
    context.beginPath();
    for (let point = 0; point < 8; point++) {
      const angle = rotation - Math.PI / 2 + point * Math.PI / 4;
      const radius = point % 2 === 0 ? star.size : star.size * 0.18;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    context.restore();
  }

  let phase = 0;
  let frameId = null;
  let previousTime = null;
  let cursorTrail = null;

  function trailColorAt(x, y) {
    const target = document.elementFromPoint(x, y);
    const page = target?.closest(".page");
    let color = page?.classList.contains("about") ? [235, 90, 148] : [255, 255, 255];
    const surface = surfaces.find(({ canvas }) => canvas.parentElement === page);
    if (surface) {
      const bounds = surface.canvas.getBoundingClientRect();
      const localX = x - bounds.left;
      const localY = y - bounds.top;
      const amplitude = Math.abs(surface.width / 2 - localX) / (surface.width / 2) * 50;
      const edge = surface.height / 2 + Math.sin(localX * settings.frequency + phase) * amplitude;
      const canvasY = surface.mirrored ? surface.height - localY : localY;
      if (canvasY >= edge) {
        color = canvasY >= edge + Math.max(1, Math.abs(Math.sin(phase)) * 5)
          ? [235, 90, 148] : [255, 213, 229];
      }
    }

    // Composite panel and card backgrounds over the animated wave.
    const layers = [];
    for (let element = target; element && element !== page; element = element.parentElement) {
      layers.push(element);
    }
    for (const element of layers.reverse()) {
      const channels = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3) continue;
      const alpha = channels[3] ?? 1;
      color = color.map((channel, i) => channels[i] * alpha + channel * (1 - alpha));
    }
    const isPink = color[0] - color[1] > 25 && color[0] - color[2] > 12;
    return isPink ? [255, 255, 255] : [235, 90, 148];
  }

  function initializeCursorTrail() {
    if (!window.matchMedia("(any-pointer: fine)").matches) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.className = "cursor-trail";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    cursorTrail = { canvas, context, points: [], pending: null };

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      clearCursorTrail();
    }

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || motionPreference.matches || document.hidden) return;
      cursorTrail.pending = { x: event.clientX, y: event.clientY };
    }, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", clearCursorTrail, { passive: true });
    window.addEventListener("blur", clearCursorTrail);
    document.documentElement.addEventListener("pointerleave", clearCursorTrail);
    resize();
  }

  function clearCursorTrail() {
    if (!cursorTrail) return;
    cursorTrail.points.length = 0;
    cursorTrail.pending = null;
    cursorTrail.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function drawCursorTrail(elapsed) {
    if (!cursorTrail) return;
    const { context, points, pending } = cursorTrail;
    const lifetime = 420;
    for (let i = points.length - 1; i >= 0; i--) {
      points[i].age += elapsed;
      if (points[i].age >= lifetime) points.splice(i, 1);
    }
    if (pending) {
      const last = points[points.length - 1];
      if (!last || Math.hypot(pending.x - last.x, pending.y - last.y) >= 2) {
        points.push({ ...pending, age: 0, color: trailColorAt(pending.x, pending.y) });
        if (points.length > 48) points.shift();
      }
      cursorTrail.pending = null;
    }
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowBlur = 5;
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const point = points[i];
      const fade = 1 - point.age / lifetime;
      const gradient = context.createLinearGradient(previous.x, previous.y, point.x, point.y);
      gradient.addColorStop(0, "rgb(" + previous.color.join(",") + ")");
      gradient.addColorStop(1, "rgb(" + point.color.join(",") + ")");
      context.globalAlpha = fade * 0.65;
      context.lineWidth = 3 * fade;
      context.strokeStyle = gradient;
      context.shadowColor = "rgb(" + point.color.join(",") + ")";
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function resizeSurfaces() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    for (const surface of surfaces) {
      const { width, height } = surface.canvas.getBoundingClientRect();
      surface.width = Math.max(1, width);
      surface.height = Math.max(1, height);
      surface.canvas.width = Math.round(surface.width * ratio);
      surface.canvas.height = Math.round(surface.height * ratio);
      surface.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    render();
  }

  function fillWave(surface, offset, color) {
    const { context, width, height } = surface;
    const midpoint = width / 2;
    context.beginPath();
    for (let x = 0; x < width + 2; x += 2) {
      const position = Math.min(x, width);
      const amplitude = Math.abs(midpoint - position) / midpoint * 50;
      const y = height / 2 + Math.sin(position * settings.frequency + phase) * amplitude + offset;
      if (x === 0) context.moveTo(position, y);
      else context.lineTo(position, y);
    }
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  }

  function render() {
    for (const surface of surfaces) {
      const { context, width, height, mirrored } = surface;
      context.clearRect(0, 0, width, height);
      context.save();
      if (mirrored) {
        context.translate(0, height);
        context.scale(1, -1);
      }
      fillWave(surface, 0, settings.lightPink);
      fillWave(surface, Math.max(1, Math.abs(Math.sin(phase)) * 5), settings.pink);
      context.restore();

      if (!mirrored) {
        for (const star of stars) {
          drawStar(context, star, width, height);
        }
      }
    }
  }

  function animate(time) {
    const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 50);
    previousTime = time;
    phase = (phase - settings.phaseSpeed * elapsed) % (Math.PI * 2);
    const primary = surfaces.find((surface) => !surface.mirrored);
    if (primary) {
      nextBurstIn -= elapsed;
      if (nextBurstIn <= 0) {
        spawnStarBurst();
        nextBurstIn = randomBurstDelay();
      }
      for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].age += elapsed;
        if (stars[i].age >= stars[i].lifetime) stars.splice(i, 1);
      }
    }
    render();
    drawCursorTrail(elapsed);
    frameId = requestAnimationFrame(animate);
  }

  function updateAnimation() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    previousTime = null;
    if (!surfaces.length) return;
    if (!document.hidden && !motionPreference.matches) {
      frameId = requestAnimationFrame(animate);
    } else {
      clearCursorTrail();
      stars.length = 0;
      nextBurstIn = randomBurstDelay();
      render();
    }
  }

  if (surfaces.length) {
    initializeCursorTrail();
    const resizeObserver = new ResizeObserver(resizeSurfaces);
    surfaces.forEach(({ canvas }) => resizeObserver.observe(canvas));
    window.addEventListener("resize", resizeSurfaces, { passive: true });
    document.addEventListener("visibilitychange", updateAnimation);
    motionPreference.addEventListener("change", updateAnimation);
    resizeSurfaces();
    updateAnimation();
  }

  document.querySelectorAll(".flip-container").forEach((card) => {
    let pinned = false;
    let hovered = false;

    function updateCard() {
      const flipped = pinned || hovered;
      card.classList.toggle("is-flipped", flipped);
      card.setAttribute("aria-pressed", String(flipped));
    }

    card.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      hovered = true;
      updateCard();
    });
    card.addEventListener("pointerleave", () => {
      hovered = false;
      updateCard();
    });
    card.addEventListener("click", () => {
      pinned = !pinned;
      updateCard();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      pinned = false;
      hovered = false;
      updateCard();
    });
  });
})();
