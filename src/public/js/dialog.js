// Shared popup dialog — drop-in replacement for the native alert()/confirm()/
// prompt() browser boxes (the "localhost says..." popups) used site-wide.
// Loaded on every page via layout.pug, so window.Dialog is always available.
(function () {
	if (window.Dialog) return;

	let overlay, box, titleEl, closeBtn, bodyEl, actionsEl;
	let activeResolve = null;
	let cancelValue;

	function ensureDom() {
		if (overlay) return;
		overlay = document.createElement("div");
		overlay.className = "gd-dialog-overlay";
		overlay.innerHTML =
			"<div class=\"gd-dialog-box\" role=\"dialog\" aria-modal=\"true\">" +
			"<div class=\"gd-dialog-header\">" +
			"<h3 class=\"gd-dialog-title\"></h3>" +
			"<button type=\"button\" class=\"gd-dialog-close\" aria-label=\"Close\"><i class='bx bx-x'></i></button>" +
			"</div>" +
			"<div class=\"gd-dialog-body\"></div>" +
			"<div class=\"gd-dialog-actions\"></div>" +
			"</div>";
		document.body.appendChild(overlay);

		box = overlay.querySelector(".gd-dialog-box");
		titleEl = overlay.querySelector(".gd-dialog-title");
		closeBtn = overlay.querySelector(".gd-dialog-close");
		bodyEl = overlay.querySelector(".gd-dialog-body");
		actionsEl = overlay.querySelector(".gd-dialog-actions");

		closeBtn.addEventListener("click", () => close(cancelValue));
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) close(cancelValue);
		});
		document.addEventListener("keydown", (e) => {
			if (!overlay.classList.contains("active")) return;
			if (e.key === "Escape") close(cancelValue);
		});
	}

	function escapeHtml(value) {
		const div = document.createElement("div");
		div.textContent = value == null ? "" : String(value);
		return div.innerHTML;
	}

	function textToHtml(message) {
		return `<p class="gd-dialog-text">${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;
	}

	function close(result) {
		if (!overlay || !overlay.classList.contains("active")) return;
		overlay.classList.remove("active");
		document.body.style.overflow = "";
		const resolve = activeResolve;
		activeResolve = null;
		if (resolve) resolve(result);
	}

	// Low-level primitive — build any dialog from a title, an HTML body, and a
	// list of buttons ({ label, icon, className, value }). Resolves with the
	// value of whichever button was clicked (or `fallback` on close/escape/backdrop).
	function open({ title, bodyHtml, buttons, fallback }) {
		ensureDom();
		// Closing an already-open dialog abandons its promise at its own
		// cancel value rather than leaving it dangling.
		if (overlay.classList.contains("active")) close(cancelValue);

		return new Promise((resolve) => {
			activeResolve = resolve;
			cancelValue = fallback;
			titleEl.textContent = title;
			bodyEl.innerHTML = bodyHtml;
			actionsEl.innerHTML = "";

			buttons.forEach((def, index) => {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = `gd-dialog-btn ${def.className || "gd-dialog-btn-cancel"}`;
				btn.innerHTML = `${def.icon ? `<i class='bx ${def.icon}'></i>` : ""}<span>${escapeHtml(def.label)}</span>`;
				btn.addEventListener("click", () => close(def.value));
				actionsEl.appendChild(btn);
				if (index === buttons.length - 1) btn.dataset.gdDefault = "true";
			});

			overlay.classList.add("active");
			document.body.style.overflow = "hidden";

			const input = bodyEl.querySelector("input, textarea");
			if (input) {
				input.focus();
				input.select?.();
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter" && input.tagName !== "TEXTAREA") {
						actionsEl.querySelector("[data-gd-default]")?.click();
					}
				});
			}
		});
	}

	// Drop-in for alert(message). Resolves once dismissed.
	function dialogAlert(message, opts = {}) {
		const { title = "Notice", okLabel = "OK", danger = false, html } = opts;
		return open({
			title,
			bodyHtml: html || textToHtml(message),
			buttons: [
				{
					label: okLabel,
					icon: "bx-check",
					className: danger ? "gd-dialog-btn-danger" : "gd-dialog-btn-primary",
					value: undefined,
				},
			],
			fallback: undefined,
		});
	}

	// Drop-in for confirm(message). Resolves true/false.
	function dialogConfirm(message, opts = {}) {
		const {
			title = "Please confirm",
			okLabel = "OK",
			cancelLabel = "Cancel",
			danger = false,
			html,
		} = opts;
		return open({
			title,
			bodyHtml: html || textToHtml(message),
			buttons: [
				{ label: cancelLabel, icon: "bx-x", className: "gd-dialog-btn-cancel", value: false },
				{
					label: okLabel,
					icon: danger ? "bx-trash" : "bx-check",
					className: danger ? "gd-dialog-btn-danger" : "gd-dialog-btn-primary",
					value: true,
				},
			],
			fallback: false,
		});
	}

	// Drop-in for prompt(message, defaultValue). Resolves the entered string,
	// or null if cancelled — same contract as window.prompt.
	function dialogPrompt(message, defaultValue = "", opts = {}) {
		const {
			title = "Please enter a value",
			okLabel = "OK",
			cancelLabel = "Cancel",
			inputType = "text",
			placeholder = "",
		} = opts;
		const inputId = "gd-dialog-prompt-input";
		const bodyHtml =
			textToHtml(message) +
			`<input type="${escapeHtml(inputType)}" id="${inputId}" class="gd-dialog-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" />`;

		const OK_SENTINEL = "__gd_ok__";
		return open({
			title,
			bodyHtml,
			buttons: [
				{ label: cancelLabel, icon: "bx-x", className: "gd-dialog-btn-cancel", value: null },
				{ label: okLabel, icon: "bx-check", className: "gd-dialog-btn-primary", value: OK_SENTINEL },
			],
			fallback: null,
		}).then((result) => {
			if (result !== OK_SENTINEL) return null;
			const input = document.getElementById(inputId);
			return input ? input.value : null;
		});
	}

	window.Dialog = {
		alert: dialogAlert,
		confirm: dialogConfirm,
		prompt: dialogPrompt,
		show: open,
		escapeHtml,
	};
})();
