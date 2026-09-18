import { createUISFX } from "uisfx";

const KEY = "mnightingale:sound";
const stored = window.localStorage.getItem(KEY);
const initial = stored === null ? true : stored === "on";

const ui = createUISFX({
    pack: "mechanical",
    volume: 0.6,
    enabled: initial,
});

let unlocked = false;

function unlock() {
    if (unlocked) return;
    unlocked = true;
    ui.unlock().catch(() => {});
}

window.addEventListener("pointerdown", unlock, { passive: true });
window.addEventListener("keydown", unlock);

function play(cue) {
    if (!unlocked) return;
    try {
        ui.play(cue);
    } catch {
        // Audio is decorative; never break the page.
    }
}

function isEnabled() {
    return ui.isEnabled();
}

function setEnabled(on) {
    if (!on) ui.stopAll();
    ui.setEnabled(on);
    window.localStorage.setItem(KEY, on ? "on" : "off");
    const toggle = document.getElementById("sound-toggle");
    if (toggle) {
        toggle.setAttribute("aria-pressed", String(on));
        toggle.classList.toggle("is-muted", !on);
    }
}

window.UISound = { play, isEnabled, setEnabled };

const toggle = document.getElementById("sound-toggle");
if (toggle) {
    toggle.setAttribute("aria-pressed", String(initial));
    toggle.classList.toggle("is-muted", !initial);
    toggle.addEventListener("click", () => {
        unlock();
        const next = !ui.isEnabled();
        setEnabled(next);
        play(next ? "toggle-on" : "toggle-off");
    });
}
