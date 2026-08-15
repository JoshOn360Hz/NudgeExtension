(() => {
class NudgeReminderSheet {
  constructor(payload) {
    this.payload = payload;
    this.moodScore = undefined;
    this.responded = false;
    this.interval = undefined;
    this.host = document.createElement("div");
    this.host.id = "nudge-reminder-host";
    this.host.style.position = "fixed";
    this.host.style.zIndex = "2147483647";
    this.host.style.right = "20px";
    this.host.style.bottom = "20px";
    this.host.style.width = "min(390px, calc(100vw - 32px))";
    this.host.style.maxWidth = "calc(100vw - 32px)";
    this.shadow = this.host.attachShadow({ mode: "closed" });
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  mount() {
    const existing = document.getElementById("nudge-reminder-host");
    if (existing) existing.remove();
    this.shadow.append(this.createStyles(), this.createSheet());
    document.documentElement.append(this.host);
    document.addEventListener("keydown", this.handleKeyDown, true);
    this.host.animate(
      [
        { opacity: 0, transform: "translateY(24px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    this.shadow.querySelector("[data-close]")?.focus();
  }

  createStyles() {
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .sheet {
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #27232d;
        background: rgba(255,255,255,.98);
        border: 1px solid #e5dfea;
        border-radius: 20px;
        box-shadow: 0 18px 55px rgba(35,27,46,.2);
        padding: 20px;
      }
      .top { display: flex; align-items: flex-start; gap: 14px; }
      .mark {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        border-radius: 12px;
        background: #eee9fb;
        color: #67569b;
        display: grid;
        place-items: center;
        font-size: 20px;
        font-weight: 750;
      }
      .copy { min-width: 0; flex: 1; }
      h2 { margin: 0 0 6px; font-size: 17px; line-height: 1.3; font-weight: 720; }
      p { margin: 0; color: #6e6877; font-size: 14px; line-height: 1.5; }
      .close {
        border: 0;
        background: transparent;
        color: #6e6877;
        min-width: 44px;
        min-height: 44px;
        margin: -10px -10px 0 0;
        border-radius: 12px;
        cursor: pointer;
        font: inherit;
      }
      .close:hover, .close:focus-visible { background: #f5f2f7; outline: 2px solid #9f8bd7; outline-offset: 1px; }
      .question { margin: 18px 0 10px; color: #3b3542; font-size: 13px; font-weight: 680; }
      .moods { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; }
      .mood {
        border: 1px solid #ded7e4;
        background: #fff;
        color: #4f4858;
        min-height: 42px;
        border-radius: 11px;
        cursor: pointer;
        font: 650 13px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .mood:hover, .mood:focus-visible, .mood.selected { border-color: #8c78c4; background: #eee9fb; outline: none; }
      .mood-label { min-height: 19px; margin-top: 7px; color: #6e6877; font-size: 12px; text-align: center; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px; }
      button.action {
        border: 1px solid #ded7e4;
        border-radius: 12px;
        min-height: 44px;
        padding: 9px 12px;
        background: #fff;
        color: #403848;
        cursor: pointer;
        font: 650 13px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button.action:hover, button.action:focus-visible { border-color: #8c78c4; outline: 2px solid #cfc3ec; outline-offset: 1px; }
      button.primary { background: #7563aa; border-color: #7563aa; color: #fff; }
      button.tertiary { grid-column: 1 / -1; border-color: transparent; background: transparent; color: #6e6877; min-height: 34px; }
      .timer { padding: 18px 0 8px; text-align: center; }
      .timer-value { font-variant-numeric: tabular-nums; font-size: 36px; font-weight: 720; letter-spacing: -.03em; }
      .timer-label { color: #6e6877; font-size: 13px; margin-top: 5px; }
      @media (prefers-color-scheme: dark) {
        .sheet { color: #f2eef5; background: rgba(33,30,39,.98); border-color: #41394a; box-shadow: 0 18px 55px rgba(0,0,0,.45); }
        .mark { background: #302a43; color: #c7b8ef; }
        p, .close, .mood-label, .timer-label { color: #b7afbd; }
        .question { color: #e0d9e5; }
        .close:hover, .close:focus-visible { background: #2b2731; }
        .mood, button.action { background: #28242e; border-color: #494151; color: #e8e1ec; }
        .mood:hover, .mood:focus-visible, .mood.selected { border-color: #b8a8e6; background: #302a43; }
        button.primary { background: #9c88d1; border-color: #9c88d1; color: #18151c; }
        button.tertiary { background: transparent; color: #b7afbd; }
      }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    `;
    return style;
  }

  element(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  createButton(text, className, action) {
    const button = this.element("button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  createSheet() {
    const sheet = this.element("section", "sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "false");
    sheet.setAttribute("aria-labelledby", "nudge-reminder-title");
    const top = this.element("div", "top");
    const mark = this.element("div", "mark", "D");
    mark.setAttribute("aria-hidden", "true");
    const copy = this.element("div", "copy");
    const heading = this.element("h2", "", this.payload.title);
    heading.id = "nudge-reminder-title";
    const body = this.element("p", "", this.payload.message);
    copy.append(heading, body);
    const close = this.createButton("Close", "close", () => this.dismiss());
    close.dataset.close = "true";
    close.setAttribute("aria-label", "Dismiss reminder");
    top.append(mark, copy, close);
    sheet.append(top, this.createReflection(), this.createActions());
    return sheet;
  }

  createReflection() {
    const container = this.element("div", "reflection");
    container.append(this.element("div", "question", "How are you feeling right now?"));
    const moods = this.element("div", "moods");
    const moodLabel = this.element("div", "mood-label", "Select a feeling or skip this reflection");
    moodLabel.setAttribute("aria-live", "polite");
    const labels = ["Very low", "Low", "Neutral", "Good", "Great"];
    labels.forEach((label, index) => {
      const score = index + 1;
      const button = this.createButton(String(score), "mood", () => {
        this.moodScore = score;
        moods.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        moodLabel.textContent = label;
      });
      button.setAttribute("aria-label", label);
      moods.append(button);
    });
    container.append(moods, moodLabel);
    return container;
  }

  createActions() {
    const actions = this.element("div", "actions");
    const duration = Number.isInteger(this.payload.breakDurationMinutes) ? this.payload.breakDurationMinutes : 5;
    actions.append(
      this.createButton(`Take a ${duration} ${duration === 1 ? "minute" : "minutes"} break`, "action primary", () => this.startBreak()),
      this.createButton("Remind me in 10 minutes", "action", () => this.finish("snooze")),
      this.createButton("Keep browsing", "action tertiary", () => this.finish("continue"))
    );
    return actions;
  }

  async sendResponse(response) {
    if (this.responded) return;
    this.responded = true;
    await chrome.runtime.sendMessage({
      type: "REMINDER_RESPONSE",
      reminderId: this.payload.reminderId,
      response,
      moodScore: this.moodScore
    });
  }

  async startBreak() {
    await this.sendResponse("break");
    this.shadow.querySelector(".sheet").replaceChildren(this.createTimer());
  }

  createTimer() {
    const timer = this.element("div", "timer");
    const heading = this.element("h2", "", "Your break has started");
    const duration = Number.isInteger(this.payload.breakDurationMinutes) ? this.payload.breakDurationMinutes : 5;
    const value = this.element("div", "timer-value", `${duration}:00`);
    const label = this.element("div", "timer-label", "The website remains available whenever you are ready");
    const close = this.createButton("End break", "action", () => this.remove());
    close.style.marginTop = "18px";
    let remaining = duration * 60;
    this.interval = window.setInterval(() => {
      remaining -= 1;
      const minutes = Math.floor(remaining / 60);
      const seconds = String(remaining % 60).padStart(2, "0");
      value.textContent = `${minutes}:${seconds}`;
      if (remaining <= 0) {
        clearInterval(this.interval);
        heading.textContent = "Break complete";
        label.textContent = "Take a moment before choosing what comes next";
      }
    }, 1000);
    timer.append(heading, value, label, close);
    return timer;
  }

  async finish(response) {
    await this.sendResponse(response);
    this.remove();
  }

  async dismiss() {
    if (!this.responded) await this.sendResponse("dismissed");
    this.remove();
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      void this.dismiss();
    }
  }

  remove() {
    if (this.interval) clearInterval(this.interval);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    this.host.remove();
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.type === "SHOW_REMINDER" && request.payload) {
    new NudgeReminderSheet(request.payload).mount();
    sendResponse({ shown: true });
  }
});
})();
