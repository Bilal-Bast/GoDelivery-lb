(() => {
	window.createStatusMultiSelect = (rootId) => {
		const root = document.getElementById(rootId);
		if (!root) return { getSelected: () => [], setSelected: () => {}, clear: () => {} };

		const trigger = root.querySelector(".status-multiselect-trigger");
		const triggerLabel = root.querySelector(".status-multiselect-value");
		const panel = root.querySelector(".status-multiselect-panel");
		const options = [...root.querySelectorAll('input[type="checkbox"]')];
		const clearButton = root.querySelector(".status-multiselect-clear");
		const allLabel = root.dataset.allLabel || "All statuses";
		if (!panel.id) panel.id = `${rootId}Panel`;
		trigger.setAttribute("aria-controls", panel.id);

		function getSelected() {
			return options.filter((option) => option.checked).map((option) => option.value);
		}

		function updateLabel() {
			const selected = getSelected();
			if (!selected.length) {
				triggerLabel.textContent = allLabel;
				return;
			}
			if (selected.length === 1) {
				triggerLabel.textContent = options.find((option) => option.value === selected[0])?.dataset.label || "1 status selected";
				return;
			}
			triggerLabel.textContent = `${selected.length} statuses selected`;
		}

		function notifyChange() {
			root.dispatchEvent(new Event("statusmultiselectchange", { bubbles: true }));
		}

		function setOpen(open) {
			panel.hidden = !open;
			trigger.setAttribute("aria-expanded", String(open));
		}

		function setSelected(values = []) {
			const selected = new Set(values.map(String));
			options.forEach((option) => {
				option.checked = selected.has(option.value);
			});
			updateLabel();
		}

		function clear({ notify = true } = {}) {
			setSelected([]);
			if (notify) notifyChange();
		}

		trigger.addEventListener("click", () => setOpen(panel.hidden));
		trigger.addEventListener("keydown", (event) => {
			if (event.key === "Escape") setOpen(false);
		});
		root.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				setOpen(false);
				trigger.focus();
			}
		});
		options.forEach((option) => option.addEventListener("change", () => {
			updateLabel();
			notifyChange();
		}));
		clearButton?.addEventListener("click", () => clear());
		document.addEventListener("pointerdown", (event) => {
			if (!root.contains(event.target)) setOpen(false);
		});

		updateLabel();
		return { getSelected, setSelected, clear, close: () => setOpen(false) };
	};
})();
