(() => {
	window.createStatusMultiSelect = (rootId, config = {}) => {
		const root = document.getElementById(rootId);
		if (!root) return { getSelected: () => [], setSelected: () => {}, clear: () => {} };

		const trigger = root.querySelector(".status-multiselect-trigger");
		const triggerLabel = root.querySelector(".status-multiselect-value");
		const panel = root.querySelector(".status-multiselect-panel");
		let options = [...root.querySelectorAll('input[type="checkbox"]')];
		const clearButton = root.querySelector(".status-multiselect-clear");
		const allLabel = config.allLabel || root.dataset.allLabel || "All statuses";
		const singularLabel = config.singularLabel || "item";
		const pluralLabel = config.pluralLabel || "items";
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
				triggerLabel.textContent = options.find((option) => option.value === selected[0])?.dataset.label || `1 ${singularLabel} selected`;
				return;
			}
			triggerLabel.textContent = `${selected.length} ${pluralLabel} selected`;
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

		function setOptions(items = []) {
			const selected = new Set(getSelected());
			const container = root.querySelector(".status-multiselect-options");
			container.replaceChildren();
			items.forEach(({ value, label }) => {
				const optionLabel = document.createElement("label");
				optionLabel.className = "status-multiselect-option";
				const input = document.createElement("input");
				input.type = "checkbox";
				input.value = String(value);
				input.dataset.label = String(label);
				input.checked = selected.has(input.value);
				input.addEventListener("change", () => {
					updateLabel();
					notifyChange();
				});
				const text = document.createElement("span");
				text.textContent = label;
				optionLabel.append(input, text);
				container.appendChild(optionLabel);
			});
			options = [...container.querySelectorAll('input[type="checkbox"]')];
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
		return { getSelected, setSelected, setOptions, clear, close: () => setOpen(false) };
	};
})();
