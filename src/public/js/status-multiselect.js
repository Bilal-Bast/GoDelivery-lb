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

		// Optional search box (data-searchable / config.searchable). It only hides
		// non-matching options, so selections stay checked while filtering.
		const searchable = Boolean(config.searchable) || root.hasAttribute("data-searchable");
		let searchInput = null;
		let noMatches = null;
		function applySearch() {
			if (!searchInput) return;
			const query = searchInput.value.trim().toLocaleLowerCase();
			let visible = 0;
			options.forEach((option) => {
				const label = option.closest(".status-multiselect-option");
				const match = !query || (option.dataset.label || option.value).toLocaleLowerCase().includes(query);
				if (label) label.hidden = !match;
				if (match) visible += 1;
			});
			if (noMatches) noMatches.hidden = visible > 0;
		}
		if (searchable) {
			const header = panel.querySelector(".status-multiselect-panel-header");
			searchInput = document.createElement("input");
			searchInput.type = "search";
			searchInput.className = "status-multiselect-search";
			searchInput.placeholder = window.__t ? window.__t("Search…") : "Search…";
			searchInput.autocomplete = "off";
			searchInput.maxLength = 120;
			searchInput.setAttribute("aria-label", searchInput.placeholder);
			searchInput.addEventListener("input", applySearch);
			searchInput.addEventListener("keydown", (event) => {
				if (event.key === "Enter") event.preventDefault();
			});
			header?.after(searchInput);
			noMatches = document.createElement("div");
			noMatches.className = "status-multiselect-empty";
			noMatches.textContent = window.__t ? window.__t("No matches") : "No matches";
			noMatches.hidden = true;
			root.querySelector(".status-multiselect-options")?.after(noMatches);
		}

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
			if (searchInput) {
				if (open) searchInput.focus();
				else if (searchInput.value) {
					searchInput.value = "";
					applySearch();
				}
			}
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
			applySearch();
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
