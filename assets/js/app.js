const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.15 },
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

const navLinks = document.querySelectorAll(".nav-links a");
const spySections = ["about", "work"].map((id) => document.getElementById(id)).filter(Boolean);

let spyTicking = false;

function renderSpy() {
    spyTicking = false;
    const middle = window.scrollY + window.innerHeight * 0.5;
    let current = null;
    spySections.forEach((section) => {
        if (section.offsetTop <= middle) current = section;
    });
    navLinks.forEach((link) => {
        link.classList.toggle("is-active", current !== null && link.getAttribute("href") === `#${current.id}`);
    });
}

function requestSpy() {
    if (spyTicking) return;
    spyTicking = true;
    requestAnimationFrame(renderSpy);
}

window.addEventListener("scroll", requestSpy, { passive: true });
window.addEventListener("resize", requestSpy);
requestSpy();

const toTop = document.getElementById("to-top");

function renderToTop() {
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.6);
}

window.addEventListener("scroll", renderToTop, { passive: true });
renderToTop();

if (toTop) {
    toTop.addEventListener("click", () => {
        if (window.UISound) window.UISound.play("back");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
        if (window.UISound) window.UISound.play("select");
    });
});

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".work-item").forEach((item) => {
        item.addEventListener("pointerenter", () => {
            if (window.UISound) window.UISound.play("hover");
        });
    });
}

const themeToggle = document.getElementById("theme-toggle");
const themeColor = document.getElementById("theme-color");

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
        window.localStorage.setItem("mnightingale:theme", theme);
    } catch {
        // Private browsing etc: theme just won't persist.
    }
    if (themeToggle) themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#10151b" : "#eef0f2");
}

if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(document.documentElement.dataset.theme === "dark"));
    themeToggle.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        if (window.UISound) window.UISound.play(next === "dark" ? "toggle-off" : "toggle-on");
    });
}

// --- Pinned spotlight: 3 panels, scroll-driven word highlight ---
const spot = document.querySelector(".spotlight");
const spotBar = document.getElementById("spot-bar");
const spotPanels = Array.from(document.querySelectorAll(".spot-panel"));
const introFlow = document.querySelector(".intro-flow");
const introAscii = document.getElementById("intro-ascii");
let spotProgress = 0;

const spotWords = spotPanels.map((panel) => {
    const el = panel.querySelector("[data-words]");
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = "";
    return words.map((word) => {
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = word;
        el.appendChild(span);
        el.appendChild(document.createTextNode(" "));
        return span;
    });
});

let spotTicking = false;
let spotActive = 0;

function renderSpot() {
    spotTicking = false;
    if (!spot) return;
    const rect = spot.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = Math.min(Math.max(-rect.top / total, 0), 1);
    spotProgress = progress;

    if (spotBar) spotBar.style.transform = `scaleX(${progress})`;

    const exact = progress * spotPanels.length;
    const active = Math.min(Math.floor(exact), spotPanels.length - 1);
    const sub = exact - active;

    if (active !== spotActive) {
        spotActive = active;
        if (window.UISound) window.UISound.play("progress-step");
    }

    spotPanels.forEach((panel, i) => panel.classList.toggle("is-active", i === active));
    spotWords.forEach((words, i) => {
        const litCount = i < active ? words.length : i > active ? 0 : Math.floor(sub * words.length) + 1;
        words.forEach((w, j) => w.classList.toggle("lit", j < litCount));
    });
}

function requestSpot() {
    if (spotTicking) return;
    spotTicking = true;
    requestAnimationFrame(renderSpot);
}

if (spot) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
        spotPanels.forEach((panel, i) => {
            panel.classList.toggle("is-active", i === 0);
            spotWords[i].forEach((w) => w.classList.add("lit"));
        });
        const style = document.createElement("style");
        style.textContent = ".spotlight{height:auto}.spot-inner{position:static;height:auto}.spot-panel{position:static;opacity:1;visibility:visible;margin-bottom:32px}";
        document.head.appendChild(style);
    } else {
        window.addEventListener("scroll", requestSpot, { passive: true });
        window.addEventListener("resize", requestSpot);
        requestSpot();
    }
}

