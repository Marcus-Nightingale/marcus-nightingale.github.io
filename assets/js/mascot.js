(() => {
    const mascot = document.getElementById("mascot");
    const frame = document.getElementById("mascot-frame");

    const DIRECTIONS = ["up-left", "up", "up-right", "left", "center", "right", "down-left", "down", "down-right"];
    const DEAD_X = 90;
    const DEAD_Y = 60;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let sector = -1;
    let pointer = null;
    let reactionTimer = null;
    const debugState = { enabled: false, angle: 0, dist: 0 };

    const REACTION_COUNT = 9;
    const REACTION_DURATION = 520;
    const SPARK_COLORS = ["#73e7ff", "#4ddcff", "#2f8cff", "#1768ff"];
    const REACTION_POSITIONS = [
        [2.4, 3.2],
        [50, 3.2],
        [97.6, 3.2],
        [2.4, 49.3],
        [50, 49.3],
        [97.6, 49.3],
        [2.4, 95.3],
        [50, 95.3],
        [97.6, 95.3],
    ];

    function cell(index) {
        const x = (index % 3) * 50;
        const y = Math.floor(index / 3) * 50;
        frame.style.backgroundPosition = `${x}% ${y}%`;
    }

    function wrap(angle) {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    function aim() {
        if (!pointer || mascot.classList.contains("reacting")) return;
        const box = mascot.getBoundingClientRect();
        const dx = pointer.x - (box.left + box.width / 2);
        const dy = pointer.y - (box.top + box.height / 2);
        debugState.angle = Math.atan2(dy, dx);
        debugState.dist = Math.hypot(dx, dy);

        const x = dx > DEAD_X ? "right" : dx < -DEAD_X ? "left" : "";
        const y = dy > DEAD_Y ? "down" : dy < -DEAD_Y ? "up" : "";
        const dir = y + (y && x ? "-" : "") + x || "center";
        const index = DIRECTIONS.indexOf(dir);

        if (index === sector) return;
        sector = index;
        cell(index);
    }

    function burst() {
        const box = mascot.getBoundingClientRect();
        const distance = Math.max(38, box.width * 0.68);

        for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.25;
            const spark = document.createElement("span");
            const travel = distance * (0.75 + Math.random() * 0.35);
            spark.className = "boop-spark";
            spark.style.setProperty("--spark-x", `${Math.cos(angle) * travel}px`);
            spark.style.setProperty("--spark-y", `${Math.sin(angle) * travel}px`);
            spark.style.setProperty("--spark-color", SPARK_COLORS[i % SPARK_COLORS.length]);
            mascot.appendChild(spark);
            spark.addEventListener("animationend", () => spark.remove(), { once: true });
        }
    }

    function showReaction(index) {
        mascot.classList.add("reacting");
        const [x, y] = REACTION_POSITIONS[index];
        frame.style.backgroundPosition = `${x}% ${y}%`;
        window.clearTimeout(reactionTimer);
        reactionTimer = window.setTimeout(() => {
            mascot.classList.remove("reacting");
            sector = DIRECTIONS.indexOf("center");
            if (pointer) aim();
            else cell(DIRECTIONS.indexOf("center"));
        }, REACTION_DURATION);
    }

    function boop() {
        const reaction = Math.floor(Math.random() * REACTION_COUNT);
        showReaction(reaction);
        if (window.UISound) window.UISound.play("reaction");

        if (reduceMotion) return;
        mascot.classList.remove("squash");
        mascot.classList.remove("boop-ring");
        void mascot.offsetWidth;
        mascot.classList.add("squash");
        mascot.classList.add("boop-ring");
        burst();
    }

    if (finePointer && !reduceMotion) {
        window.addEventListener(
            "pointermove",
            (e) => {
                pointer = { x: e.clientX, y: e.clientY };
                aim();
            },
            { passive: true },
        );
        window.addEventListener("scroll", aim, { passive: true });
    }

    cell(DIRECTIONS.indexOf("center"));
    mascot.addEventListener("click", boop);

    const slot = document.getElementById("mascot-slot");
    const DOCK_DISTANCE = () => window.innerHeight * 0.6;
    const SIZE_FROM = 160;
    const SIZE_TO = 56;
    let slotCenter = window.innerHeight * 0.5;

    function measureSlot() {
        if (!slot) return;
        const box = slot.getBoundingClientRect();
        slotCenter = box.top + box.height / 2 + window.scrollY;
    }

    const TOP_FROM = () => slotCenter;
    const TOP_TO = 40;

    function dockedLeft(size) {
        return 24 + size / 2;
    }

    let target = 0;
    let current = 0;
    let ticking = false;

    function smoothstep(p) {
        return p * p * (3 - 2 * p);
    }

    function render() {
        ticking = false;
        current += (target - current) * 0.12;
        if (Math.abs(target - current) < 0.0005) current = target;

        const eased = smoothstep(Math.min(Math.max(current, 0), 1));
        const size = SIZE_FROM + (SIZE_TO - SIZE_FROM) * eased;
        const startTop = slotCenter - window.scrollY;
        const top = startTop + (TOP_TO - startTop) * eased;
        const startLeft = window.innerWidth / 2;
        const left = startLeft + (dockedLeft(size) - startLeft) * eased;

        mascot.style.width = `${size}px`;
        mascot.style.height = `${size}px`;
        mascot.style.top = `${top}px`;
        mascot.style.left = `${left}px`;

        if (current !== target) {
            ticking = true;
            requestAnimationFrame(render);
        }
    }

    function dock() {
        target = Math.min(Math.max(window.scrollY / DOCK_DISTANCE(), 0), 1);
        if (reduceMotion) {
            current = target;
            const size = SIZE_FROM + (SIZE_TO - SIZE_FROM) * target;
            const startTop = slotCenter - window.scrollY;
            const top = startTop + (TOP_TO - startTop) * target;
            const startLeft = window.innerWidth / 2;
            const left = startLeft + (dockedLeft(size) - startLeft) * target;
            mascot.style.width = `${size}px`;
            mascot.style.height = `${size}px`;
            mascot.style.top = `${top}px`;
            mascot.style.left = `${left}px`;
            return;
        }
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(render);
        }
        aim();
    }

    window.addEventListener("scroll", dock, { passive: true });
    window.addEventListener(
        "resize",
        () => {
            measureSlot();
            dock();
        },
        { passive: true },
    );
    measureSlot();
    dock();
    requestAnimationFrame(() => {
        measureSlot();
        dock();
    });

    // --- Debug overlay (?mascot-debug or press "d") ---
    window.__mascotDebug = {
        debugState,
        get sector() {
            return sector;
        },
        get pointer() {
            return pointer;
        },
    };

    let debugCanvas = null;
    let debugLabel = null;

    function ensureDebugDom() {
        if (debugCanvas) return;
        debugCanvas = document.createElement("canvas");
        debugCanvas.id = "mascot-debug";
        debugCanvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60;";
        document.body.appendChild(debugCanvas);
        debugLabel = document.createElement("div");
        debugLabel.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:61;font:12px/1.5 monospace;background:rgba(0,0,0,0.75);color:#7df9ff;padding:8px 10px;border-radius:8px;pointer-events:none;white-space:pre;";
        document.body.appendChild(debugLabel);
    }

    function drawDebug() {
        if (!debugState.enabled || !debugCanvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        debugCanvas.width = Math.floor(window.innerWidth * dpr);
        debugCanvas.height = Math.floor(window.innerHeight * dpr);
        const ctx = debugCanvas.getContext("2d");
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const box = mascot.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;

        for (let i = 0; i < DIRECTIONS.length; i++) {
            const col = (i % 3) - 1;
            const row = Math.floor(i / 3) - 1;
            const x0 = cx + (col === -1 ? -220 : col === 0 ? -DEAD_X : DEAD_X);
            const x1 = cx + (col === -1 ? -DEAD_X : col === 0 ? DEAD_X : 220);
            const y0 = cy + (row === -1 ? -220 : row === 0 ? -DEAD_Y : DEAD_Y);
            const y1 = cy + (row === -1 ? -DEAD_Y : row === 0 ? DEAD_Y : 220);
            ctx.fillStyle = sector === i ? "rgba(77,220,255,0.22)" : "rgba(77,220,255,0.05)";
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.strokeStyle = "rgba(77,220,255,0.35)";
            ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            ctx.fillStyle = "#0aa2c0";
            ctx.font = "10px monospace";
            ctx.fillText(DIRECTIONS[i], (x0 + x1) / 2 - 20, (y0 + y1) / 2 + 3);
        }

        ctx.fillStyle = "#ff5d5d";
        ctx.fillText(`dead-zone x±${DEAD_X} y±${DEAD_Y}`, cx - DEAD_X, cy - DEAD_Y - 6);

        if (pointer) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = "#7df9ff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        const dir = DIRECTIONS[sector] || "center";
        debugLabel.textContent = `dir: ${dir} (cell ${sector})\nangle: ${debugState.angle.toFixed(2)} rad  dist: ${Math.round(debugState.dist)}px`;
        requestAnimationFrame(drawDebug);
    }

    function setDebug(on) {
        debugState.enabled = on;
        if (on) {
            ensureDebugDom();
            debugCanvas.style.display = "block";
            debugLabel.style.display = "block";
            requestAnimationFrame(drawDebug);
        } else if (debugCanvas) {
            debugCanvas.style.display = "none";
            debugLabel.style.display = "none";
        }
    }

    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey && !e.altKey) setDebug(!debugState.enabled);
    });
    if (new URLSearchParams(window.location.search).has("mascot-debug")) setDebug(true);
})();
