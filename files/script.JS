"use strict";

(() => {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const settings = {
    pink: "#eb5a94",
    lightPink: "#ffd5e5",
    frequency: 0.004,
    phaseSpeed: 0.00042,
    starCount: 100,
  };

  const surfaces = ["waveCanvas", "waveCanvasMirror"].flatMap((id) => {
    const canvas = document.getElementById(id);
    const context = canvas?.getContext("2d");
    return context ? [{
      canvas, context, mirrored: id === "waveCanvasMirror", width: 0, height: 0,
    }] : [];
  });

  const stars = Array.from({ length: settings.starCount }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 3 + 1,
    speed: Math.random() + 1,
  }));

  let phase = 0;
  let frameId = null;
  let previousTime = null;

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
        context.fillStyle = settings.pink;
        for (const star of stars) {
          context.beginPath();
          context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
          context.fill();
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
      for (const star of stars) {
        star.y += star.speed * elapsed / (1000 / 60) / primary.height;
        if (star.y > 1 + star.size / primary.height) {
          star.y = -star.size / primary.height;
          star.x = Math.random();
        }
      }
    }
    render();
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
      render();
    }
  }

  if (surfaces.length) {
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