// --- One continuous ASCII field across the hero and About sections ---
if (introAscii && introFlow) {
    const ctx = introAscii.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const glyphs = "  ..::--==++**##@@";
    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let lastFrame = 0;
    const pointer = { x: 0, y: 0, active: false };

    function resizeAscii() {
        const rect = introAscii.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(rect.width));
        height = Math.max(1, Math.round(rect.height));
        introAscii.width = Math.round(width * dpr);
        introAscii.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function smoothstep(edge0, edge1, value) {
        const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
        return t * t * (3 - 2 * t);
    }

    function drawAscii(time = 0) {
        ctx.clearRect(0, 0, width, height);
        const flowRect = introFlow.getBoundingClientRect();
        const scrollable = Math.max(flowRect.height - window.innerHeight, 1);
        const flowProgress = Math.min(Math.max(-flowRect.top / scrollable, 0), 1);
        const heroAmount = 1 - smoothstep(0.12, 0.31, flowProgress);
        const aboutAmount = smoothstep(0.12, 0.3, flowProgress);

        const cell = width < 640 ? 15 : 17;
        const fontSize = cell * 0.82;
        ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let y = cell * 0.5; y < height; y += cell) {
            for (let x = cell * 0.5; x < width; x += cell) {
                const nx = x / width;
                const ny = y / height;
                const bend = Math.sin(nx * 7.2 - time * 0.42) * 0.12;
                const scrollPhase = flowProgress * 5.2;
                const broadWave = Math.sin((ny + bend) * 17 - time * 0.9 + scrollPhase);
                const crossWave = Math.cos(nx * 10.5 + ny * 4.5 + time * 0.38 - scrollPhase * 0.35);
                const texture = Math.sin(nx * 27 - ny * 19 + time * 0.22 + scrollPhase * 0.2) * 0.16;
                let value = broadWave * 0.58 + crossWave * 0.28 + texture;

                if (pointer.active) {
                    const distance = Math.hypot(x - pointer.x, y - pointer.y);
                    value += Math.sin(distance * 0.055 - time * 3.2) * Math.exp(-distance / 180) * 0.72;
                }

                const normalized = Math.min(Math.max((value + 1.05) / 2.1, 0), 1);
                const glyph = glyphs[Math.min(Math.floor(normalized * glyphs.length), glyphs.length - 1)];
                if (glyph === " ") continue;

                const edgeFade = Math.min(x / 130, (width - x) / 130, 1);
                const heroShape = smoothstep(0.3, 0.92, ny) * (1 - smoothstep(0.45, 0.92, nx));
                const aboutShape = 0.08 + smoothstep(0.56, 0.94, nx) * 0.92;
                const placement = Math.min(heroAmount * heroShape + aboutAmount * aboutShape, 1);
                const blueSplash = Math.max(0, Math.sin(nx * 8.5 - time * 0.34 + ny * 2.2) * 0.5 + Math.sin(ny * 11 + time * 0.25) * 0.3 - 0.12);
                const mix = Math.min(blueSplash * 3.2 + (pointer.active ? Math.exp(-Math.hypot(x - pointer.x, y - pointer.y) / 150) * 0.7 : 0), 1);
                const dark = document.documentElement.dataset.theme === "dark";
                const red = Math.round((dark ? 122 : 91) - mix * (dark ? 62 : 54));
                const green = Math.round((dark ? 142 : 101) + mix * (dark ? 78 : 75));
                const blue = Math.round((dark ? 168 : 111) + mix * (dark ? 87 : 136));
                ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${edgeFade * placement * (0.11 + normalized * 0.34)})`;
                ctx.fillText(glyph, x, y);
            }
        }
    }

    function animateAscii(now) {
        if (now - lastFrame >= 30) {
            drawAscii(now * 0.001);
            lastFrame = now;
        }
        if (visible && !reduceMotion) frame = requestAnimationFrame(animateAscii);
    }

    const asciiObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(animateAscii);
        } else {
            cancelAnimationFrame(frame);
        }
    });

    resizeAscii();
    drawAscii();
    window.addEventListener("resize", () => {
        resizeAscii();
        drawAscii();
    });
    introFlow.addEventListener("pointermove", (event) => {
        const rect = introAscii.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        pointer.active = true;
    });
    introFlow.addEventListener("pointerleave", () => {
        pointer.active = false;
    });
    asciiObserver.observe(introFlow);
    window.dispatchEvent(new Event("resize"));
}
