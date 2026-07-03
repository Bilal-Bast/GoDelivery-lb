(function () {
	const API = "/api";

	// Auth is cookie-based; no token needed in headers

	/**
	 * Show a feedback message under a form.
	 * @param {string} elementId
	 * @param {string} message
	 * @param {boolean} isError
	 */
	function showMessage(elementId, message, isError = false) {
		const el = document.getElementById(elementId);
		if (!el) return;
		el.textContent = message;
		el.style.display = "block";
		el.style.color = isError
			? "var(--danger-color)"
			: "var(--success-color)";
		setTimeout(() => {
			el.style.display = "none";
		}, 3500);
	}

	/** Disable / re-enable a button while a request is in-flight */
	function setLoading(btn, loading) {
		btn.disabled = loading;
		btn.style.opacity = loading ? "0.6" : "1";
		btn.textContent = loading ? "Saving…" : btn.dataset.label;
	}

	// ─── Modal Helpers ───────────────────────────────────────────────────────────

	function openModal(modal) {
		if (!modal) return;
		modal.classList.remove("hidden");
		requestAnimationFrame(() => modal.classList.add("active"));
	}

	function closeModal(modal) {
		if (!modal) return;
		modal.classList.remove("active");
		modal.addEventListener(
			"transitionend",
			() => {
				modal.classList.add("hidden");
			},
			{ once: true },
		);
	}

	// ─── Country-Dropdown Factory ─────────────────────────────────────────────

	function initCountryDropdown(prefix) {
		const display = document.getElementById(`${prefix}CountryDisplay`);
		const search = document.getElementById(`${prefix}CountrySearch`);
		const dropdown = document.getElementById(`${prefix}CountryDropdown`);
		const codeInput = document.getElementById(`${prefix}CountryCode`);
		const flagSpan = document.getElementById(`${prefix}CountryFlag`);
		const nameSpan = document.getElementById(`${prefix}CountryName`);

		if (!display || !dropdown) return;

		function renderOptions(filter = "") {
			dropdown.innerHTML = "";
			const filtered = countryCodes.filter(
				(c) =>
					c.name.toLowerCase().includes(filter.toLowerCase()) ||
					c.code.includes(filter),
			);
			filtered.forEach((country) => {
				const item = document.createElement("div");
				item.className = "country-option";
				item.innerHTML = `<span style="font-size:20px;">${country.flag}</span> <span>${country.name} (${country.code})</span>`;
				item.addEventListener("click", () => {
					codeInput.value = country.code;
					flagSpan.textContent = country.flag;
					nameSpan.textContent = country.name;
					dropdown.style.display = "none";
					search.style.display = "none";
					display.style.display = "flex";
				});
				dropdown.appendChild(item);
			});
		}

		display.addEventListener("click", () => {
			display.style.display = "none";
			search.style.display = "block";
			search.focus();
			dropdown.style.display = "block";
			renderOptions();
		});

		search.addEventListener("input", (e) => renderOptions(e.target.value));

		document.addEventListener("click", (e) => {
			if (!e.target.closest(".country-selector")) {
				dropdown.style.display = "none";
				search.style.display = "none";
				display.style.display = "flex";
			}
		});
	}

	// ─── Country Codes List ──────────────────────────────────────────────────────

	const countryCodes = [
		{ code: "+93", name: "Afghanistan", flag: "🇦🇫", regex: /^\d{9}$/ },
		{ code: "+355", name: "Albania", flag: "🇦🇱", regex: /^\d{8,9}$/ },
		{ code: "+213", name: "Algeria", flag: "🇩🇿", regex: /^\d{9,10}$/ },
		{ code: "+1", name: "American Samoa", flag: "🇦🇸", regex: /^\d{10}$/ },
		{ code: "+376", name: "Andorra", flag: "🇦🇩", regex: /^\d{6,9}$/ },
		{ code: "+244", name: "Angola", flag: "🇦🇴", regex: /^\d{9}$/ },
		{ code: "+1", name: "Anguilla", flag: "🇦🇮", regex: /^\d{10}$/ },
		{
			code: "+1",
			name: "Antigua & Barbuda",
			flag: "🇦🇬",
			regex: /^\d{10}$/,
		},
		{ code: "+54", name: "Argentina", flag: "🇦🇷", regex: /^\d{10,11}$/ },
		{ code: "+374", name: "Armenia", flag: "🇦🇲", regex: /^\d{8}$/ },
		{ code: "+297", name: "Aruba", flag: "🇦🇼", regex: /^\d{7}$/ },
		{ code: "+61", name: "Australia", flag: "🇦🇺", regex: /^\d{9}$/ },
		{ code: "+43", name: "Austria", flag: "🇦🇹", regex: /^\d{10,13}$/ },
		{ code: "+994", name: "Azerbaijan", flag: "🇦🇿", regex: /^\d{9}$/ },
		{ code: "+1", name: "Bahamas", flag: "🇧🇸", regex: /^\d{10}$/ },
		{ code: "+973", name: "Bahrain", flag: "🇧🇭", regex: /^\d{8}$/ },
		{ code: "+880", name: "Bangladesh", flag: "🇧🇩", regex: /^\d{10,11}$/ },
		{ code: "+1", name: "Barbados", flag: "🇧🇧", regex: /^\d{10}$/ },
		{ code: "+375", name: "Belarus", flag: "🇧🇾", regex: /^\d{9}$/ },
		{ code: "+32", name: "Belgium", flag: "🇧🇪", regex: /^\d{9}$/ },
		{ code: "+501", name: "Belize", flag: "🇧🇿", regex: /^\d{7}$/ },
		{ code: "+229", name: "Benin", flag: "🇧🇯", regex: /^\d{8,10}$/ },
		{ code: "+1", name: "Bermuda", flag: "🇧🇲", regex: /^\d{10}$/ },
		{ code: "+975", name: "Bhutan", flag: "🇧🇹", regex: /^\d{8}$/ },
		{ code: "+591", name: "Bolivia", flag: "🇧🇴", regex: /^\d{9}$/ },
		{
			code: "+387",
			name: "Bosnia & Herzegovina",
			flag: "🇧🇦",
			regex: /^\d{8,9}$/,
		},
		{ code: "+267", name: "Botswana", flag: "🇧🇼", regex: /^\d{8}$/ },
		{ code: "+55", name: "Brazil", flag: "🇧🇷", regex: /^\d{10,11}$/ },
		{
			code: "+1",
			name: "British Virgin Islands",
			flag: "🇻🇬",
			regex: /^\d{10}$/,
		},
		{ code: "+673", name: "Brunei", flag: "🇧🇳", regex: /^\d{7}$/ },
		{ code: "+359", name: "Bulgaria", flag: "🇧🇬", regex: /^\d{8,9}$/ },
		{ code: "+226", name: "Burkina Faso", flag: "🇧🇫", regex: /^\d{8}$/ },
		{ code: "+257", name: "Burundi", flag: "🇧🇮", regex: /^\d{8}$/ },
		{ code: "+855", name: "Cambodia", flag: "🇰🇭", regex: /^\d{8,9}$/ },
		{ code: "+237", name: "Cameroon", flag: "🇨🇲", regex: /^\d{9}$/ },
		{ code: "+1", name: "Canada", flag: "🇨🇦", regex: /^\d{10}$/ },
		{ code: "+238", name: "Cape Verde", flag: "🇨🇻", regex: /^\d{7}$/ },
		{ code: "+1", name: "Cayman Islands", flag: "🇰🇾", regex: /^\d{10}$/ },
		{
			code: "+236",
			name: "Central African Republic",
			flag: "🇨🇫",
			regex: /^\d{8}$/,
		},
		{ code: "+235", name: "Chad", flag: "🇹🇩", regex: /^\d{8}$/ },
		{ code: "+56", name: "Chile", flag: "🇨🇱", regex: /^\d{9}$/ },
		{ code: "+86", name: "China", flag: "🇨🇳", regex: /^\d{11}$/ },
		{ code: "+57", name: "Colombia", flag: "🇨🇴", regex: /^\d{10}$/ },
		{ code: "+269", name: "Comoros", flag: "🇰🇲", regex: /^\d{7}$/ },
		{
			code: "+242",
			name: "Congo - Brazzaville",
			flag: "🇨🇬",
			regex: /^\d{9}$/,
		},
		{
			code: "+243",
			name: "Congo - Kinshasa",
			flag: "🇨🇩",
			regex: /^\d{9}$/,
		},
		{ code: "+682", name: "Cook Islands", flag: "🇨🇰", regex: /^\d{5}$/ },
		{ code: "+506", name: "Costa Rica", flag: "🇨🇷", regex: /^\d{8}$/ },
		{ code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮", regex: /^\d{10}$/ },
		{ code: "+385", name: "Croatia", flag: "🇭🇷", regex: /^\d{9,12}$/ },
		{ code: "+53", name: "Cuba", flag: "🇨🇺", regex: /^\d{8}$/ },
		{ code: "+357", name: "Cyprus", flag: "🇨🇾", regex: /^\d{8}$/ },
		{ code: "+420", name: "Czechia", flag: "🇨🇿", regex: /^\d{9}$/ },
		{ code: "+45", name: "Denmark", flag: "🇩🇰", regex: /^\d{8}$/ },
		{ code: "+253", name: "Djibouti", flag: "🇩🇯", regex: /^\d{8}$/ },
		{ code: "+1", name: "Dominica", flag: "🇩🇲", regex: /^\d{10}$/ },
		{
			code: "+1",
			name: "Dominican Republic",
			flag: "🇩🇴",
			regex: /^\d{10}$/,
		},
		{ code: "+593", name: "Ecuador", flag: "🇪🇨", regex: /^\d{9}$/ },
		{ code: "+20", name: "Egypt", flag: "🇪🇬", regex: /^\d{10,11}$/ },
		{ code: "+503", name: "El Salvador", flag: "🇸🇻", regex: /^\d{8}$/ },
		{
			code: "+240",
			name: "Equatorial Guinea",
			flag: "🇬🇶",
			regex: /^\d{9}$/,
		},
		{ code: "+291", name: "Eritrea", flag: "🇪🇷", regex: /^\d{7}$/ },
		{ code: "+372", name: "Estonia", flag: "🇪🇪", regex: /^\d{7,8}$/ },
		{ code: "+268", name: "Eswatini", flag: "🇸🇿", regex: /^\d{8}$/ },
		{ code: "+251", name: "Ethiopia", flag: "🇪🇹", regex: /^\d{9}$/ },
		{
			code: "+500",
			name: "Falkland Islands",
			flag: "🇫🇰",
			regex: /^\d{5}$/,
		},
		{ code: "+298", name: "Faroe Islands", flag: "🇫🇴", regex: /^\d{6}$/ },
		{ code: "+679", name: "Fiji", flag: "🇫🇯", regex: /^\d{7}$/ },
		{ code: "+358", name: "Finland", flag: "🇫🇮", regex: /^\d{5,12}$/ },
		{ code: "+33", name: "France", flag: "🇫🇷", regex: /^\d{9,10}$/ },
		{ code: "+594", name: "French Guiana", flag: "🇬🇫", regex: /^\d{9}$/ },
		{
			code: "+689",
			name: "French Polynesia",
			flag: "🇵🇫",
			regex: /^\d{8}$/,
		},
		{ code: "+241", name: "Gabon", flag: "🇬🇦", regex: /^\d{8}$/ },
		{ code: "+220", name: "Gambia", flag: "🇬🇲", regex: /^\d{7}$/ },
		{ code: "+995", name: "Georgia", flag: "🇬🇪", regex: /^\d{9}$/ },
		{ code: "+49", name: "Germany", flag: "🇩🇪", regex: /^\d{10,12}$/ },
		{ code: "+233", name: "Ghana", flag: "🇬🇭", regex: /^\d{9,10}$/ },
		{ code: "+350", name: "Gibraltar", flag: "🇬🇮", regex: /^\d{8}$/ },
		{ code: "+30", name: "Greece", flag: "🇬🇷", regex: /^\d{10}$/ },
		{ code: "+299", name: "Greenland", flag: "🇬🇱", regex: /^\d{6}$/ },
		{ code: "+1", name: "Grenada", flag: "🇬🇩", regex: /^\d{10}$/ },
		{ code: "+590", name: "Guadeloupe", flag: "🇬🇵", regex: /^\d{9}$/ },
		{ code: "+1", name: "Guam", flag: "🇬🇺", regex: /^\d{10}$/ },
		{ code: "+502", name: "Guatemala", flag: "🇬🇹", regex: /^\d{8}$/ },
		{ code: "+44", name: "Guernsey", flag: "🇬🇬", regex: /^\d{10}$/ },
		{ code: "+224", name: "Guinea", flag: "🇬🇳", regex: /^\d{9}$/ },
		{ code: "+245", name: "Guinea-Bissau", flag: "🇬🇼", regex: /^\d{7,9}$/ },
		{ code: "+592", name: "Guyana", flag: "🇬🇾", regex: /^\d{7}$/ },
		{ code: "+509", name: "Haiti", flag: "🇭🇹", regex: /^\d{8}$/ },
		{ code: "+504", name: "Honduras", flag: "🇭🇳", regex: /^\d{8}$/ },
		{ code: "+852", name: "Hong Kong", flag: "🇭🇰", regex: /^\d{8}$/ },
		{ code: "+36", name: "Hungary", flag: "🇭🇺", regex: /^\d{8,9}$/ },
		{ code: "+354", name: "Iceland", flag: "🇮🇸", regex: /^\d{7}$/ },
		{ code: "+91", name: "India", flag: "🇮🇳", regex: /^\d{10}$/ },
		{ code: "+62", name: "Indonesia", flag: "🇮🇩", regex: /^\d{9,13}$/ },
		{ code: "+98", name: "Iran", flag: "🇮🇷", regex: /^\d{10}$/ },
		{ code: "+964", name: "Iraq", flag: "🇮🇶", regex: /^\d{10}$/ },
		{ code: "+353", name: "Ireland", flag: "🇮🇪", regex: /^\d{7,10}$/ },
		{ code: "+44", name: "Isle of Man", flag: "🇮🇲", regex: /^\d{10}$/ },
		{ code: "+972", name: "Israel", flag: "🇮🇱", regex: /^\d{9}$/ },
		{ code: "+39", name: "Italy", flag: "🇮🇹", regex: /^\d{9,10}$/ },
		{ code: "+1", name: "Jamaica", flag: "🇯🇲", regex: /^\d{10}$/ },
		{ code: "+81", name: "Japan", flag: "🇯🇵", regex: /^\d{10}$/ },
		{ code: "+44", name: "Jersey", flag: "🇯🇪", regex: /^\d{10}$/ },
		{ code: "+962", name: "Jordan", flag: "🇯🇴", regex: /^\d{9}$/ },
		{ code: "+7", name: "Kazakhstan", flag: "🇰🇿", regex: /^\d{10}$/ },
		{ code: "+254", name: "Kenya", flag: "🇰🇪", regex: /^\d{9}$/ },
		{ code: "+686", name: "Kiribati", flag: "🇰🇮", regex: /^\d{8}$/ },
		{ code: "+383", name: "Kosovo", flag: "🇽🇰", regex: /^\d{8}$/ },
		{ code: "+965", name: "Kuwait", flag: "🇰🇼", regex: /^\d{8}$/ },
		{ code: "+996", name: "Kyrgyzstan", flag: "🇰🇬", regex: /^\d{9}$/ },
		{ code: "+856", name: "Laos", flag: "🇱🇦", regex: /^\d{8,12}$/ },
		{ code: "+371", name: "Latvia", flag: "🇱🇻", regex: /^\d{8}$/ },
		{ code: "+961", name: "Lebanon", flag: "🇱🇧", regex: /^\d{7,8}$/ },
		{ code: "+266", name: "Lesotho", flag: "🇱🇸", regex: /^\d{8}$/ },
		{ code: "+231", name: "Liberia", flag: "🇱🇷", regex: /^\d{7,9}$/ },
		{ code: "+218", name: "Libya", flag: "🇱🇾", regex: /^\d{9}$/ },
		{ code: "+423", name: "Liechtenstein", flag: "🇱🇮", regex: /^\d{7,9}$/ },
		{ code: "+370", name: "Lithuania", flag: "🇱🇹", regex: /^\d{8}$/ },
		{ code: "+352", name: "Luxembourg", flag: "🇱🇺", regex: /^\d{9,11}$/ },
		{ code: "+853", name: "Macau", flag: "🇲🇴", regex: /^\d{8}$/ },
		{ code: "+389", name: "North Macedonia", flag: "🇲🇰", regex: /^\d{8}$/ },
		{ code: "+261", name: "Madagascar", flag: "🇲🇬", regex: /^\d{9}$/ },
		{ code: "+265", name: "Malawi", flag: "🇲🇼", regex: /^\d{9}$/ },
		{ code: "+60", name: "Malaysia", flag: "🇲🇾", regex: /^\d{9,10}$/ },
		{ code: "+960", name: "Maldives", flag: "🇲🇻", regex: /^\d{7}$/ },
		{ code: "+223", name: "Mali", flag: "🇲🇱", regex: /^\d{8}$/ },
		{ code: "+356", name: "Malta", flag: "🇲🇹", regex: /^\d{8}$/ },
		{
			code: "+692",
			name: "Marshall Islands",
			flag: "🇲🇭",
			regex: /^\d{7}$/,
		},
		{ code: "+596", name: "Martinique", flag: "🇲🇶", regex: /^\d{9}$/ },
		{ code: "+222", name: "Mauritania", flag: "🇲🇷", regex: /^\d{8}$/ },
		{ code: "+230", name: "Mauritius", flag: "🇲🇺", regex: /^\d{8}$/ },
		{ code: "+262", name: "Mayotte", flag: "🇾🇹", regex: /^\d{9}$/ },
		{ code: "+52", name: "Mexico", flag: "🇲🇽", regex: /^\d{10}$/ },
		{ code: "+691", name: "Micronesia", flag: "🇫🇲", regex: /^\d{7}$/ },
		{ code: "+373", name: "Moldova", flag: "🇲🇩", regex: /^\d{8}$/ },
		{ code: "+377", name: "Monaco", flag: "🇲🇨", regex: /^\d{8,9}$/ },
		{ code: "+976", name: "Mongolia", flag: "🇲🇳", regex: /^\d{8}$/ },
		{ code: "+382", name: "Montenegro", flag: "🇲🇪", regex: /^\d{8}$/ },
		{ code: "+1", name: "Montserrat", flag: "🇲🇸", regex: /^\d{10}$/ },
		{ code: "+212", name: "Morocco", flag: "🇲🇦", regex: /^\d{9}$/ },
		{ code: "+258", name: "Mozambique", flag: "🇲🇿", regex: /^\d{9}$/ },
		{ code: "+95", name: "Myanmar", flag: "🇲🇲", regex: /^\d{7,10}$/ },
		{ code: "+264", name: "Namibia", flag: "🇳🇦", regex: /^\d{9}$/ },
		{ code: "+674", name: "Nauru", flag: "🇳🇷", regex: /^\d{7}$/ },
		{ code: "+977", name: "Nepal", flag: "🇳🇵", regex: /^\d{10}$/ },
		{ code: "+31", name: "Netherlands", flag: "🇳🇱", regex: /^\d{9}$/ },
		{ code: "+687", name: "New Caledonia", flag: "🇳🇨", regex: /^\d{6}$/ },
		{ code: "+64", name: "New Zealand", flag: "🇳🇿", regex: /^\d{8,10}$/ },
		{ code: "+505", name: "Nicaragua", flag: "🇳🇮", regex: /^\d{8}$/ },
		{ code: "+227", name: "Niger", flag: "🇳🇪", regex: /^\d{8}$/ },
		{ code: "+234", name: "Nigeria", flag: "🇳🇬", regex: /^\d{10}$/ },
		{ code: "+683", name: "Niue", flag: "🇳🇺", regex: /^\d{4}$/ },
		{
			code: "+672",
			name: "Norfolk Island",
			flag: "🇳🇫",
			regex: /^\d{5,6}$/,
		},
		{ code: "+850", name: "North Korea", flag: "🇰🇵", regex: /^\d{10,12}$/ },
		{
			code: "+1",
			name: "Northern Mariana Islands",
			flag: "🇲🇵",
			regex: /^\d{10}$/,
		},
		{ code: "+47", name: "Norway", flag: "🇳🇴", regex: /^\d{8,12}$/ },
		{ code: "+968", name: "Oman", flag: "🇴🇲", regex: /^\d{8}$/ },
		{ code: "+92", name: "Pakistan", flag: "🇵🇰", regex: /^\d{10}$/ },
		{ code: "+680", name: "Palau", flag: "🇵🇼", regex: /^\d{7}$/ },
		{ code: "+970", name: "Palestine", flag: "🇵🇸", regex: /^\d{9}$/ },
		{ code: "+507", name: "Panama", flag: "🇵🇦", regex: /^\d{8}$/ },
		{
			code: "+675",
			name: "Papua New Guinea",
			flag: "🇵🇬",
			regex: /^\d{8}$/,
		},
		{ code: "+595", name: "Paraguay", flag: "🇵🇾", regex: /^\d{9}$/ },
		{ code: "+51", name: "Peru", flag: "🇵🇪", regex: /^\d{9}$/ },
		{ code: "+63", name: "Philippines", flag: "🇵🇭", regex: /^\d{10}$/ },
		{ code: "+48", name: "Poland", flag: "🇵🇱", regex: /^\d{9}$/ },
		{ code: "+351", name: "Portugal", flag: "🇵🇹", regex: /^\d{9}$/ },
		{ code: "+1", name: "Puerto Rico", flag: "🇵🇷", regex: /^\d{10}$/ },
		{ code: "+974", name: "Qatar", flag: "🇶🇦", regex: /^\d{8}$/ },
		{ code: "+262", name: "Réunion", flag: "🇷🇪", regex: /^\d{9}$/ },
		{ code: "+40", name: "Romania", flag: "🇷🇴", regex: /^\d{9,10}$/ },
		{ code: "+7", name: "Russia", flag: "🇷🇺", regex: /^\d{10}$/ },
		{ code: "+250", name: "Rwanda", flag: "🇷🇼", regex: /^\d{9}$/ },
		{
			code: "+590",
			name: "Saint Barthélemy",
			flag: "🇧🇱",
			regex: /^\d{9}$/,
		},
		{ code: "+290", name: "Saint Helena", flag: "🇸🇭", regex: /^\d{4}$/ },
		{
			code: "+1",
			name: "Saint Kitts & Nevis",
			flag: "🇰🇳",
			regex: /^\d{10}$/,
		},
		{ code: "+1", name: "Saint Lucia", flag: "🇱🇨", regex: /^\d{10}$/ },
		{ code: "+590", name: "Saint Martin", flag: "🇲🇫", regex: /^\d{9}$/ },
		{
			code: "+508",
			name: "Saint Pierre & Miquelon",
			flag: "🇵🇲",
			regex: /^\d{6}$/,
		},
		{
			code: "+1",
			name: "Saint Vincent & Grenadines",
			flag: "🇻🇨",
			regex: /^\d{10}$/,
		},
		{ code: "+685", name: "Samoa", flag: "🇼🇸", regex: /^\d{7}$/ },
		{ code: "+378", name: "San Marino", flag: "🇸🇲", regex: /^\d{6,10}$/ },
		{
			code: "+239",
			name: "São Tomé & Príncipe",
			flag: "🇸🇹",
			regex: /^\d{7}$/,
		},
		{ code: "+966", name: "Saudi Arabia", flag: "🇸🇦", regex: /^\d{9}$/ },
		{ code: "+221", name: "Senegal", flag: "🇸🇳", regex: /^\d{9}$/ },
		{ code: "+381", name: "Serbia", flag: "🇷🇸", regex: /^\d{8,9}$/ },
		{ code: "+248", name: "Seychelles", flag: "🇸🇨", regex: /^\d{7}$/ },
		{ code: "+232", name: "Sierra Leone", flag: "🇸🇱", regex: /^\d{8}$/ },
		{ code: "+65", name: "Singapore", flag: "🇸🇬", regex: /^\d{8}$/ },
		{ code: "+1", name: "Sint Maarten", flag: "🇸🇽", regex: /^\d{10}$/ },
		{ code: "+421", name: "Slovakia", flag: "🇸🇰", regex: /^\d{9}$/ },
		{ code: "+386", name: "Slovenia", flag: "🇸🇮", regex: /^\d{8}$/ },
		{
			code: "+677",
			name: "Solomon Islands",
			flag: "🇸🇧",
			regex: /^\d{5,7}$/,
		},
		{ code: "+252", name: "Somalia", flag: "🇸🇴", regex: /^\d{8,9}$/ },
		{ code: "+27", name: "South Africa", flag: "🇿🇦", regex: /^\d{9}$/ },
		{ code: "+82", name: "South Korea", flag: "🇰🇷", regex: /^\d{8,11}$/ },
		{ code: "+211", name: "South Sudan", flag: "🇸🇸", regex: /^\d{9}$/ },
		{ code: "+34", name: "Spain", flag: "🇪🇸", regex: /^\d{9}$/ },
		{ code: "+94", name: "Sri Lanka", flag: "🇱🇰", regex: /^\d{9}$/ },
		{ code: "+249", name: "Sudan", flag: "🇸🇩", regex: /^\d{9}$/ },
		{ code: "+597", name: "Suriname", flag: "🇸🇷", regex: /^\d{6,7}$/ },
		{
			code: "+47",
			name: "Svalbard & Jan Mayen",
			flag: "🇸🇯",
			regex: /^\d{8}$/,
		},
		{ code: "+46", name: "Sweden", flag: "🇸🇪", regex: /^\d{9,10}$/ },
		{ code: "+41", name: "Switzerland", flag: "🇨🇭", regex: /^\d{9,10}$/ },
		{ code: "+963", name: "Syria", flag: "🇸🇾", regex: /^\d{9}$/ },
		{ code: "+886", name: "Taiwan", flag: "🇹🇼", regex: /^\d{9}$/ },
		{ code: "+992", name: "Tajikistan", flag: "🇹🇯", regex: /^\d{9}$/ },
		{ code: "+255", name: "Tanzania", flag: "🇹🇿", regex: /^\d{9}$/ },
		{ code: "+66", name: "Thailand", flag: "🇹🇭", regex: /^\d{9}$/ },
		{ code: "+670", name: "Timor-Leste", flag: "🇹🇱", regex: /^\d{7,8}$/ },
		{ code: "+228", name: "Togo", flag: "🇹🇬", regex: /^\d{8}$/ },
		{ code: "+690", name: "Tokelau", flag: "🇹🇰", regex: /^\d{4}$/ },
		{ code: "+676", name: "Tonga", flag: "🇹🇴", regex: /^\d{5,7}$/ },
		{
			code: "+1",
			name: "Trinidad & Tobago",
			flag: "🇹🇹",
			regex: /^\d{10}$/,
		},
		{ code: "+216", name: "Tunisia", flag: "🇹🇳", regex: /^\d{8}$/ },
		{ code: "+90", name: "Turkey", flag: "🇹🇷", regex: /^\d{10}$/ },
		{ code: "+993", name: "Turkmenistan", flag: "🇹🇲", regex: /^\d{8}$/ },
		{
			code: "+1",
			name: "Turks & Caicos Islands",
			flag: "🇹🇨",
			regex: /^\d{10}$/,
		},
		{ code: "+688", name: "Tuvalu", flag: "🇹🇻", regex: /^\d{5,6}$/ },
		{ code: "+256", name: "Uganda", flag: "🇺🇬", regex: /^\d{9}$/ },
		{ code: "+380", name: "Ukraine", flag: "🇺🇦", regex: /^\d{9}$/ },
		{
			code: "+971",
			name: "United Arab Emirates",
			flag: "🇦🇪",
			regex: /^\d{9}$/,
		},
		{ code: "+44", name: "United Kingdom", flag: "🇬🇧", regex: /^\d{10}$/ },
		{ code: "+1", name: "United States", flag: "🇺🇸", regex: /^\d{10}$/ },
		{ code: "+598", name: "Uruguay", flag: "🇺🇾", regex: /^\d{8}$/ },
		{
			code: "+1",
			name: "US Virgin Islands",
			flag: "🇻🇮",
			regex: /^\d{10}$/,
		},
		{ code: "+998", name: "Uzbekistan", flag: "🇺🇿", regex: /^\d{9}$/ },
		{ code: "+678", name: "Vanuatu", flag: "🇻🇺", regex: /^\d{5,7}$/ },
		{ code: "+39", name: "Vatican City", flag: "🇻🇦", regex: /^\d{10}$/ },
		{ code: "+58", name: "Venezuela", flag: "🇻🇪", regex: /^\d{10}$/ },
		{ code: "+84", name: "Vietnam", flag: "🇻🇳", regex: /^\d{9,10}$/ },
		{ code: "+681", name: "Wallis & Futuna", flag: "🇼🇫", regex: /^\d{6}$/ },
		{ code: "+212", name: "Western Sahara", flag: "🇪🇭", regex: /^\d{9}$/ },
		{ code: "+967", name: "Yemen", flag: "🇾🇪", regex: /^\d{9}$/ },
		{ code: "+260", name: "Zambia", flag: "🇿🇲", regex: /^\d{9}$/ },
		{ code: "+263", name: "Zimbabwe", flag: "🇿🇼", regex: /^\d{9}$/ },
	];

	// ─── Phone Validation ────────────────────────────────────────────────────────

	function validatePhone(phone, countryCode, messageId) {
		const selectedCountry = countryCodes.find(
			(c) => c.code === countryCode,
		);
		const pattern =
			selectedCountry && selectedCountry.regex
				? selectedCountry.regex
				: /^\d{7,15}$/;
		const clean = phone.replace(/\D/g, "");
		if (!pattern.test(clean)) {
			const countryName = selectedCountry
				? selectedCountry.name
				: "selected country";
			showMessage(
				messageId,
				`Invalid phone number format for ${countryName}`,
				true,
			);
			return false;
		}
		return true;
	}

	// ─── API call helper ─────────────────────────────────────────────────────────

	async function apiPost(endpoint, body = {}) {
		try {
			const response = await fetch(`${API}${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(body),
			});

			// Read response safely
			const raw = await response.text();
			let data;

			try {
				data = JSON.parse(raw);
			} catch {
				data = { message: raw };
			}

			console.log("📥 Response:", data);

			// Handle HTTP errors
			if (!response.ok) {
				return {
					ok: false,
					status: response.status,
					message:
						data.error ||
						data.message ||
						`Error ${response.status}`,
					data,
				};
			}

			// Success
			return {
				ok: true,
				status: response.status,
				message: data.message || "Success",
				data,
			};
		} catch (error) {
			console.error("❌ Network error:", error);

			return {
				ok: false,
				status: 0,
				message: "Cannot reach server. Is it running?",
				error,
			};
		}
	}

	// ─── DOMContentLoaded ────────────────────────────────────────────────────────

	document.addEventListener("DOMContentLoaded", () => {
		// ── Grab Modal Elements ──────────────────────────────────────────────────
		const addAdminModal = document.getElementById("addAdminModal");
		const addMerchantModal = document.getElementById("addMerchantModal");
		const addDriverModal = document.getElementById("addDriverModal");

		const showAddAdminBtn = document.getElementById("showAddAdminBtn");
		const showAddMerchantBtn =
			document.getElementById("showAddMerchantBtn");
		const showAddDriverBtn = document.getElementById("showAddDriverBtn");

		const closeAdminModalBtn = document.getElementById("closeAdminModal");
		const closeMerchantModalBtn =
			document.getElementById("closeMerchantModal");
		const closeDriverModalBtn = document.getElementById("closeDriverModal");

		// ── "Add New Account" accordion toggle ──────────────────────────────────
		const addAccountToggle = document.getElementById("addAccountToggle");
		const addAccountContent = document.getElementById("addAccountContent");

		if (addAccountToggle && addAccountContent) {
			addAccountToggle.addEventListener("click", () => {
				const isHidden = addAccountContent.classList.contains("hidden");
				addAccountContent.classList.toggle("hidden", !isHidden);
				addAccountToggle.classList.toggle("active", isHidden);
			});
		}

		// ── Open / Close modals ──────────────────────────────────────────────────
		if (showAddAdminBtn)
			showAddAdminBtn.addEventListener("click", () =>
				openModal(addAdminModal),
			);
		if (showAddMerchantBtn)
			showAddMerchantBtn.addEventListener("click", () =>
				openModal(addMerchantModal),
			);
		if (showAddDriverBtn)
			showAddDriverBtn.addEventListener("click", () =>
				openModal(addDriverModal),
			);

		if (closeAdminModalBtn)
			closeAdminModalBtn.addEventListener("click", () =>
				closeModal(addAdminModal),
			);
		if (closeMerchantModalBtn)
			closeMerchantModalBtn.addEventListener("click", () =>
				closeModal(addMerchantModal),
			);
		if (closeDriverModalBtn)
			closeDriverModalBtn.addEventListener("click", () =>
				closeModal(addDriverModal),
			);

		window.addEventListener("click", (e) => {
			if (e.target === addAdminModal) closeModal(addAdminModal);
			if (e.target === addMerchantModal) closeModal(addMerchantModal);
			if (e.target === addDriverModal) closeModal(addDriverModal);
		});

		// ── Country Dropdowns ────────────────────────────────────────────────────
		initCountryDropdown("admin");
		initCountryDropdown("merchant");
		initCountryDropdown("driver");

		// ── Account-type radio (prepaid / postpaid) ──────────────────────────────
		const accTypePrepaid = document.getElementById("accTypePrepaid");
		const accTypePostpaid = document.getElementById("accTypePostpaid");
		const prepaidOptions = document.getElementById("prepaidOptions");
		const postpaidOptions = document.getElementById("postpaidOptions");

		function toggleAccountOptions() {
			if (!accTypePrepaid || !prepaidOptions || !postpaidOptions) return;
			prepaidOptions.classList.toggle("hidden", !accTypePrepaid.checked);
			postpaidOptions.classList.toggle("hidden", accTypePrepaid.checked);
		}

		if (accTypePrepaid && accTypePostpaid) {
			accTypePrepaid.addEventListener("change", toggleAccountOptions);
			accTypePostpaid.addEventListener("change", toggleAccountOptions);
		}

		// ── Add Admin ────────────────────────────────────────────────────────────
		const addAdminBtn = document.getElementById("addAdminBtn");
		if (addAdminBtn) {
			addAdminBtn.dataset.label = addAdminBtn.textContent;
			addAdminBtn.addEventListener("click", async () => {
				const username = document
					.getElementById("adminUsername")
					.value.trim();
				const email = document
					.getElementById("adminEmail")
					.value.trim();
				const password = document
					.getElementById("adminPassword")
					.value.trim();
				const firstName = document
					.getElementById("adminFirstName")
					.value.trim();
				const lastName = document
					.getElementById("adminLastName")
					.value.trim();
				const phone = document
					.getElementById("adminPhone")
					.value.trim();
				const countryCode =
					document.getElementById("adminCountryCode").value;

				if (!username || !email || !password || !firstName || !phone) {
					showMessage(
						"adminMessage",
						"Please fill in all required fields",
						true,
					);
					return;
				}
				if (password.length < 6) {
					showMessage(
						"adminMessage",
						"Password must be at least 6 characters",
						true,
					);
					return;
				}
				if (!validatePhone(phone, countryCode, "adminMessage")) return;

				// Submit as SSR form POST
				const formA = document.createElement("form");
				formA.method = "POST";
				formA.action = "/users/add-admin";
				const inpA = document.createElement("input");
				inpA.type = "hidden";
				inpA.name = "payload";
				inpA.value = JSON.stringify({
					username,
					email,
					password,
					firstName,
					lastName,
					phone: `${countryCode} ${phone}`,
				});
				formA.appendChild(inpA);
				document.body.appendChild(formA);
				formA.submit();

				[
					"adminUsername",
					"adminEmail",
					"adminPassword",
					"adminFirstName",
					"adminLastName",
					"adminPhone",
				].forEach((id) => {
					document.getElementById(id).value = "";
				});

				showMessage(
					"adminMessage",
					"Admin account added successfully!",
				);
				setTimeout(() => closeModal(addAdminModal), 1500);
			});
		}

		// ── Add Merchant ─────────────────────────────────────────────────────────
		const addMerchantBtn = document.getElementById("addMerchantBtn");
		if (addMerchantBtn) {
			addMerchantBtn.dataset.label = addMerchantBtn.textContent;
			addMerchantBtn.addEventListener("click", async () => {
				const username = document
					.getElementById("merchantUsername")
					.value.trim();
				const email = document
					.getElementById("merchantEmail")
					.value.trim();
				const password = document
					.getElementById("merchantPassword")
					.value.trim();
				const firstName = document
					.getElementById("merchantFirstName")
					.value.trim();
				const lastName = document
					.getElementById("merchantLastName")
					.value.trim();
				const phone = document
					.getElementById("merchantPhone")
					.value.trim();
				const countryCode = document.getElementById(
					"merchantCountryCode",
				).value;

				const accountTypeRadio = document.querySelector(
					'input[name="accountType"]:checked',
				);
				const accountType = accountTypeRadio
					? accountTypeRadio.value
					: "prepaid";

				const cashPercentage = document.getElementById(
					"merchantCashPercentage",
				).value;
				const paymentDay =
					document.getElementById("merchantPaymentDay").value;

				if (!username || !email || !password || !firstName || !phone) {
					showMessage(
						"merchantMessage",
						"Please fill in all required fields",
						true,
					);
					return;
				}
				if (
					accountType === "prepaid" &&
					(cashPercentage === "" ||
						Number(cashPercentage) < 0 ||
						Number(cashPercentage) > 100)
				) {
					showMessage(
						"merchantMessage",
						"Please enter a valid Cash Percentage (0–100)",
						true,
					);
					return;
				}
				if (accountType === "postpaid" && !paymentDay) {
					showMessage(
						"merchantMessage",
						"Please select a Payment Day",
						true,
					);
					return;
				}
				if (password.length < 6) {
					showMessage(
						"merchantMessage",
						"Password must be at least 6 characters",
						true,
					);
					return;
				}
				if (!validatePhone(phone, countryCode, "merchantMessage"))
					return;

				const deliveryCharges = {
					Akkar:
						parseFloat(
							document.getElementById("deliveryAkkar").value,
						) || 0,
					"Baalbek-Hermel":
						parseFloat(
							document.getElementById("deliveryBaalbek").value,
						) || 0,
					Beirut:
						parseFloat(
							document.getElementById("deliveryBeirut").value,
						) || 0,
					Bekaa:
						parseFloat(
							document.getElementById("deliveryBekaa").value,
						) || 0,
					"El Nabatieh":
						parseFloat(
							document.getElementById("deliveryNabatieh").value,
						) || 0,
					"Mount Lebanon":
						parseFloat(
							document.getElementById("deliveryMountLebanon")
								.value,
						) || 0,
					North:
						parseFloat(
							document.getElementById("deliveryNorth").value,
						) || 0,
					South:
						parseFloat(
							document.getElementById("deliverySouth").value,
						) || 0,
				};

				// Submit merchant create as SSR form POST
				const formM = document.createElement("form");
				formM.method = "POST";
				formM.action = "/users/add-merchant";
				const inpM = document.createElement("input");
				inpM.type = "hidden";
				inpM.name = "payload";
				inpM.value = JSON.stringify({
					username,
					email,
					password,
					firstName,
					lastName,
					phone: `${countryCode} ${phone}`,
					accountType,
					cashPercentage:
						accountType === "prepaid"
							? Number(cashPercentage)
							: null,
					paymentDay: accountType === "postpaid" ? paymentDay : null,
					deliveryCharges,
				});
				formM.appendChild(inpM);
				document.body.appendChild(formM);
				formM.submit();

				[
					"merchantUsername",
					"merchantEmail",
					"merchantPassword",
					"merchantFirstName",
					"merchantLastName",
					"merchantPhone",
					"merchantCashPercentage",
					"merchantPaymentDay",
					"deliveryAkkar",
					"deliveryBaalbek",
					"deliveryBeirut",
					"deliveryBekaa",
					"deliveryNabatieh",
					"deliveryMountLebanon",
					"deliveryNorth",
					"deliverySouth",
				].forEach((id) => {
					document.getElementById(id).value = "";
				});

				showMessage(
					"merchantMessage",
					"Merchant account added successfully!",
				);
				setTimeout(() => closeModal(addMerchantModal), 1500);
			});
		}

		// ── Add Driver ───────────────────────────────────────────────────────────
		const addDriverBtn = document.getElementById("addDriverBtn");
		if (addDriverBtn) {
			addDriverBtn.dataset.label = addDriverBtn.textContent;
			addDriverBtn.addEventListener("click", async () => {
				const username = document
					.getElementById("driverUsername")
					.value.trim();
				const email = document
					.getElementById("driverEmail")
					.value.trim();
				const password = document
					.getElementById("driverPassword")
					.value.trim();
				const firstName = document
					.getElementById("driverFirstName")
					.value.trim();
				const lastName = document
					.getElementById("driverLastName")
					.value.trim();
				const phone = document
					.getElementById("driverPhone")
					.value.trim();
				const countryCode =
					document.getElementById("driverCountryCode").value;

				if (!username || !email || !password || !firstName || !phone) {
					showMessage(
						"driverMessage",
						"Please fill in all required fields",
						true,
					);
					return;
				}
				if (password.length < 6) {
					showMessage(
						"driverMessage",
						"Password must be at least 6 characters",
						true,
					);
					return;
				}
				if (!validatePhone(phone, countryCode, "driverMessage")) return;

				// Submit driver create as SSR form POST
				const formD = document.createElement("form");
				formD.method = "POST";
				formD.action = "/users/add-driver";
				const inpD = document.createElement("input");
				inpD.type = "hidden";
				inpD.name = "payload";
				inpD.value = JSON.stringify({
					username,
					email,
					password,
					firstName,
					lastName,
					phone: `${countryCode} ${phone}`,
				});
				formD.appendChild(inpD);
				document.body.appendChild(formD);
				formD.submit();

				[
					"driverUsername",
					"driverEmail",
					"driverPassword",
					"driverFirstName",
					"driverLastName",
					"driverPhone",
				].forEach((id) => {
					document.getElementById(id).value = "";
				});

				showMessage(
					"driverMessage",
					"Driver account added successfully!",
				);
				setTimeout(() => closeModal(addDriverModal), 1500);
			});
		}

		function loadLocations() {
			const locations = (window.__INIT_DATA__ || {}).locations || [];
			const districtSelect = document.getElementById("districtSelect");
			if (!districtSelect) return;
			districtSelect.innerHTML =
				'<option value="">Select District</option>';
			locations.forEach((loc) => {
				const option = document.createElement("option");
				option.value = loc.district?.en || loc.district;
				option.textContent = loc.district?.en || loc.district;
				districtSelect.appendChild(option);
			});
		}

		const locationToggle = document.getElementById("locationList");
		const locationContent = document.getElementById("addLocationContent");
		locationToggle?.addEventListener("click", () => {
			const isHidden = locationContent.classList.contains("hidden");
			locationContent.classList.toggle("hidden", !isHidden);
			locationToggle.classList.toggle("active", isHidden);
			const icon = locationToggle.querySelector("i");
			if (icon)
				icon.style.transform = locationContent.classList.contains(
					"hidden",
				)
					? "rotate(0deg)"
					: "rotate(90deg)";
		});

		// ── Change My Password (self-service) ───────────────────────────────────
		const changePasswordToggle = document.getElementById(
			"changePasswordToggle",
		);
		const changePasswordContent = document.getElementById(
			"changePasswordContent",
		);
		changePasswordToggle?.addEventListener("click", () => {
			const isHidden = changePasswordContent.classList.contains("hidden");
			changePasswordContent.classList.toggle("hidden", !isHidden);
			changePasswordToggle.classList.toggle("active", isHidden);
		});

		document
			.getElementById("changePasswordBtn")
			?.addEventListener("click", async () => {
				const btn = document.getElementById("changePasswordBtn");
				btn.dataset.label = btn.dataset.label || btn.textContent;
				const currentPassword = document
					.getElementById("currentPassword")
					.value.trim();
				const newPassword = document
					.getElementById("newPasswordSelf")
					.value.trim();
				const confirmPassword = document
					.getElementById("confirmNewPasswordSelf")
					.value.trim();

				if (!currentPassword || !newPassword || !confirmPassword) {
					showMessage(
						"changePasswordMessage",
						"Please fill in all fields",
						true,
					);
					return;
				}
				if (newPassword !== confirmPassword) {
					showMessage(
						"changePasswordMessage",
						"New passwords do not match",
						true,
					);
					return;
				}

				setLoading(btn, true);
				try {
					const res = await fetch(`${API}/auth/change-password`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ currentPassword, newPassword }),
					});
					const data = await res.json();
					if (!res.ok)
						throw new Error(
							data.errors?.[0]?.msg ||
								data.error ||
								"Failed to change password",
						);

					showMessage(
						"changePasswordMessage",
						"Password updated successfully!",
					);
					["currentPassword", "newPasswordSelf", "confirmNewPasswordSelf"].forEach(
						(id) => (document.getElementById(id).value = ""),
					);
				} catch (err) {
					showMessage("changePasswordMessage", err.message, true);
				} finally {
					setLoading(btn, false);
				}
			});

		// ── Reset a User's Password (admin action) ──────────────────────────────
		const resetUserPasswordToggle = document.getElementById(
			"resetUserPasswordToggle",
		);
		const resetUserPasswordContent = document.getElementById(
			"resetUserPasswordContent",
		);
		let allUsersForReset = [];

		async function loadUsersForReset() {
			try {
				const res = await fetch(`${API}/users`, {
					credentials: "include",
				});
				const users = await res.json();
				allUsersForReset = Array.isArray(users) ? users : [];

				const select = document.getElementById("resetUserSelect");
				if (!select) return;
				select.innerHTML = '<option value="">Select a user...</option>';
				allUsersForReset.forEach((u) => {
					const opt = document.createElement("option");
					opt.value = u._id;
					opt.textContent = `${u.username} (${u.role})`;
					select.appendChild(opt);
				});
			} catch (err) {
				console.error("Error loading users:", err);
			}
		}

		resetUserPasswordToggle?.addEventListener("click", () => {
			const isHidden = resetUserPasswordContent.classList.contains(
				"hidden",
			);
			resetUserPasswordContent.classList.toggle("hidden", !isHidden);
			resetUserPasswordToggle.classList.toggle("active", isHidden);
			if (!resetUserPasswordContent.classList.contains("hidden")) {
				loadUsersForReset();
			}
		});

		document
			.getElementById("resetUserSelect")
			?.addEventListener("change", (e) => {
				const fields = document.getElementById("resetUserPasswordFields");
				fields.classList.toggle("hidden", !e.target.value);
			});

		document
			.getElementById("resetUserPasswordBtn")
			?.addEventListener("click", async () => {
				const btn = document.getElementById("resetUserPasswordBtn");
				btn.dataset.label = btn.dataset.label || btn.textContent;
				const userId = document.getElementById("resetUserSelect").value;
				const newPassword = document
					.getElementById("newPasswordForUser")
					.value.trim();
				const confirmPassword = document
					.getElementById("confirmNewPasswordForUser")
					.value.trim();

				if (!userId) return;
				if (!newPassword || !confirmPassword) {
					showMessage(
						"resetUserPasswordMessage",
						"Please fill in the new password",
						true,
					);
					return;
				}
				if (newPassword !== confirmPassword) {
					showMessage(
						"resetUserPasswordMessage",
						"Passwords do not match",
						true,
					);
					return;
				}

				setLoading(btn, true);
				try {
					const res = await fetch(`${API}/users/${userId}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ password: newPassword }),
					});
					const data = await res.json();
					if (!res.ok)
						throw new Error(
							data.errors?.[0]?.msg ||
								data.error ||
								"Failed to reset password",
						);

					showMessage(
						"resetUserPasswordMessage",
						"Password reset successfully!",
					);
					["newPasswordForUser", "confirmNewPasswordForUser"].forEach(
						(id) => (document.getElementById(id).value = ""),
					);
				} catch (err) {
					showMessage("resetUserPasswordMessage", err.message, true);
				} finally {
					setLoading(btn, false);
				}
			});

		// Toggle Delivery Charges Management
		const manageChargesToggle = document.getElementById(
			"manageChargesToggle",
		);
		const manageChargesContent = document.getElementById(
			"manageChargesContent",
		);
		manageChargesToggle?.addEventListener("click", () => {
			const isHidden = manageChargesContent.classList.contains("hidden");
			manageChargesContent.classList.toggle("hidden", !isHidden);
			manageChargesToggle.classList.toggle("active", isHidden);
			const icon = manageChargesToggle.querySelector("i");
			if (icon)
				icon.style.transform = manageChargesContent.classList.contains(
					"hidden",
				)
					? "rotate(0deg)"
					: "rotate(90deg)";
			if (!manageChargesContent.classList.contains("hidden")) {
				loadMerchantsForCharges();
			}
		});

		loadLocations();

		// Show global success/error messages redirected from server-side actions
		(() => {
			try {
				const params = new URLSearchParams(window.location.search);
				if (params.get("success") === "1") {
					showMessage(
						"pageMessage",
						"Operation completed successfully.",
					);
					history.replaceState(null, "", window.location.pathname);
				} else if (params.get("error")) {
					const err = decodeURIComponent(params.get("error"));
					showMessage("pageMessage", err, true);
					history.replaceState(null, "", window.location.pathname);
				}
			} catch (e) {
				// ignore
			}
		})();

		document
			.getElementById("addLocationForm")
			?.addEventListener("submit", async function (e) {
				e.preventDefault();
				const btn = document.getElementById("saveLocationBtn");
				const district = this.district.value;
				const cityEn = this.cities.value;
				const cityAr = this.citiesAr?.value || cityEn;

				setLoading(btn, true);
				try {
					const res = await fetch(`${API}/locations`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ district, cityEn, cityAr }),
					});

					const data = await res.json();
					if (!res.ok)
						throw new Error(
							data.message || "Error saving location",
						);
					alert("City added successfully!");
					this.reset();
					await loadLocations();
				} catch (err) {
					console.error(err);
					alert(err.message || "Server error");
				} finally {
					setLoading(btn, false);
				}
			});

		// ── Manage Delivery Charges ──
		let allMerchants = [];

		async function loadMerchantsForCharges() {
			try {
				allMerchants = (window.__INIT_DATA__ || {}).merchants || [];

				const select = document.getElementById("merchantSelect");
				if (!select) return;

				select.innerHTML =
					'<option value="">Select a merchant...</option>';
				allMerchants.forEach((m) => {
					const option = document.createElement("option");
					option.value = m._id;
					option.textContent = `${m.username} (${m.firstName} ${m.lastName})`;
					select.appendChild(option);
				});

				select.addEventListener("change", (e) => {
					const merchantId = e.target.value;
					const fields = document.getElementById("chargesFields");
					if (!merchantId) {
						fields.classList.add("hidden");
						return;
					}

					const m = allMerchants.find((x) => x._id === merchantId);
					if (m && m.deliveryCharges) {
						document.getElementById("editAkkar").value =
							m.deliveryCharges.Akkar || 0;
						document.getElementById("editBaalbek").value =
							m.deliveryCharges["Baalbek-Hermel"] || 0;
						document.getElementById("editBeirut").value =
							m.deliveryCharges.Beirut || 0;
						document.getElementById("editBekaa").value =
							m.deliveryCharges.Bekaa || 0;
						document.getElementById("editNabatieh").value =
							m.deliveryCharges["El Nabatieh"] || 0;
						document.getElementById("editMountLebanon").value =
							m.deliveryCharges["Mount Lebanon"] || 0;
						document.getElementById("editNorth").value =
							m.deliveryCharges.North || 0;
						document.getElementById("editSouth").value =
							m.deliveryCharges.South || 0;
					} else {
						[
							"editAkkar",
							"editBaalbek",
							"editBeirut",
							"editBekaa",
							"editNabatieh",
							"editMountLebanon",
							"editNorth",
							"editSouth",
						].forEach((id) => {
							document.getElementById(id).value = 0;
						});
					}
					fields.classList.remove("hidden");
				});
			} catch (err) {
				console.error("Error loading merchants:", err);
			}
		}

		document
			.getElementById("saveChargesBtn")
			?.addEventListener("click", async () => {
				const select = document.getElementById("merchantSelect");
				const merchantId = select.value;
				if (!merchantId) return;

				const btn = document.getElementById("saveChargesBtn");
				const msg = document.getElementById("chargesMessage");

				const deliveryCharges = {
					Akkar:
						parseFloat(
							document.getElementById("editAkkar").value,
						) || 0,
					"Baalbek-Hermel":
						parseFloat(
							document.getElementById("editBaalbek").value,
						) || 0,
					Beirut:
						parseFloat(
							document.getElementById("editBeirut").value,
						) || 0,
					Bekaa:
						parseFloat(
							document.getElementById("editBekaa").value,
						) || 0,
					"El Nabatieh":
						parseFloat(
							document.getElementById("editNabatieh").value,
						) || 0,
					"Mount Lebanon":
						parseFloat(
							document.getElementById("editMountLebanon").value,
						) || 0,
					North:
						parseFloat(
							document.getElementById("editNorth").value,
						) || 0,
					South:
						parseFloat(
							document.getElementById("editSouth").value,
						) || 0,
				};

				setLoading(btn, true);
				try {
					const res = await fetch(`${API}/merchants/${merchantId}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ deliveryCharges }),
					});
					const data = await res.json();
					if (!res.ok)
						throw new Error(
							data.message || "Error updating charges",
						);

					// Update local array
					const m = allMerchants.find((x) => x._id === merchantId);
					if (m) m.deliveryCharges = deliveryCharges;

					showMessage(
						"chargesMessage",
						"Delivery charges updated successfully!",
						false,
					);
				} catch (err) {
					showMessage("chargesMessage", err.message, true);
				} finally {
					setLoading(btn, false);
				}
			});
	});
})();
