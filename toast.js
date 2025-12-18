(function (global) {
  const defaults = {
    duration: 3000,
    position: "top-center",
    animation: "slide", // slide | fade | scale | bounce
    maxVisible: Infinity,
    border: false,
    showDismiss: false,
    showProgress: false,
    fill: false,
    theme: "light", // system | light | dark
    direction: "ltr", // rtl | ltr
    progressPosition: "auto", // auto | start | end
    type: "info",
    icons: {},
    colors: {},
    class: "",
  };

  const icons = {
    success: `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>`,

    error: `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>`,

    info: `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>`,

    warning: `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3l9 16H3l9-16z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>`,

    loading: `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round"
       class="toast-spinner">
    <circle cx="12" cy="12" r="10" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>`,
  };

  const colors = {
    success: "#16a34a",
    error: "#dc2626",
    info: "#2563eb",
    warning: "#ca8a04",
    loading: "#6b7280",
  };

  const animations = {
    slide: ["animate-slide-in", "animate-slide-out"],
    fade: ["animate-fade-in", "animate-fade-out"],
    scale: ["animate-scale-in", "animate-scale-out"],
    bounce: ["animate-bounce-in", "animate-bounce-out"],
  };

  const containers = {};
  const queues = {};

  function getContainer(pos) {
    if (containers[pos]) return containers[pos];
    const div = document.createElement("div");
    div.className = "toast-container";
    div.dataset.pos = pos;
    document.body.appendChild(div);
    containers[pos] = div;
    queues[pos] = [];
    return div;
  }

  function resolveTheme(theme) {
    if (theme !== "system") return theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function createToast(message, cfg) {
    const type = cfg.type;
    const color = cfg.colors[type] || colors[type];
    const icon = cfg.icons[type] || icons[type];
    const [animIn] = animations[cfg.animation];

    const theme = resolveTheme(cfg.theme);
    const dir = cfg.direction;
    const progressSide =
      cfg.progressPosition === "auto"
        ? dir === "rtl"
          ? "right"
          : "left"
        : cfg.progressPosition === "start"
        ? dir === "rtl"
          ? "right"
          : "left"
        : dir === "rtl"
        ? "left"
        : "right";

    const el = document.createElement("div");
    el.className = `
      toast
      toast-${type}
      toast-${theme}
      toast-${dir}
      ${cfg.fill ? "toast-fill" : "toast-outline"}
      ${animIn}
      ${cfg.class}
    `;
    el.style.setProperty("--toast-accent", color);
    if (cfg.border) el.style.borderInlineStart = `5px solid ${color}`;
    el.dir = dir;

    el.innerHTML = `
      <div class="icon">${icon}</div>
      <div class="msg">${message}</div>
      ${cfg.showDismiss ? `<button class="close">&times;</button>` : ""}
      ${
        cfg.showProgress
          ? `<div class="progress progress-${progressSide}">
               <div class="bar"></div>
             </div>`
          : ""
      }
    `;
    return el;
  }

  function show(message, opts = {}) {
    const cfg = { ...defaults, ...opts };
    const pos = cfg.position;
    const container = getContainer(pos);
    const queue = queues[pos];

    queue.push({ message, cfg });
    processQueue(pos);
  }

  function processQueue(pos) {
    const container = containers[pos];
    const queue = queues[pos];
    if (!container || !queue.length) return;
    if (container.children.length >= defaults.maxVisible) return;

    const { message, cfg } = queue.shift();
    const toast = createToast(message, cfg);
    const [animIn, animOut] = animations[cfg.animation];

    container.appendChild(toast);
    const bar = toast.querySelector(".bar");
    let start,
      remaining = cfg.duration;

    function close() {
      toast.classList.remove(animIn);
      toast.classList.add(animOut);

      const animDuration = 250;

      setTimeout(() => {
        const h = toast.offsetHeight;
        const siblings = Array.from(container.children).filter(
          (t) => t !== toast
        );
        const index = Array.from(container.children).indexOf(toast);
        siblings.forEach((sibling, i) => {
          if (i > index) {
            sibling.style.transition = `transform ${animDuration}ms ease`;
            if (cfg.animation !== "fade") {
              sibling.style.transform = `translateY(-${h + 8}px)`;
            }
          }
        });

        toast.style.transition = `all ${animDuration}ms ease`;
        toast.style.maxHeight = h + "px";
        toast.style.overflow = "hidden";

        requestAnimationFrame(() => {
          toast.style.maxHeight = "0";
          toast.style.margin = "0";
          toast.style.padding = "0";
          toast.style.transition = `all ${animDuration}ms ease`;
        });

        toast.addEventListener(
          "transitionend",
          (e) => {
            toast.remove();
            processQueue(pos);
          },
          { once: true }
        );
      }, animDuration);
    }

    function startTimer() {
      start = Date.now();
      if (bar) {
        bar.style.transition = `width ${remaining}ms linear`;
        requestAnimationFrame(() => (bar.style.width = "0%"));
      }
      toast._timer = setTimeout(close, remaining);
    }

    function pauseTimer() {
      clearTimeout(toast._timer);
      remaining -= Date.now() - start;
      if (bar) {
        const percent = (remaining / cfg.duration) * 100;
        bar.style.transition = "none";
        bar.style.width = percent + "%";
      }
    }

    toast.addEventListener("mouseenter", pauseTimer);
    toast.addEventListener("mouseleave", startTimer);
    toast.querySelector(".close")?.addEventListener("click", close);

    startTimer();
  }

  global.toast = {
    config: (opts) => Object.assign(defaults, opts),
    show,
    success: (msg, opts = {}) => show(msg, { ...opts, type: "success" }),
    error: (msg, opts = {}) => show(msg, { ...opts, type: "error" }),
    info: (msg, opts = {}) => show(msg, { ...opts, type: "info" }),
    warning: (msg, opts = {}) => show(msg, { ...opts, type: "warning" }),
    loading: (msg, opts = {}) => show(msg, { ...opts, type: "loading" }),
  };
})(window);
