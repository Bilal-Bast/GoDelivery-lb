(function () {
	// Make functions globally available
	window.loadMerchants = loadMerchants;

	window.allOrders = null;
    window.filteredOrders = null;
    window.currentPage = null;
	// Action Button Switching
	const addOrderBtn = document.getElementById("addOrderBtn");
	const manualActionsBtn = document.getElementById("manualActionsBtn");
	const orderAdjustmentBtn = document.getElementById("orderAdjustmentBtn");

	const addOrderForm = document.getElementById("addOrderForm");
	const manualActionsForm = document.getElementById("manualActionsForm");
	const orderAdjustmentForm = document.getElementById("orderAdjustmentForm");

	// Tracks whichever merchant order-ID prefix is currently applied to the
	// #orderId field, so switching merchants can swap it out cleanly instead
	// of just clobbering whatever the admin already typed.
	let currentOrderIdPrefix = "";
	function applyOrderIdPrefix(newPrefix) {
		const input = document.getElementById("orderId");
		if (!input) return;
		newPrefix = newPrefix || "";
		let value = input.value || "";
		if (currentOrderIdPrefix && value.startsWith(currentOrderIdPrefix)) {
			value = value.slice(currentOrderIdPrefix.length);
		}
		currentOrderIdPrefix = newPrefix;
		input.value = newPrefix + value;
		input.dispatchEvent(new Event("input"));
	}

	function playSuccessBeep() {
		const audio = new Audio(
			"https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg",
		);
		audio.play();
	}

	function playErrorBeep() {
		const audio = new Audio(
			"https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
		);
		audio.play();
	}

	// ✅ Make them global
	window.playSuccessBeep = playSuccessBeep;
	window.playErrorBeep = playErrorBeep;
	window.loadMerchants = loadMerchants;

	function switchAction(activeBtn, activeForm) {
		// Reset all buttons
		[addOrderBtn, manualActionsBtn, orderAdjustmentBtn].forEach((btn) =>
			btn.classList.remove("active"),
		);
		// Reset all forms
		[addOrderForm, manualActionsForm, orderAdjustmentForm].forEach((form) =>
			form.classList.add("hidden"),
		);

		// Activate selected
		activeBtn.classList.add("active");
		activeForm.classList.remove("hidden");
	}

	if (addOrderBtn)
		addOrderBtn.addEventListener("click", () =>
			switchAction(addOrderBtn, addOrderForm),
		);
	if (manualActionsBtn)
		manualActionsBtn.addEventListener("click", () =>
			switchAction(manualActionsBtn, manualActionsForm),
		);
	if (orderAdjustmentBtn)
		orderAdjustmentBtn.addEventListener("click", () =>
			switchAction(orderAdjustmentBtn, orderAdjustmentForm),
		);

	// Refresh button
	const refreshBtn = document.getElementById("refreshBtn");
	if (refreshBtn) {
		refreshBtn.addEventListener("click", async () => {
			refreshBtn.style.opacity = "0.5";
			refreshBtn.style.pointerEvents = "none";
			await loadOrders();
			await loadMerchantsForFilter();
			await loadDrivers();
			refreshBtn.style.opacity = "1";
			refreshBtn.style.pointerEvents = "auto";
		});
	}

	const formButtons = [
		{
			buttonId: 'addOrderBtn',
			formId: 'addOrderForm',
		},
		{
			buttonId: 'manualActionsBtn',
			formId: 'manualActionsForm',
		},
		{
			buttonId: 'orderAdjustmentBtn',
			formId: 'orderAdjustmentForm',
		},
	];
	
	let activeForm = null;
	
	formButtons.forEach(({ buttonId, formId }) => {
		const button = document.getElementById(buttonId);
		const form = document.getElementById(formId);
	
		if (button && form) {
			button.addEventListener('click', (e) => {
				e.preventDefault();
	
				// If clicking the same button, close the form
				if (activeForm === formId && !form.classList.contains('hidden')) {
					form.classList.add('hidden');
					activeForm = null;
					return;
				}
	
				// Close any currently open form
				formButtons.forEach(({ formId: otherFormId }) => {
					const otherForm = document.getElementById(otherFormId);
					if (otherForm) {
						otherForm.classList.add('hidden');
					}
				});
	
				// Open the clicked form
				form.classList.remove('hidden');
				activeForm = formId;
	
			});
		}
	});
	
	// Optional: Close form when clicking outside (if you want this behavior)
	document.addEventListener('click', (e) => {
		const isButton = formButtons.some(({ buttonId }) => e.target.closest(`#${buttonId}`));
		const isForm = formButtons.some(({ formId }) => e.target.closest(`#${formId}`));
	
		if (!isButton && !isForm && activeForm) {
			formButtons.forEach(({ formId }) => {
				const form = document.getElementById(formId);
				if (form) form.classList.add('hidden');
			});
			activeForm = null;
		}
	});

	// Load Merchants
	async function loadMerchants() {
		console.log("loadMerchants is running");
		const merchantSelect = document.getElementById("merchantSelect");
		if (!merchantSelect) return;
		if (merchantSelect) {
			merchantSelect.addEventListener("change", updateDeliveryCharge);
		}

		try {
			const response = await fetch(
				`${API_BASE_URL}/merchants?ts=${Date.now()}`,
			);
			const result = await response.json();
			const merchants = result.data || result;

			merchantSelect.innerHTML =
				'<option value="">Select Merchant</option>';

			merchants.forEach((merchant) => {
				const option = document.createElement("option");
				option.value = merchant.username;
				option.textContent =
					`${merchant.firstName || merchant.username} ${merchant.lastName || ""}`.trim();

				merchantSelect.appendChild(option);
			});
		} catch (error) {
			console.error("Error loading merchants:", error);
		}
	}
	document.addEventListener("DOMContentLoaded", () => {
		const orderIdInput = document.getElementById("orderIdInput");
		if (orderIdInput) {
			orderIdInput.addEventListener("change", () =>
				fetchAndRenderTimeline(orderIdInput.value),
			);
		}
	});

	// CONFIGURATION
	const API_BASE_URL = "/api";
	const districtToCityMap = {
		Beirut: "Beirut",
		"Mount Lebanon - Baabda": "Mount Lebanon",
		"Mount Lebanon - Aley": "Mount Lebanon",
		"Mount Lebanon - Chouf": "Mount Lebanon",
		"Mount Lebanon - Keserwan": "Mount Lebanon",
		"Mount Lebanon - Jbeil": "Mount Lebanon",
		"Mount Lebanon - Matn": "Mount Lebanon",
		"North Lebanon - Tripoli": "North",
		"North Lebanon - Koura": "North",
		"North Lebanon - Zgharta": "North",
		"North Lebanon - Bcharri": "North",
		"North Lebanon - Batroun": "North",
		"North Lebanon - Minieh-Danniyeh": "North",
		"South Lebanon - Sidon": "South",
		"South Lebanon - Tyre": "South",
		"South Lebanon - Jezzine": "South",
		"Bekaa - Zahle": "Bekaa",
		"Bekaa - West Bekaa": "Bekaa",
		"Bekaa - Rashaya": "Bekaa",
		"Bekaa - Baalbek El Hermel": "Baalbek-Hermel",
		Nabatieh: "El Nabatieh",
		Akkar: "Akkar",
	};

	//  API FUNCTIONS
	async function fetchMerchants() {
		try {
			const response = await fetch(`${API_BASE_URL}/merchants`);
			if (!response.ok) {
				throw new Error("Failed to fetch merchants");
			}
			const result = await response.json();
			const merchants = result.data || result;
			console.log("Raw merchants data from server:", merchants);
			return merchants;
		} catch (error) {
			console.error("Error fetching merchants:", error);
			return [];
		}
	}

	async function fetchMerchantDetails(merchantIdentifier) {
		try {
			console.log("Fetching merchant details for:", merchantIdentifier);

			let response = await fetch(
				`${API_BASE_URL}/merchants/${merchantIdentifier}`,
			);

			if (!response.ok) {
				console.log("Trying query parameter endpoint...");
				response = await fetch(
					`${API_BASE_URL}/merchants?username=${merchantIdentifier}`,
				);
			}

			if (!response.ok) {
				throw new Error(
					`Failed to fetch merchant details: ${response.status}`,
				);
			}

			const data = await response.json();
			console.log("Merchant details received:", data);

			if (Array.isArray(data) && data.length > 0) {
				return data[0];
			}

			return data;
		} catch (error) {
			console.error("Error fetching merchant details:", error);
			return null;
		}
	}

	async function fetchLocations() {
		try {
			const response = await fetch(`${API_BASE_URL}/locations`);
			if (!response.ok) {
				throw new Error("Failed to fetch locations");
			}
			const result = await response.json();
			return result.data || result;
		} catch (error) {
			console.error("Error fetching locations:", error);
			return [];
		}
	}

	//  FUNCTION TO FLATTEN LOCATIONS WITH CITIES
	function getAllLocationsWithCities(locations) {
		const allLocations = [];

		locations.forEach((district) => {
			const districtNameEn = district.district?.en || "Unknown";
			const districtNameAr = district.district?.ar || districtNameEn;
			const mainCity = districtToCityMap[districtNameEn] || "";

			// Add the district itself as an option (show both English and Arabic)
			allLocations.push({
				displayName: `${districtNameEn} / ${districtNameAr}`,
				district: districtNameEn,
				cityName: districtNameEn,
				city: mainCity,
				type: "district",
				searchText: `${districtNameEn} ${districtNameAr}`.toLowerCase(),
			});

			// Add all cities in this district
			if (district.cities && Array.isArray(district.cities)) {
				district.cities.forEach((city) => {
					const cityNameEn = city.en || city.name || "Unknown";
					const cityNameAr = city.ar || cityNameEn;

					allLocations.push({
						displayName: `${cityNameEn} / ${cityNameAr} (${districtNameEn})`,
						district: districtNameEn,
						cityName: cityNameEn,
						city: mainCity,
						type: "city",
						searchText:
							`${cityNameEn} ${cityNameAr} ${districtNameEn} ${districtNameAr}`.toLowerCase(),
					});
				});
			}
		});

		return allLocations;
	}

	//  DELIVERY CHARGE FUNCTIONS
	async function autoFillDeliveryCharge() {
		const merchantSelect = document.getElementById("merchantSelect");
		const selectedLocationInput =
			document.getElementById("selectedLocation");
		const deliveryChargeInput = document.getElementById("deliveryCharge");

		if (!merchantSelect || !deliveryChargeInput || !selectedLocationInput)
			return;

		const selectedMerchantUsername = merchantSelect.value;
		const selectedDistrict = selectedLocationInput.value;

		console.log("Selected merchant:", selectedMerchantUsername);
		console.log("Selected district:", selectedDistrict);

		if (!selectedMerchantUsername || !selectedDistrict) return;

		deliveryChargeInput.disabled = true;
		deliveryChargeInput.style.opacity = "0.7";

		try {
			const merchant = merchants.find(
				(m) => m.username === selectedMerchantUsername,
			);
			console.log("Merchant data received:", merchant);

			if (merchant) {
				const deliveryCharges =
					merchant.deliveryCharges ||
					merchant.delivery_charges ||
					merchant.charges ||
					merchant.shippingRates ||
					merchant.shipping_rates ||
					{};

				console.log("Delivery charges object:", deliveryCharges);

				const mainCity = districtToCityMap[selectedDistrict];
				console.log("Mapped to main city:", mainCity);

				if (mainCity && deliveryCharges) {
					let charge = deliveryCharges[mainCity];

					if (charge === undefined) {
						const normalizedKey = mainCity.replace(/\s+/g, "");
						charge = deliveryCharges[normalizedKey];
					}

					if (charge === undefined) {
						const underscoredKey = mainCity.replace(/\s+/g, "_");
						charge = deliveryCharges[underscoredKey];
					}

					charge = charge || 0;

					deliveryChargeInput.value = charge;
					console.log(
						`Mapped ${selectedDistrict} to ${mainCity}, charge: ${charge}`,
					);
				} else {
					console.warn(
						`No mapping found for district: ${selectedDistrict}`,
					);
					deliveryChargeInput.value = "0";
				}
			} else {
				console.warn("Merchant not found");
				deliveryChargeInput.value = "0";
			}
		} catch (error) {
			console.error("Error auto-filling delivery charge:", error);
			deliveryChargeInput.value = "0";
		} finally {
			deliveryChargeInput.disabled = false;
			deliveryChargeInput.style.opacity = "1";
		}
	}

	function updateDeliveryCharge() {
		console.log("updateDeliveryCharge called");
		const merchantSelect = document.getElementById("merchantSelect");
		const selectedMerchant = merchants.find((m) => m.username === merchantSelect?.value);
		applyOrderIdPrefix(selectedMerchant?.orderIdPrefix || "");
		autoFillDeliveryCharge();
	}

	//  UI POPULATION FUNCTIONS
	async function loadMerchants() {
		console.log("loadMerchants is running");
		const merchantSelect = document.getElementById("merchantSelect");

		if (!merchantSelect) return;

		merchantSelect.innerHTML =
			'<option value="">Loading merchants...</option>';
		merchantSelect.disabled = true;

		try {
			const merchants = await fetchMerchants();
			console.log("Merchants loaded:", merchants);

			merchantSelect.innerHTML =
				'<option value="">Select Merchant</option>';
			merchantSelect.disabled = false;

			if (merchants.length === 0) {
				merchantSelect.innerHTML =
					'<option value="">No merchants available</option>';
				return;
			}

			merchants.forEach((merchant) => {
				const option = document.createElement("option");
				option.value =
					merchant.username ||
					merchant._id ||
					merchant.id ||
					merchant.email;
				option.textContent =
					merchant.businessName ||
					merchant.username ||
					merchant.name ||
					merchant.email;
				merchantSelect.appendChild(option);
			});

			merchantSelect.addEventListener("change", updateDeliveryCharge);
			console.log("Merchant select event listener added");
		} catch (error) {
			console.error("Error populating merchants:", error);
			merchantSelect.innerHTML =
				'<option value="">Error loading merchants</option>';
			merchantSelect.disabled = false;
		}
	}

	// Country Codes
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
		{ code: "+225", name: "Côte d’Ivoire", flag: "🇨🇮", regex: /^\d{10}$/ },
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

	// Country Code Selector
	const countryDisplay = document.getElementById("countryDisplay");
	const countrySearch = document.getElementById("countrySearch");
	const countryDropdown = document.getElementById("countryDropdown");
	const countryCode = document.getElementById("countryCode");
	const countryFlag = document.getElementById("countryFlag");
	const countryName = document.getElementById("countryName");

	function flagEmojiToIso2(flagEmoji) {
		return Array.from(flagEmoji)
			.map((c) => String.fromCharCode(c.codePointAt(0) - 0x1f1e6 + 65))
			.join("")
			.toLowerCase();
	}

	let countryHighlightedIndex = -1;
	let currentFilteredCountries = [];

	function selectCountry(country) {
		const iso2 = flagEmojiToIso2(country.flag);
		countryCode.value = country.code;
		countryFlag.src = `https://flagcdn.com/24x18/${iso2}.png`;
		countryFlag.alt = iso2.toUpperCase();
		countryName.textContent = country.name;
		countryDropdown.style.display = "none";
		countrySearch.style.display = "none";
		countryDisplay.style.display = "flex";
	}

	function setCountryHighlighted(index) {
		const items = countryDropdown.querySelectorAll(".country-option");
		items.forEach((el) => (el.style.background = "transparent"));
		if (index >= 0 && index < items.length) {
			items[index].style.background = "#333";
			items[index].scrollIntoView({ block: "nearest" });
		}
		countryHighlightedIndex = index;
	}

	function renderCountryOptions(filter = "") {
		if (!countryDropdown) return;
		countryDropdown.innerHTML = "";
		countryHighlightedIndex = -1;

		const search = filter.trim().toLowerCase();
		const filtered = countryCodes.filter(
			(c) => c.name.toLowerCase().includes(search) || c.code.includes(search),
		);
		currentFilteredCountries = filtered;

		if (filtered.length === 0) {
			countryDropdown.innerHTML =
				'<div style="padding:10px;color:#888;">No countries found</div>';
			return;
		}

		filtered.forEach((country, i) => {
			const item = document.createElement("div");
			item.className = "country-option";
			item.style.padding = "10px";
			item.style.cursor = "pointer";
			item.style.display = "flex";
			item.style.alignItems = "center";
			item.style.gap = "10px";
			item.style.borderBottom = "1px solid #333";
			const iso2 = flagEmojiToIso2(country.flag);
			item.innerHTML = `<img src="https://flagcdn.com/24x18/${iso2}.png" alt="${iso2.toUpperCase()}" style="width:24px;height:18px;"> <span>${country.name} (${country.code})</span>`;
			item.addEventListener("mouseenter", () => setCountryHighlighted(i));
			item.onclick = () => selectCountry(country);
			countryDropdown.appendChild(item);
		});
	}

	if (countryDisplay) {
		countryDisplay.addEventListener("click", () => {
			countryDisplay.style.display = "none";
			countrySearch.style.display = "block";
			// Clear whatever was typed last time so reopening always starts
			// from a clean slate instead of a stale filter.
			countrySearch.value = "";
			countrySearch.focus();
			countryDropdown.style.display = "block";
			renderCountryOptions();
		});

		countrySearch.addEventListener("input", (e) => {
			renderCountryOptions(e.target.value);
		});

		countrySearch.addEventListener("keydown", (e) => {
			const items = countryDropdown.querySelectorAll(".country-option");
			if (!items.length) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				setCountryHighlighted((countryHighlightedIndex + 1) % items.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setCountryHighlighted(
					(countryHighlightedIndex - 1 + items.length) % items.length,
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				// No arrow-key selection yet? Enter still picks the top match
				// so "type + Enter" is enough on its own.
				const index = countryHighlightedIndex >= 0 ? countryHighlightedIndex : 0;
				const country = currentFilteredCountries[index];
				if (country) selectCountry(country);
			} else if (e.key === "Escape") {
				countryDropdown.style.display = "none";
				countrySearch.style.display = "none";
				countryDisplay.style.display = "flex";
			}
		});

		document.addEventListener("click", (e) => {
			if (!e.target.closest(".country-selector")) {
				countryDropdown.style.display = "none";
				countrySearch.style.display = "none";
				countryDisplay.style.display = "flex";
			}
		});
	}

	// Lebanon Locations Data
	const locationSearch = document.getElementById("locationSearch");
	const locationDropdown = document.getElementById("locationDropdown");
	const selectedLocation = document.getElementById("selectedLocation");
	const selectedCity = document.getElementById("selectedCity");

	let allLocations = [];

	/* Load locations — prefer SSR data, fall back to API */
	function loadLocations() {
		const locationData = (window.__INIT_DATA__ || {}).locations || [];
		allLocations = [];
		locationData.forEach((loc) => {
			if (loc.cities) {
				loc.cities.forEach((city) => {
					allLocations.push({
						districtEn: loc.district?.en || loc.district,
						districtAr: loc.district?.ar || "",
						cityEn: city.en,
						cityAr: city.ar || "",
					});
				});
			}
		});
		if (!allLocations.length) {
			fetch(`${API_BASE_URL}/locations`)
				.then((r) => r.json())
				.then((locations) => {
					locations.forEach((loc) => {
						if (loc.cities) {
							loc.cities.forEach((city) => {
								allLocations.push({
									districtEn:
										loc.district?.en || loc.district,
									districtAr: loc.district?.ar || "",
									cityEn: city.en,
									cityAr: city.ar || "",
								});
							});
						}
					});
				})
				.catch(() => {
					if (locationDropdown) {
						locationDropdown.innerHTML =
							'<div class="no-results">Failed to load locations</div>';
					}
				});
		}
	}

	let highlightedIndex = -1;
	let currentFilteredLocations = [];

	function selectLocation(loc) {
		locationSearch.value = `${loc.cityEn}, ${loc.districtEn}`;
		selectedLocation.value = loc.districtEn;
		selectedCity.value = loc.cityEn;
		locationDropdown.classList.remove("show");
		updateDeliveryCharge();
	}

	function setHighlighted(index) {
		const items = locationDropdown.querySelectorAll(".dropdown-item");
		items.forEach((el) => el.classList.remove("highlighted"));
		if (index >= 0 && index < items.length) {
			items[index].classList.add("highlighted");
			items[index].scrollIntoView({ block: "nearest" });
		}
		highlightedIndex = index;
	}

	/* Render filtered locations */
	function renderLocationOptions(filter = "") {
		if (!locationDropdown) return;

		locationDropdown.innerHTML = "";
		locationDropdown.classList.add("show");
		highlightedIndex = -1;

		const search = filter.trim().toLowerCase();

		const filtered = allLocations.filter((loc) => {
			return (
				loc.cityEn.toLowerCase().includes(search) ||
				loc.cityAr.includes(filter) ||
				loc.districtEn.toLowerCase().includes(search) ||
				loc.districtAr.includes(filter)
			);
		});

		currentFilteredLocations = filtered;

		if (filtered.length === 0) {
			locationDropdown.innerHTML =
				'<div class="no-results">No locations found</div>';
			return;
		}

		filtered.forEach((loc) => {
			const item = document.createElement("div");
			item.className = "dropdown-item";
			item.innerHTML = `
            <span class="city">${loc.cityEn} / ${loc.cityAr}</span>
            <span class="district">${loc.districtEn} / ${loc.districtAr}</span>
        `;

			item.onclick = () => selectLocation(loc);

			locationDropdown.appendChild(item);
		});
	}

	/* Event listeners */
	if (locationSearch) {
		locationSearch.addEventListener("focus", () => {
			// Select the current value so a keystroke (or Delete) replaces it
			// outright instead of having to clear it by hand first.
			locationSearch.select();
			renderLocationOptions(locationSearch.value);
		});
		locationSearch.addEventListener("input", (e) =>
			renderLocationOptions(e.target.value),
		);

		locationSearch.addEventListener("keydown", (e) => {
			const items = locationDropdown.querySelectorAll(".dropdown-item");
			if (!items.length || !locationDropdown.classList.contains("show"))
				return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlighted((highlightedIndex + 1) % items.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlighted(
					(highlightedIndex - 1 + items.length) % items.length,
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				const index = highlightedIndex >= 0 ? highlightedIndex : 0;
				const loc = currentFilteredLocations[index];
				if (loc) selectLocation(loc);
			} else if (e.key === "Escape") {
				locationDropdown.classList.remove("show");
			}
		});

		document.addEventListener("click", (e) => {
			if (
				!e.target.closest("#locationSearch") &&
				!e.target.closest("#locationDropdown")
			) {
				locationDropdown.classList.remove("show");
			}
		});
	}

	// Searchable <select> — types into a text box to filter a native select's
	// options, without touching how the select itself is populated or read
	// elsewhere (value/change listeners keep working unchanged). Options are
	// read live from the select each time so it stays in sync no matter when
	// or how often the caller repopulates it.
	function initSearchableSelect(selectId, searchInputId, dropdownId) {
		const select = document.getElementById(selectId);
		const searchInput = document.getElementById(searchInputId);
		const dropdown = document.getElementById(dropdownId);
		if (!select || !searchInput || !dropdown) return;

		let highlightedIndex = -1;
		let currentFiltered = [];

		function getOptions() {
			return Array.from(select.options).filter((o) => o.value !== "");
		}

		function syncDisplay() {
			const selected = select.options[select.selectedIndex];
			searchInput.value = selected && selected.value ? selected.textContent : "";
		}

		function selectOption(opt) {
			select.value = opt.value;
			searchInput.value = opt.textContent;
			dropdown.classList.remove("show");
			select.dispatchEvent(new Event("change", { bubbles: true }));
		}

		function setHighlighted(index) {
			const items = dropdown.querySelectorAll(".dropdown-item");
			items.forEach((el) => el.classList.remove("highlighted"));
			if (index >= 0 && index < items.length) {
				items[index].classList.add("highlighted");
				items[index].scrollIntoView({ block: "nearest" });
			}
			highlightedIndex = index;
		}

		function render(filter = "") {
			dropdown.innerHTML = "";
			dropdown.classList.add("show");
			highlightedIndex = -1;

			const search = filter.trim().toLowerCase();
			const filtered = getOptions().filter((o) =>
				o.textContent.toLowerCase().includes(search),
			);
			currentFiltered = filtered;

			if (filtered.length === 0) {
				dropdown.innerHTML = '<div class="no-results">No matches found</div>';
				return;
			}

			filtered.forEach((opt) => {
				const item = document.createElement("div");
				item.className = "dropdown-item";
				item.textContent = opt.textContent;
				item.onclick = () => selectOption(opt);
				dropdown.appendChild(item);
			});
		}

		searchInput.addEventListener("focus", () => {
			// Select the current text so typing/Delete immediately replaces it —
			// lets you swap the picked driver/merchant without touching the mouse.
			searchInput.select();
			render(searchInput.value);
		});
		searchInput.addEventListener("input", (e) => render(e.target.value));
		searchInput.addEventListener("keydown", (e) => {
			const items = dropdown.querySelectorAll(".dropdown-item");
			if (!items.length || !dropdown.classList.contains("show")) return;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlighted((highlightedIndex + 1) % items.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlighted((highlightedIndex - 1 + items.length) % items.length);
			} else if (e.key === "Enter") {
				e.preventDefault();
				const index = highlightedIndex >= 0 ? highlightedIndex : 0;
				const opt = currentFiltered[index];
				if (opt) selectOption(opt);
			} else if (e.key === "Escape") {
				dropdown.classList.remove("show");
			}
		});

		document.addEventListener("click", (e) => {
			if (
				!e.target.closest(`#${searchInputId}`) &&
				!e.target.closest(`#${dropdownId}`)
			) {
				dropdown.classList.remove("show");
				syncDisplay();
			}
		});

		// Keep the search box in sync if the select's value changes from
		// elsewhere in the app (e.g. a preselected merchant on page load).
		select.addEventListener("change", syncDisplay);
		syncDisplay();
	}

	initSearchableSelect("merchantSelect", "merchantSearch", "merchantDropdown");

	// Exchange toggle functionality
	const exchangeToggle = document.getElementById("exchangeToggle");
	const exchangeStatus = document.getElementById("exchangeStatus");

	if (exchangeToggle && exchangeStatus) {
		exchangeToggle.addEventListener("change", function () {
			if (this.checked) {
				exchangeStatus.textContent = "On";
				exchangeStatus.classList.remove("off");
				exchangeStatus.classList.add("on");
			} else {
				exchangeStatus.textContent = "Off";
				exchangeStatus.classList.remove("on");
				exchangeStatus.classList.add("off");
			}
		});
	}

	/* Initialize */
	document.addEventListener("DOMContentLoaded", loadLocations);

	// Form Submission
	const submitBtn = document.getElementById("submitOrder");
	const orderMessage = document.getElementById("orderMessage");

	function showMessage(message, isError = false) {
		orderMessage.textContent = message;
		orderMessage.className = `message ${isError ? "error" : "success"}`;
		orderMessage.style.display = "block";

		setTimeout(() => {
			orderMessage.style.display = "none";
		}, 4000);
	}

	if (submitBtn) {
		submitBtn.addEventListener("click", async () => {
			// Get form values
			const merchant = document
				.getElementById("merchantSelect")
				.value.trim();
			const orderId = document.getElementById("orderId").value.trim();
			const firstName = document.getElementById("firstName").value.trim();
			const lastName = document.getElementById("lastName").value.trim();
			const phone = document.getElementById("phoneNumber").value.trim();
			const selectedCountryCode =
				document.getElementById("countryCode").value;
			const district = document.getElementById("selectedLocation").value;
			const city = document.getElementById("selectedCity").value;
			const totalPrice = document
				.getElementById("totalPrice")
				.value.trim();
			const deliveryCharge = document
				.getElementById("deliveryCharge")
				.value.trim();

			// ✅ UPDATED VALIDATION - Removed totalPrice and deliveryCharge from required check
			// Now they can be any number (negative, zero, or positive)
			if (
				!merchant ||
				!orderId ||
				!firstName ||
				!phone ||
				!district ||
				!city
			) {
				showMessage("Please fill in all required fields", true);
				return;
			}

			// ✅ NEW: Validate that price fields are valid numbers (but allow 0, negative, etc)
			let totalPriceNum = 0;
			let deliveryChargeNum = 0;

			// Parse total price - allow any number including 0, negative
			if (totalPrice) {
				totalPriceNum = parseFloat(totalPrice);
				if (isNaN(totalPriceNum)) {
					showMessage("Total price must be a valid number", true);
					return;
				}
			}

			// Parse delivery charge - allow any number including 0, negative
			if (deliveryCharge) {
				deliveryChargeNum = parseFloat(deliveryCharge);
				if (isNaN(deliveryChargeNum)) {
					showMessage("Delivery charge must be a valid number", true);
					return;
				}
			}

			// Phone validation
			const selectedCountry = countryCodes.find(
				(c) => c.code === selectedCountryCode,
			);
			const phonePattern =
				selectedCountry && selectedCountry.regex
					? selectedCountry.regex
					: /^\d{7,15}$/;
			const cleanPhone = phone.replace(/\D/g, "");

			if (!phonePattern.test(cleanPhone)) {
				showMessage(
					`Invalid phone number format for ${selectedCountry ? selectedCountry.name : "selected country"}`,
					true,
				);
				return;
			}

			const exchangeToggleEl = document.getElementById("exchangeToggle");
			const exchangeValue = exchangeToggleEl
				? exchangeToggleEl.checked
				: false;

			const order = {
				id: orderId,
				m: merchant,
				c: {
					f: firstName,
					l: lastName,
					p: `${selectedCountryCode} ${phone}`,
					loc: {
						d: district,
						cty: city,
					},
				},
				pr: {
					t: totalPriceNum,  // ✅ Can be negative, zero, or positive
					d: deliveryChargeNum,  // ✅ Can be negative, zero, or positive
				},
				e: exchangeValue,
				s: 0,
				cb: (window.__CURRENT_USER__ || {}).username || "admin",
			};

			// Submit via API without reloading the page
			submitBtn.disabled = true;
			try {
				const response = await fetch(`${API_BASE_URL}/orders`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(order),
				});

				const result = await response.json().catch(() => ({}));

				// ✅ LOG THE ACTUAL ERROR FROM BACKEND
				console.log("Backend Response Status:", response.status);
				console.log("Backend Response Body:", result);
				console.log("Order Sent:", order);

				if (!response.ok) {
					// Show detailed error message
					const errorMsg = result.message || result.error || JSON.stringify(result) || "Failed to create order";
					throw new Error(errorMsg);
				}

				playSuccessBeep();
				showMessage("Order created successfully");

				[
					"orderId",
					"firstName",
					"lastName",
					"phoneNumber",
					"locationSearch",
					"selectedLocation",
					"selectedCity",
					"totalPrice",
					"deliveryCharge",
				].forEach((id) => {
					const field = document.getElementById(id);
					if (field) field.value = "";
				});
				// Merchant stays selected for the next order — restore their
				// order-ID prefix instead of leaving it blank.
				const orderIdField = document.getElementById("orderId");
				if (orderIdField) orderIdField.value = currentOrderIdPrefix;

				const exchangeToggle = document.getElementById("exchangeToggle");
				if (exchangeToggle) exchangeToggle.checked = false;
				const exchangeStatus = document.getElementById("exchangeStatus");
				if (exchangeStatus) exchangeStatus.textContent = "Off";

				document.getElementById("phoneNumber")?.focus();

				// Show the new order straight from the create response instead of
				// refetching every page — loadOrders() walks the whole dataset.
				if (!insertLocalOrder(result.order)) {
					loadOrders();
				}
			} catch (error) {
				console.error("Error submitting order form:", error);
				playErrorBeep();
				showMessage(
					error.message || "Failed to submit order. Please try again.",
					true,
				);
			} finally {
				submitBtn.disabled = false;
			}
		});
	}

	// Enhanced version with better UX
	function setupPhoneNumberListener() {
		const phoneInput = document.getElementById("phoneNumber");
		const countryCode = document.getElementById("countryCode");
		const firstNameInput = document.getElementById("firstName");
		const lastNameInput = document.getElementById("lastName");
		const locationSearch = document.getElementById("locationSearch");

		let timeoutId;
		let lastCheckedPhone = "";

		// Add loading indicator
		const loadingIndicator = document.createElement("span");
		loadingIndicator.className = "phone-loading";
		loadingIndicator.innerHTML = "🔍 Checking...";
		loadingIndicator.style.display = "none";
		loadingIndicator.style.marginLeft = "10px";
		loadingIndicator.style.color = "#666";
		phoneInput.parentNode.appendChild(loadingIndicator);

		// Add auto-filled badge
		const autoFilledBadge = document.createElement("span");
		autoFilledBadge.className = "auto-filled-badge";
		autoFilledBadge.innerHTML = "✓ Auto-filled";
		autoFilledBadge.style.display = "none";
		autoFilledBadge.style.marginLeft = "10px";
		autoFilledBadge.style.color = "green";
		autoFilledBadge.style.fontSize = "12px";
		phoneInput.parentNode.appendChild(autoFilledBadge);

		async function handlePhoneChange() {
			clearTimeout(timeoutId);

			const fullPhone = `${countryCode.value} ${phoneInput.value.trim()}`;

			if (phoneInput.value.length < 8 || fullPhone === lastCheckedPhone) {
				return;
			}

			// Show loading
			loadingIndicator.style.display = "inline";
			autoFilledBadge.style.display = "none";

			timeoutId = setTimeout(async () => {
				try {
					const customer = await checkExistingCustomer(fullPhone);

					if (customer) {
						// Store original values to detect changes
						const originalFirstName = firstNameInput.value;
						const originalLastName = lastNameInput.value;
						const originalLocation = locationSearch.value;

						// Only auto-fill if fields are empty
						let filled = false;

						if (!originalFirstName && customer.firstName) {
							firstNameInput.value = customer.firstName || "";
							filled = true;
						}

						if (!originalLastName && customer.lastName) {
							lastNameInput.value = customer.lastName || "";
							filled = true;
						}

						if (
							!originalLocation &&
							customer.location &&
							customer.location.district
						) {
							locationSearch.value = customer.location.district;
							document.getElementById("selectedLocation").value =
								customer.location.district;
							document.getElementById("selectedCity").value =
								customer.location.city ||
								customer.location.district;
							filled = true;
						}

						if (filled) {
							autoFilledBadge.style.display = "inline";
							lastCheckedPhone = fullPhone;

							// Hide badge after 3 seconds
							setTimeout(() => {
								autoFilledBadge.style.display = "none";
							}, 3000);
						}
					}
				} catch (error) {
					console.error("Error checking customer:", error);
				} finally {
					loadingIndicator.style.display = "none";
				}
			}, 500);
		}

		phoneInput.addEventListener("input", handlePhoneChange);
		countryCode.addEventListener("change", handlePhoneChange);

		// Clear auto-filled badge when user manually changes fields
		[firstNameInput, lastNameInput, locationSearch].forEach((input) => {
			input.addEventListener("input", () => {
				autoFilledBadge.style.display = "none";
			});
		});
	}

	let allOrders = [];
	let filteredOrders = [];
	let merchants = [];
	let drivers = [];

	// Status mapping
	const STATUS_NAMES = [
		"Warehouse",
		"New",
		"Picked Up",
		"Delivered",
		"Cancelled",
		"Paid",
		"Collected",
	];

	// For cancelled orders (s === 4), show who cancelled. Returns null for
	// non-cancelled orders so callers fall back to the plain status name.
	function cancelledStatusLabel(order) {
		if (order?.s !== 4) return null;
		if (order.cancelledBy === "customer") return "Cancelled by Customer";
		if (order.cancelledBy === "merchant") return "Cancelled by Merchant";
		return "Cancelled";
	}
	const STATUS_CLASSES = [
		"warehouse",
		"new",
		"picked",
		"delivered",
		"cancelled",
		"paid",
		"collected",
	];

	// Pagination
	let currentPage = 1;
	const ordersPerPage = 25;

	// Load initial data from SSR; fall back to API on refresh
	document.addEventListener("DOMContentLoaded", () => {
		const initData = window.__INIT_DATA__ || {};

		if (initData.merchants) {
			merchants = initData.merchants;
			populateMerchantSelectFromData(merchants);
		} else {
			loadMerchants();
		}

		if (initData.drivers) {
			drivers = initData.drivers;
			populateDriverFilterFromData(drivers);
		} else {
			loadDrivers();
		}

		if (initData.orders) {
			allOrders = initData.orders;
			applyFilters();
		} else {
			loadOrders();
		}
	});

	function populateMerchantSelectFromData(merchantList) {
		const merchantSel = document.getElementById("merchantSelect");
		const merchantFilter = document.getElementById("merchantFilter");
		if (merchantSel) {
			merchantSel.innerHTML = '<option value="">Select Merchant</option>';
			merchantList.forEach((m) => {
				const opt = document.createElement("option");
				opt.value = m.username;
				opt.textContent =
					`${m.firstName || m.username} ${m.lastName || ""}`.trim();
				merchantSel.appendChild(opt);
			});
			merchantSel.addEventListener("change", updateDeliveryCharge);
		}
		if (merchantFilter) {
			merchantFilter.innerHTML =
				'<option value="">All Merchants</option>';
			merchantList.forEach((m) => {
				const opt = document.createElement("option");
				opt.value = m.username;
				opt.textContent = m.username;
				merchantFilter.appendChild(opt);
			});
		}
	}

	function populateDriverFilterFromData(driverList) {
		const driverFilter = document.getElementById("driverFilter");
		if (!driverFilter) return;
		driverFilter.innerHTML = '<option value="">All Drivers</option>';
		driverList.forEach((d) => {
			const opt = document.createElement("option");
			opt.value = d.username || d.id;
			opt.textContent =
				`${d.firstName || ""} ${d.lastName || ""}`.trim() || d.username;
			driverFilter.appendChild(opt);
		});
	}

	//load merchants
	async function loadMerchantsForFilter() {
		try {
			let allFetchedMerchants = [];
			let page = 1;
			let totalPages = 1;
	
			while (page <= totalPages) {
				const response = await fetch(`${API_BASE_URL}/merchants?page=${page}&limit=100`);
				const result = await response.json();
				const pageData = result.data || result;
				
				if (!Array.isArray(pageData) || pageData.length === 0) break;
				
				allFetchedMerchants = allFetchedMerchants.concat(pageData);
				
				if (result.pagination) {
					totalPages = result.pagination.pages;
				}
				
				page++;
			}
	
			merchants = allFetchedMerchants;
	
			const select = document.getElementById("merchantFilter");
			if (!select) return;
			
			select.innerHTML = '<option value="">All Merchants</option>';
			merchants.forEach((merchant) => {
				const option = document.createElement("option");
				option.value = merchant.username;
				option.textContent = merchant.businessName || merchant.username;
				select.appendChild(option);
			});
		} catch (error) {
			console.error("Error loading merchants:", error);
		}
	}

	// Load drivers
	async function loadDrivers() {
		try {
			let allFetchedDrivers = [];
			let page = 1;
			let totalPages = 1;
	
			while (page <= totalPages) {
				const response = await fetch(`${API_BASE_URL}/drivers?page=${page}&limit=100`);
				const result = await response.json();
				const pageData = result.data || result;
				
				if (!Array.isArray(pageData) || pageData.length === 0) break;
				
				allFetchedDrivers = allFetchedDrivers.concat(pageData);
				
				if (result.pagination) {
					totalPages = result.pagination.pages;
				}
				
				page++;
			}
	
			drivers = allFetchedDrivers;
	
			const select = document.getElementById("driverFilter");
			if (!select) return;
			
			select.innerHTML = '<option value="">All Drivers</option>';
			drivers.forEach((driver) => {
				const option = document.createElement("option");
				option.value = driver.id;
				option.textContent = driver.name;
				select.appendChild(option);
			});
		} catch (error) {
			console.error("Error loading drivers:", error);
		}
	}

	// Load orders
	function showOrdersLoading(message = "Loading orders...") {
		const tbody = document.getElementById("ordersTableBody");
		if (!tbody) return;

		tbody.innerHTML = `
			<tr>
				<td colspan="15" class="loading">${message}</td>
			</tr>
		`;
	}

	async function loadOrders() {
		try {
			showOrdersLoading("Loading all orders...");
			
			let allFetchedOrders = [];
			let page = 1;
			let totalPages = 1;
	
			// Fetch all pages
			while (page <= totalPages) {
				const response = await fetch(`${API_BASE_URL}/orders?page=${page}&limit=100`);
				const result = await response.json();
				
				// Extract orders from response
				const pageOrders = result.data || result;
				
				if (!Array.isArray(pageOrders) || pageOrders.length === 0) {
					break;
				}
				
				allFetchedOrders = allFetchedOrders.concat(pageOrders);
				
				// Get total pages from pagination info
				if (result.pagination) {
					totalPages = result.pagination.pages;
				}
				
				page++;
			}
			
			allOrders = allFetchedOrders;
			console.log(`✓ Loaded ${allOrders.length} orders total`);
			applyDeepLinkFilters();
			applyFilters();
			
		} catch (error) {
			console.error("Error loading orders:", error);
			document.getElementById("ordersTableBody").innerHTML = `
				<tr>
					<td colspan="15" class="error-message">Failed to load orders</td>
				</tr>
			`;
		}
	}

	// Pre-fill the filter bar from the URL so the admin dashboard can deep-link
	// straight to a slice of orders (e.g. /orders?status=3, /orders?search=GD1042).
	// Only runs once, on the first load after arriving with query params.
	let deepLinkApplied = false;
	function applyDeepLinkFilters() {
		if (deepLinkApplied) return;
		deepLinkApplied = true;

		const params = new URLSearchParams(window.location.search);
		const status = params.get("status");
		const search = params.get("search");

		const statusEl = document.getElementById("statusFilter");
		if (statusEl && status !== null && /^[0-6]$/.test(status)) {
			statusEl.value = status;
		}

		const searchEl = document.getElementById("searchInput");
		if (searchEl && search) {
			searchEl.value = search;
		}
	}

	// Apply filters
	function applyFilters() {
		const status = document.getElementById("statusFilter").value;
		const merchant = document.getElementById("merchantFilter").value;
		const driver = document.getElementById("driverFilter").value;
		const startDate = document.getElementById("startDate").value;
		const endDate = document.getElementById("endDate").value;
		const searchTerm = document
			.getElementById("searchInput")
			.value.toLowerCase()
			.trim();
		const locationTerm = document
			.getElementById("searchLocation")
			.value.toLowerCase()
			.trim();
		const totalPriceTerm = document
			.getElementById("searchPrice")
			.value.trim();

		filteredOrders = allOrders.filter((order) => {
			// Status filter
			if (status !== "" && order.s !== parseInt(status)) return false;

			// Merchant filter
			if (merchant && order.m !== merchant) return false;

			// Driver filter
			if (driver && order.driver !== driver) return false;

			// Date range filter
			if (startDate || endDate) {
				const orderDate = new Date(order.createdAt)
					.toISOString()
					.split("T")[0];
				if (startDate && orderDate < startDate) return false;
				if (endDate && orderDate > endDate) return false;
			}

			// Search filter
			if (searchTerm) {
				const searchable = [
					order.id,
					order.c?.f,
					order.c?.l,
					order.c?.p,
					order.m,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				if (!searchable.includes(searchTerm)) return false;
			}
			if (locationTerm) {
				const location = [
					order.c?.loc?.d || "",
					order.c?.loc?.cty || "",
				]
					.join(" ")
					.toLowerCase();

				if (!location.includes(locationTerm)) return false;
			}

			// --- Total Price search
			if (totalPriceTerm) {
				const totalPrice = order.pr?.t?.toString() || "";
				if (!totalPrice.includes(totalPriceTerm)) return false;
			}

			return true;
		});

		// Update stats
		updateStats();

		// Reset to first page
		currentPage = 1;
		displayOrders();
	}

	// Update statistics
	function updateStats() {
		const total = filteredOrders.length;
		const warehouse = filteredOrders.filter((o) => o.s === 0).length;
		const newo = filteredOrders.filter((o) => o.s === 1).length;
		const picked = filteredOrders.filter((o) => o.s === 2).length;
		const delivered = filteredOrders.filter((o) => o.s === 3).length;
		const cancelled = filteredOrders.filter((o) => o.s === 4).length;
		const paid = filteredOrders.filter((o) => o.s === 5).length;

		// Total price of ALL filtered orders
		const revenue = filteredOrders.reduce(
			(sum, o) => sum + (o.pr?.t || 0),
			0,
		);

		const totalOrders = filteredOrders.reduce(
			(sum, o) => sum + ((o.pr?.t || 0) - (o.pr?.d || 0)),
			0,
		);

		const totalDeliveryCharge = filteredOrders.reduce(
			(sum, o) => sum + (o.pr?.d || 0),
			0,
		);

		document.getElementById("totalOrders").textContent = total;
		document.getElementById("pendingOrders").textContent = warehouse;
		document.getElementById("newOrders").textContent = newo;
		document.getElementById("pickedOrders").textContent = picked;
		document.getElementById("deliveredOrders").textContent = delivered;
		document.getElementById("cancelledOrders").textContent = cancelled;
		document.getElementById("paidOrders").textContent = paid;
		document.getElementById("totalRevenue").textContent = `$${revenue}`;
		document.getElementById("totalOrder").textContent = `$${totalOrders}`;
		document.getElementById("totalDeliveryCharge").textContent =
			`$${totalDeliveryCharge}`;

		// Update table total
		const filteredOrdersTotal =
			document.getElementById("filteredOrdersTotal");

		if (filteredOrdersTotal) {
			filteredOrdersTotal.textContent =
				`$${revenue.toFixed(2)}`;
		}
		const filteredOrdersWithoutDelivery = document.getElementById("filteredOrdersWithoutDelivery");
		if (filteredOrdersWithoutDelivery) {
			filteredOrdersWithoutDelivery.textContent = `$${(revenue - totalDeliveryCharge
			).toFixed(2)}`;
		}
		const filteredOrdersDeliveryCharge = document.getElementById("filteredOrdersDeliveryCharge");
		if (filteredOrdersDeliveryCharge) {
			filteredOrdersDeliveryCharge.textContent = `$${totalDeliveryCharge.toFixed(2)}`;
		}
	}

	// Display orders
	function displayOrders() {
		const start = (currentPage - 1) * ordersPerPage;
		const end = start + ordersPerPage;
		const pageOrders = filteredOrders.slice(start, end);

		const tbody = document.getElementById("ordersTableBody");

		if (pageOrders.length === 0) {
			tbody.innerHTML = `
                    <tr>
                        <td colspan="13" class="loading">No orders found</td>
                    </tr>
                `;
			return;
		}

		tbody.innerHTML = pageOrders
			.map((order) => {
				const statusIndex = order.s !== undefined ? order.s : 0;
				const statusText = cancelledStatusLabel(order) || STATUS_NAMES[statusIndex] || "Unknown";
				const statusClass = STATUS_CLASSES[statusIndex] || "unknown";

				// Calculate price without delivery
				const priceWithoutDelivery =
					(order.pr?.t || 0) - (order.pr?.d || 0);

				// Get driver name
				const driverName =
					drivers.find((d) => d.id === order.driver)?.name ||
					(order.driver
						? `Driver ID: ${order.driver}`
						: "Unassigned");

				// Format date
				const createdDate = new Date(
					order.createdAt,
				).toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
				const hasExchange = order.e === true;
				const exchangeNotes = order.eN || "";
				const district = order.c?.loc?.d || "";
				const city = order.c?.loc?.cty || "";
				const locationText =
					district && city
						? `${district}, ${city}`
						: district || city || "N/A";

				return `
                    <tr data-order-id="${order.id}">
                        <td style="text-align:center;"><input type="checkbox" class="order-chk" data-order-id="${order.id}" style="cursor:pointer; width:15px; height:15px;"></td>
                        <td><strong>#${order.id}</strong></td>
                        <td>${order.m || "N/A"}</td>
                        <td>$${priceWithoutDelivery.toFixed(2)}</td>
                        <td>$${(order.pr?.d || 0).toFixed(2)}</td>
                        <td><strong>$${(order.pr?.t || 0).toFixed(2)}</strong></td>
                        <td>
                            <span class="status-badge status-${statusClass}">${statusText}</span>
                        </td>
                        <td>
                            <span class="driver-badge">${driverName}</span>
                        </td>
                        <td>${createdDate}</td>
                        <td>${order.c?.f || ""} ${order.c?.l || ""}</td>
                        <td>
                            <a href="https://wa.me/${order.c?.p?.replace(/\s+/g, "")}" 
                            target="_blank" 
                            class="whatsapp-link"
                            title="Send WhatsApp message">
                                ${order.c?.p || "N/A"}
                            </a>
                        </td>
                        <td>${locationText}</td>
						<td class="exchange-cell ${hasExchange ? "exchange-positive" : ""}">
							${hasExchange ? "✓ Exchange" : ""}
							${exchangeNotes ? `<div class="exchange-notes">Note: ${escapeHtml(exchangeNotes)}</div>` : ""}
						</td>
						<td><svg id="barcode-${order.id}"></svg></td>
						<td>
							<div class="action-buttons2">
						        <button type="button" class="action-btn2 view-btn" data-order-action="view" data-order-id="${order.id}">View</button>
						        <button type="button" class="action-btn2 edit-btn" data-order-action="edit" data-order-id="${order.id}">Edit</button>
						        <button type="button" class="action-btn2 print-btn" data-order-action="print" data-order-id="${order.id}">Print</button>
						        <button type="button" class="action-btn2 barcode-btn" data-order-action="barcode" data-order-id="${order.id}">Barcode</button>
							</div>
						</td>
                    </tr>
                `;
			})
			.join("");

		// Wire up "Select All" checkbox
		const selectAllChk = document.getElementById("selectAllChk");
		if (selectAllChk) {
			selectAllChk.checked = false;
			selectAllChk.onchange = function () {
				document
					.querySelectorAll(".order-chk")
					.forEach((chk) => (chk.checked = this.checked));
			};
		}

		// Generate barcodes for visible orders
		pageOrders.forEach((order) => {
			const barcodeEl = document.getElementById(`barcode-${order.id}`);
			if (barcodeEl) {
				JsBarcode(`#barcode-${order.id}`, order.id, {
					format: "CODE128",
					lineColor: "#000",
					width: 2,
					height: 40,
					displayValue: true,
				});
			}
		});

		// Update pagination
		updatePagination();
	}

	// Update pagination
	function updatePagination() {
		const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

		document.getElementById("pageInfo").textContent =
			`Page ${currentPage} of ${totalPages || 1}`;
		document.getElementById("prevBtn").disabled = currentPage === 1;
		document.getElementById("nextBtn").disabled =
			currentPage === totalPages || totalPages === 0;
	}

	// Change page
	function changePage(direction) {
		const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

		if (direction === "prev" && currentPage > 1) {
			currentPage--;
		} else if (direction === "next" && currentPage < totalPages) {
			currentPage++;
		}

		displayOrders();
	}

	// Clear all filters
	function clearFilters() {
		document.getElementById("statusFilter").value = "";
		document.getElementById("merchantFilter").value = "";
		document.getElementById("driverFilter").value = "";
		document.getElementById("startDate").value = "";
		document.getElementById("endDate").value = "";
		document.getElementById("searchInput").value = "";
		document.getElementById("searchLocation").value = "";
		document.getElementById("searchPrice").value = "";
		applyFilters();
	}

	// Edit order (placeholder)
	function editOrder(orderId) {
		window.Dialog.alert(`Edit order: ${orderId} - This will open edit modal`);
		// You can implement edit modal here
	}

	// View order (placeholder)
	function viewOrder(orderId) {
		window.Dialog.alert(`View order: ${orderId} - This will show order details`);
		// You can implement view modal here
	}

	// Global variables for modal
	let currentOrderId = null;
	let currentOriginalOrder = null;
	let isEditMode = false;

	function flattenForDiff(obj, prefix = "") {
		const out = {};
		Object.entries(obj || {}).forEach(([key, value]) => {
			const path = prefix ? `${prefix}.${key}` : key;
			if (value && typeof value === "object" && !Array.isArray(value)) {
				Object.assign(out, flattenForDiff(value, path));
			} else {
				out[path] = value;
			}
		});
		return out;
	}

	function setNestedValue(obj, path, value) {
		const keys = path.split(".");
		let current = obj;

		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (!current[key] || typeof current[key] !== "object") {
				current[key] = {};
			}
			current = current[key];
		}

		current[keys[keys.length - 1]] = value;
	}

	// Build a diff containing only the fields that actually changed
	function buildOrderDiff(original, updated) {
		const originalFlat = flattenForDiff(original);
		const updatedFlat = flattenForDiff(updated);

		const diff = {};

		Object.entries(updatedFlat).forEach(([path, value]) => {
			if (path === "id") return;

			const originalValue = originalFlat[path];

			if (String(originalValue ?? "") !== String(value ?? "")) {
				setNestedValue(diff, path, value);
			}
		});

		return diff;
	}

	// Open modal for viewing
	function viewOrder(orderId) {
		console.log("Viewing order:", orderId);
		currentOrderId = orderId;
		isEditMode = false;

		const order = allOrders.find((o) => o.id === orderId);
		if (!order) {
			window.Dialog.alert("Order not found");
			return;
		}

		// Populate modal with order data
		document.getElementById("modalTitle").textContent = "View Order";
		document.getElementById("modalOrderId").value = order.id;
		document.getElementById("modalId").value = order.id;
		document.getElementById("modalMerchant").value = order.m || "";
		document.getElementById("modalStatus").value = order.s || 0;
		document.getElementById("modalFirstName").value = order.c?.f || "";
		document.getElementById("modalLastName").value = order.c?.l || "";
		document.getElementById("modalPhone").value = order.c?.p || "";
		document.getElementById("modalDistrict").value = order.c?.loc?.d || "";
		document.getElementById("modalCity").value =
			order.c?.loc?.cty || order.c?.loc?.village || "";
		document.getElementById("modalTotalPrice").value = order.pr?.t || 0;
		document.getElementById("modalDeliveryCharge").value = order.pr?.d || 0;

		const priceWithoutDelivery = (order.pr?.t || 0) - (order.pr?.d || 0);
		document.getElementById("modalPriceWithoutDelivery").value =
			priceWithoutDelivery.toFixed(2);

		document.getElementById("modalExchange").checked = order.e === true;
		document.getElementById("modalExchangeNotes").value = order.eN || "";
		document.getElementById("modalDriver").value = order.driver || "";
		document.getElementById("modalCreatedBy").value = order.cb || "";
		document.getElementById("modalCreatedAt").value = new Date(
			order.createdAt,
		).toLocaleString();

		// Set fields to readonly for view mode
		setModalFieldsReadonly(true);

		// Show modal
		document.getElementById("orderModal").style.display = "block";
	}

	// Open modal for editing
	function editOrder(orderId) {
		console.log("Editing order:", orderId);
		currentOrderId = orderId;
		isEditMode = true;

		const order = allOrders.find((o) => o.id === orderId);
		if (!order) {
			window.Dialog.alert("Order not found");
			return;
		}
		currentOriginalOrder = order;

		// Populate modal with order data
		document.getElementById("modalTitle").textContent = "Edit Order";
		document.getElementById("modalOrderId").value = order.id;
		document.getElementById("modalId").value = order.id;
		document.getElementById("modalMerchant").value = order.m || "";
		document.getElementById("modalStatus").value = order.s || 0;
		document.getElementById("modalFirstName").value = order.c?.f || "";
		document.getElementById("modalLastName").value = order.c?.l || "";
		document.getElementById("modalPhone").value = order.c?.p || "";
		document.getElementById("modalDistrict").value = order.c?.loc?.d || "";
		document.getElementById("modalCity").value =
			order.c?.loc?.cty || order.c?.loc?.village || "";
		document.getElementById("modalTotalPrice").value = order.pr?.t || 0;
		document.getElementById("modalDeliveryCharge").value = order.pr?.d || 0;

		const priceWithoutDelivery = (order.pr?.t || 0) - (order.pr?.d || 0);
		document.getElementById("modalPriceWithoutDelivery").value =
			priceWithoutDelivery.toFixed(2);

		document.getElementById("modalExchange").checked = order.e === true;
		document.getElementById("modalExchangeNotes").value = order.eN || "";
		document.getElementById("modalDriver").value = order.driver || "";
		document.getElementById("modalCreatedBy").value = order.cb || "";
		document.getElementById("modalCreatedAt").value = new Date(
			order.createdAt,
		).toLocaleString();

		// Generate modal barcode
		JsBarcode("#modalBarcode", order.id, {
			format: "CODE128",
			lineColor: "#000",
			width: 2,
			height: 50,
			displayValue: true,
		});

		// Set fields to editable for edit mode
		setModalFieldsReadonly(false);

		// Show modal
		document.getElementById("orderModal").style.display = "block";
	}

	window.editOrder = editOrder;
	window.viewOrder = viewOrder;
	window.deleteOrder = deleteOrder;
	window.closeModal = closeModal;
	window.saveOrderChanges = saveOrderChanges;

	// Helper function to set fields readonly based on mode
	function setModalFieldsReadonly(readonly) {
		const editableFields = [
			"modalStatus",
			"modalFirstName",
			"modalLastName",
			"modalPhone",
			"modalDistrict",
			"modalCity",
			"modalTotalPrice",
			"modalDeliveryCharge",
			"modalExchange",
			"modalDriver",
		];

		editableFields.forEach((fieldId) => {
			const field = document.getElementById(fieldId);
			if (field) {
				if (field.type === "checkbox") {
					field.disabled = readonly;
				} else {
					field.readOnly = readonly;
					if (readonly) {
						field.classList.add("readonly-field");
					} else {
						field.classList.remove("readonly-field");
					}
				}
			}
		});
	}

	// Save order changes
	async function saveOrderChanges() {
		if (!isEditMode || !currentOrderId) return;

		const updatedOrder = {
			id: document.getElementById("modalId").value,
			m: document.getElementById("modalMerchant").value,
			c: {
				f: document.getElementById("modalFirstName").value,
				l: document.getElementById("modalLastName").value,
				p: document.getElementById("modalPhone").value,
				loc: {
					d: document.getElementById("modalDistrict").value,
					cty: document.getElementById("modalCity").value,
				},
			},
			pr: {
				t: parseFloat(document.getElementById("modalTotalPrice").value),
				d: parseFloat(
					document.getElementById("modalDeliveryCharge").value,
				),
			},
			s: parseInt(document.getElementById("modalStatus").value),
			e: document.getElementById("modalExchange").checked,
			eN: document.getElementById("modalExchangeNotes").value.trim(),
			driver: document.getElementById("modalDriver").value || null,
			cb: document.getElementById("modalCreatedBy").value,
		};

		const diff = buildOrderDiff(currentOriginalOrder, updatedOrder);

		if (Object.keys(diff).length === 0) {
			await window.Dialog.alert("No changes to save.", { title: "Notice" });
			return;
		}

		try {
			const response = await fetch(
				`${API_BASE_URL}/orders/${currentOrderId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(diff),
				},
			);

			if (!response.ok) {
				const errBody = await response.json().catch(() => ({}));
				throw new Error(errBody.error || "Failed to update order");
			}

			const result = await response.json();
			console.log("Order updated:", result);

			await window.Dialog.alert("Order updated successfully!", { title: "Success" });
			closeModal();
			loadOrders();
		} catch (error) {
			console.error("Error updating order:", error);
			await window.Dialog.alert(error.message || "Failed to update order. Please try again.", { title: "Error", danger: true });
		}
	}

	// Delete order
	async function deleteOrder() {
		if (!currentOrderId) return;

		const confirmed = await window.Dialog.confirm(
			"Are you sure you want to delete this order? This action cannot be undone.",
			{ title: "Delete Order", okLabel: "Delete", danger: true },
		);
		if (!confirmed) return;

		try {
			const response = await fetch(
				`${API_BASE_URL}/orders/${currentOrderId}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to delete order");
			}

			const result = await response.json();
			console.log("Order deleted:", result);

			await window.Dialog.alert("Order deleted successfully!", { title: "Success" });
			closeModal();
			loadOrders();
		} catch (error) {
			console.error("Error deleting order:", error);
			await window.Dialog.alert("Failed to delete order. Please try again.", { title: "Error", danger: true });
		}
	}

	// Close modal
	function closeModal() {
		document.getElementById("orderModal").style.display = "none";
		currentOrderId = null;
		isEditMode = false;
	}

	window.printDriverReport = async function () {
		const selectedIds = Array.from(
			document.querySelectorAll(".order-chk:checked"),
		).map((cb) => cb.dataset.orderId);

		// get only selected orders
		const selectedOrders = filteredOrders.filter((o) =>
			selectedIds.includes(String(o.id)),
		);
		if (selectedOrders.length === 0) {
			await window.Dialog.alert("Please select at least one order", { title: "Notice" });
			return;
		}

		// Get driver name from the first order (if available)
		let driverName = "Driver";
		const firstOrder = selectedOrders[0];
		driverName = firstOrder.driver || "Driver";

		// Rest of your code...
		let totalOrders = selectedOrders.length;
		let totalAmount = 0;

		const rows = selectedOrders
			.map((order) => {
				const date = new Date(order.createdAt);
				const formattedDate = `${date.getDate()},${date.getMonth() + 1},${date.getFullYear()}`;
				const location = order.c?.loc?.cty || "";
				const total = order.pr?.t || 0;
				totalAmount += total;

				return `
            <tr>
                <td>${order.id}</td>
                <td>${order.m}</td>
                <td>${order.c?.p || ""}</td>
                <td>${location}</td>
                <td>$${total.toFixed(2)}</td>
                <td>${formattedDate}</td>
                <td><svg id="barcode-${order.id}"></svg></td>
            </tr>
        `;
			})
			.join("");

		const printWindow = window.open("", "", "width=1000,height=700");
		if (!printWindow) {
			await window.Dialog.alert("Popup blocked. Please allow popups for this site.", { title: "Popup Blocked", danger: true });
			return;
		}

		printWindow.document.write(`
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                body { font-family: Arial; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px; font-size: 12px; text-align: center; }
                th { background: #eee; }
                svg { width: 100px; height: 40px; }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                }
                .header .left { text-align: left; }
                .header .right img { width: 100px; height: auto; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="left">
                    <h2>${escapeHtml(driverName)}</h2>
                    <p>Print Date: ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="right">
                    <img src="/assets/logogo-removebg-preview.png" alt="Logo">
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Merchant</th>
                        <th>Phone</th>
                        <th>Location</th>
                        <th>Total</th>
                        <th>Date</th>
                        <th>Barcode</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <br>
            <strong>Total Orders: ${totalOrders}</strong><br>
            <strong>Total: $${totalAmount.toFixed(2)}</strong>
        </body>
        </html>
    `);

		printWindow.document.close();

		setTimeout(() => {
			selectedOrders.forEach((order) => {
				try {
					printWindow.JsBarcode(`#barcode-${order.id}`, order.id, {
						format: "CODE128",
						width: 2,
						height: 40,
						displayValue: false,
					});
				} catch (e) {
					console.error("Barcode error for order", order.id, e);
				}
			});
			setTimeout(() => {
				printWindow.print();
			}, 500);
		}, 500);
	};

	function escapeHtml(str) {
		if (!str) return "";
		return str.replace(/[&<>]/g, function (m) {
			if (m === "&") return "&amp;";
			if (m === "<") return "&lt;";
			if (m === ">") return "&gt;";
			return m;
		});
	}

	window.printMerchantReport = async function () {
		const selectedIds = Array.from(
			document.querySelectorAll(".order-chk:checked"),
		).map((cb) => cb.dataset.orderId);

		// get only selected orders
		const selectedOrders = filteredOrders.filter((o) =>
			selectedIds.includes(String(o.id)),
		);
		if (selectedOrders.length === 0) {
			await window.Dialog.alert("Please select at least one order", { title: "Notice" });
			return;
		}

		// Get merchant name from first order (adjust property name if needed)
		let merchantName = "Merchant";
		const firstOrder = selectedOrders[0];
		if (firstOrder.m) {
			merchantName = firstOrder.m;
		}

		let totalOrders = selectedOrders.length;
		let totalAmount = 0;
		let totalFees = 0;
		let totalPaid = 0;

		const rows = selectedOrders
			.map((order) => {
				const total = order.pr?.t || 0;
				const fees = order.pr?.d || 0;
				const paid = total - fees;
				const city = order.c?.loc?.cty || "";

				totalAmount += total;
				totalFees += fees;
				totalPaid += paid;

				return `
            <tr>
                <td>${order.id}</td>
                <td>${order.c?.f || ""} ${order.c?.l || ""}</td>
                <td>${order.c?.p || ""}</td>
                <td>${city}</td>                     <!-- new column -->
                <td>$${total.toFixed(2)}</td>
                <td>$${fees.toFixed(2)}</td>
                <td>$${paid.toFixed(2)}</td>
                <td>${cancelledStatusLabel(order) || statusMap[order.s] || "Unknown"}</td>
            </tr>
        `;
			})
			.join("");

		const printWindow = window.open("", "", "width=1000,height=700");

		printWindow.document.write(`
        <html>
        <head>
            <style>
                body { font-family: Arial; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 6px; font-size: 12px; text-align: center; }
                th { background: #eee; }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                }
                .header .left { text-align: left; }
                .header .right img { width: 100px; height: auto; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="left">
                    <h2>${escapeHtml(merchantName)}</h2>
                    <p>Print Date: ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="right">
                    <img src="/assets/logogo-removebg-preview.png" alt="Logo">
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>City</th>
                        <th>Total</th>
                        <th>Fees</th>
                        <th>Paid</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <br>
            <strong>Total Orders: ${totalOrders}</strong><br>
            <strong>Total: $${totalAmount.toFixed(2)}</strong><br>
            <strong>Total Fees: $${totalFees.toFixed(2)}</strong><br>
            <strong>Total Paid: $${totalPaid.toFixed(2)}</strong>
        </body>
        </html>
    `);

		printWindow.document.close();

		setTimeout(() => {
			printWindow.print();
		}, 500);
	};

	// Helper to escape HTML (same as before)
	function escapeHtml(str) {
		if (!str) return "";
		return str.replace(/[&<>]/g, function (m) {
			if (m === "&") return "&amp;";
			if (m === "<") return "&lt;";
			if (m === ">") return "&gt;";
			return m;
		});
	}

	// JsBarcode writes fixed px width/height attributes on the <svg>, which makes
	// it overflow or get clipped on a fixed-size label. Swapping those for a
	// viewBox lets the CSS mm dimensions scale the whole barcode proportionally.
	function fitBarcodeSvg(svg) {
		if (!svg) return;
		const w = parseFloat(svg.getAttribute("width"));
		const h = parseFloat(svg.getAttribute("height"));
		if (!w || !h) return;
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
		svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
		svg.removeAttribute("width");
		svg.removeAttribute("height");
	}

	// Waits for JsBarcode and the label images so nothing prints half-rendered.
	function whenPrintWindowReady(printWindow, cb) {
		const start = Date.now();
		(function poll() {
			if (printWindow.closed) return;
			const imagesReady = Array.prototype.every.call(
				printWindow.document.images,
				(img) => img.complete,
			);
			if ((printWindow.JsBarcode && imagesReady) || Date.now() - start > 5000) {
				cb();
				return;
			}
			printWindow.setTimeout(poll, 50);
		})();
	}

	window.printSingleLabel = async function (orderId) {
	const order = allOrders.find((o) => o.id === orderId);

	if (!order) {
		await window.Dialog.alert("Order not found");
		return;
	}

	const printWindow = window.open("", "", "width=320,height=420");

	const name = `${order.c?.f || ""} ${order.c?.l || ""}`.trim();
	const phone = order.c?.p || "";
	const district = order.c?.loc?.d || "";
	const city = order.c?.loc?.cty || "";
	const merchant = order.m || "";
	const amount = order.pr?.t || 0;

	const location =
		district && city ? `${district}, ${city}` : district || city;

	const isExchange = !!order.e;

	printWindow.document.write(`
	<html>
	<head>
		<title>Shipping Label</title>

		<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>

		<style>
			@page{
				size:50mm 80mm;
				margin:0;
			}

			*{
				box-sizing:border-box;
			}

			html,body{
				width:50mm;
				height:80mm;
				margin:0;
				padding:0;
				overflow:hidden;
				background:#fff;
			}

			body{
				font-family:Arial,Helvetica,sans-serif;
				color:#000;
				-webkit-font-smoothing:antialiased;
				-webkit-print-color-adjust:exact;
				print-color-adjust:exact;
			}

			.label{
				width:50mm;
				height:80mm;
				padding:1.5mm 2.5mm;
				display:flex;
				flex-direction:column;
			}

			/* ── header: logo + order reference ─────────────────────── */
			.head{
				display:flex;
				justify-content:space-between;
				align-items:flex-end;
				gap:2mm;
				padding-bottom:1mm;
				border-bottom:0.5mm solid #000;
			}

			.logo{
				height:7.5mm;
				width:auto;
				max-width:32mm;
				object-fit:contain;
			}

			.ref{
				text-align:right;
				line-height:1;
			}

			.ref .k{
				font-size:5.5pt;
				font-weight:bold;
				letter-spacing:0.4mm;
			}

			.ref .v{
				margin-top:0.7mm;
				font-size:11pt;
				font-weight:bold;
			}

			/* ── recipient + amount due ─────────────────────────────── */
			.body{
				flex:1;
				min-height:0;
				overflow:hidden;
				display:flex;
				align-items:flex-start;
				gap:2mm;
				padding-top:1mm;
			}

			.who{
				flex:1;
				min-width:0;
			}

			.name{
				font-size:12pt;
				font-weight:bold;
				line-height:1.1;
				white-space:nowrap;
				overflow:hidden;
				text-overflow:ellipsis;
			}

			.phone{
				margin-top:0.7mm;
				font-size:8.5pt;
				white-space:nowrap;
				overflow:hidden;
				text-overflow:ellipsis;
			}

			.addr{
				margin-top:0.8mm;
				font-size:7.5pt;
				line-height:1.25;
				display:-webkit-box;
				-webkit-line-clamp:2;
				-webkit-box-orient:vertical;
				overflow:hidden;
			}

			.cod{
				flex:0 0 auto;
				background:#000;
				color:#fff;
				border-radius:1.2mm;
				padding:1.1mm 2mm;
				text-align:center;
				line-height:1;
			}

			.cod .k{
				font-size:5.5pt;
				font-weight:bold;
				letter-spacing:0.35mm;
			}

			.cod .v{
				margin-top:0.9mm;
				font-size:10pt;
				font-weight:bold;
				white-space:nowrap;
			}

			/* ── sender strip ───────────────────────────────────────── */
			.from{
				display:flex;
				justify-content:space-between;
				align-items:center;
				gap:2mm;
				margin-top:0.6mm;
				padding-top:0.6mm;
				border-top:0.2mm solid #000;
				font-size:6.5pt;
				letter-spacing:0.12mm;
				text-transform:uppercase;
			}

			.from .m{
				min-width:0;
				white-space:nowrap;
				overflow:hidden;
				text-overflow:ellipsis;
			}

			.from .m b{
				font-weight:bold;
			}

			.tag{
				flex:0 0 auto;
				border:0.25mm solid #000;
				border-radius:0.8mm;
				padding:0.3mm 1.2mm;
				font-size:6pt;
				font-weight:bold;
				letter-spacing:0.25mm;
			}

			/* ── barcode ────────────────────────────────────────────── */
			.barcode{
				margin-top:0.8mm;
				text-align:center;
			}

			.barcode svg{
				display:block;
				width:45mm;
				height:16mm;
				margin:0 auto;
			}
		</style>
	</head>

	<body>

		<div class="label">

			<div class="head">
				<img class="logo"
					src="/assets/logogo-removebg-preview.png"
					alt="Logo"
					onerror="this.style.display='none'">

				<div class="ref">
					<div class="k">ORDER</div>
					<div class="v">#${escapeHtml(String(order.id))}</div>
				</div>
			</div>

			<div class="body">
				<div class="who">
					<div class="name">${escapeHtml(name) || "&nbsp;"}</div>
					<div class="phone">${escapeHtml(phone)}</div>
					<div class="addr">${escapeHtml(location)}</div>
				</div>

				<div class="cod">
					<div class="k">COD</div>
					<div class="v">$${Number(amount).toFixed(2)}</div>
				</div>
			</div>

			<div class="from">
				<div class="m">From <b>${escapeHtml(merchant)}</b></div>
				${isExchange ? '<div class="tag">EXCHANGE</div>' : ""}
			</div>

			<div class="barcode">
				<svg id="barcode"></svg>
			</div>

		</div>

	</body>
	</html>
	`);

	printWindow.document.close();

	whenPrintWindowReady(printWindow, () => {
		if (printWindow.JsBarcode) {
			printWindow.JsBarcode("#barcode", String(order.id), {
				format: "CODE128",
				width: 2,
				height: 45,
				displayValue: true,
				fontSize: 16,
				textMargin: 1,
				margin: 0,
			});

			fitBarcodeSvg(printWindow.document.getElementById("barcode"));
		}

		printWindow.setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 150);
	});
};

// Prints just the barcode for one order — no customer/merchant details, for
// slapping a barcode sticker on a package separately from the full label.
window.printBarcodeOnly = async function (orderId) {
	const order = allOrders.find((o) => o.id === orderId);

	if (!order) {
		await window.Dialog.alert("Order not found");
		return;
	}

	const printWindow = window.open("", "", "width=320,height=420");

	printWindow.document.write(`
	<html>
	<head>
		<title>Barcode - Order #${order.id}</title>

		<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>

		<style>
			@page{
				size:50mm 80mm;
				margin:0;
			}

			*{
				box-sizing:border-box;
			}

			html,body{
				width:50mm;
				height:80mm;
				margin:0;
				padding:0;
				overflow:hidden;
				background:#fff;
			}

			body{
				font-family:Arial,Helvetica,sans-serif;
				color:#000;
				display:flex;
				align-items:center;
				justify-content:center;
				-webkit-print-color-adjust:exact;
				print-color-adjust:exact;
			}

			.barcode-only{
				width:50mm;
				height:80mm;
				padding:3mm;
				display:flex;
				align-items:center;
				justify-content:center;
			}

			.barcode-only svg{
				display:block;
				width:44mm;
				height:74mm;
			}
		</style>
	</head>

	<body>
		<div class="barcode-only">
			<svg id="barcode"></svg>
		</div>
	</body>
	</html>
	`);

	printWindow.document.close();

	whenPrintWindowReady(printWindow, () => {
		if (printWindow.JsBarcode) {
			printWindow.JsBarcode("#barcode", String(order.id), {
				format: "CODE128",
				width: 2,
				height: 80,
				displayValue: true,
				fontSize: 18,
				textMargin: 2,
				margin: 0,
			});

			fitBarcodeSvg(printWindow.document.getElementById("barcode"));
		}

		printWindow.setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 150);
	});
};

	//  INITIALIZATION
	document.addEventListener("DOMContentLoaded", () => {
		console.log("DOM Content Loaded - Initializing Orders List");

		// Add event listeners (OPTION 2)
		document
			.getElementById("statusFilter")
			.addEventListener("change", applyFilters);
		document
			.getElementById("merchantFilter")
			.addEventListener("change", applyFilters);
		document
			.getElementById("driverFilter")
			.addEventListener("change", applyFilters);
		document
			.getElementById("startDate")
			.addEventListener("change", applyFilters);
		document
			.getElementById("endDate")
			.addEventListener("change", applyFilters);
		document
			.getElementById("searchInput")
			.addEventListener("input", applyFilters);
		document
			.getElementById("searchLocation")
			.addEventListener("input", applyFilters);
		document
			.getElementById("searchPrice")
			.addEventListener("input", applyFilters);

		// Clear filters button
		document
			.getElementById("clearFiltersBtn")
			.addEventListener("click", clearFilters);

		const ordersTableBody = document.getElementById("ordersTableBody");
		if (ordersTableBody) {
			ordersTableBody.addEventListener("click", (event) => {
				const actionButton = event.target.closest(
					"[data-order-action]",
				);
				if (!actionButton) return;

				const { orderAction, orderId } = actionButton.dataset;
				if (!orderAction || !orderId) return;

				if (orderAction === "edit") {
					editOrder(orderId);
				} else if (orderAction === "view") {
					viewOrder(orderId);
				} else if (orderAction === "print") {
					printSingleLabel(orderId);
				} else if (orderAction === "barcode") {
					printBarcodeOnly(orderId);
				}
			});
		}

		document
			.getElementById("driverPrintBtn")
			?.addEventListener("click", printDriverReport);
		document
			.getElementById("merchantPrintBtn")
			?.addEventListener("click", printMerchantReport);

		// Pagination buttons
		document
			.getElementById("prevBtn")
			.addEventListener("click", () => changePage("prev"));
		document
			.getElementById("nextBtn")
			.addEventListener("click", () => changePage("next"));

		// Modal event listeners
		document
			.querySelector(".close-modal")
			.addEventListener("click", closeModal);
		document
			.getElementById("cancelModalBtn")
			.addEventListener("click", closeModal);
		document
			.getElementById("saveOrderBtn")
			.addEventListener("click", saveOrderChanges);
		document
			.getElementById("deleteOrderBtn")
			.addEventListener("click", deleteOrder);

		// Close modal when clicking outside
		window.addEventListener("click", (event) => {
			const modal = document.getElementById("orderModal");
			if (event.target === modal) {
				closeModal();
			}
		});

		loadMerchantsForFilter();
		loadOrders();
	});

	// ─── MANUAL ACTIONS ───────────────────────────────────────────────────────────

	let currentActionOrder = null;
	let actionLog = JSON.parse(localStorage.getItem("actionLog") || "[]");
	let isProcessing = false;

	// Load drivers
	async function loadDriversForActions() {
		try {
			const response = await fetch(`${API_BASE_URL}/drivers`);
			const result = await response.json();
			const driversData = result.data || result;
			window.drivers = driversData;

			const select = document.getElementById("actionDriver");
			if (!select) return;

			select.innerHTML = '<option value="">Select Driver</option>';
			driversData.forEach((driver) => {
				const option = document.createElement("option");
				option.value = driver.id;
				option.textContent = driver.name;
				select.appendChild(option);
			});
		} catch (err) {
			console.error("Failed to load drivers:", err);
		}
	}

	// Action log
	function addToActionLog(message, type = "info") {
		const timestamp = new Date().toLocaleTimeString();
		actionLog.unshift({ message, type, timestamp });
		if (actionLog.length > 20) actionLog.pop();
		localStorage.setItem("actionLog", JSON.stringify(actionLog));
		displayActionLog();
	}

	function displayActionLog() {
		const logContainer = document.getElementById("logEntries");
		if (!logContainer) return;

		if (actionLog.length === 0) {
			logContainer.innerHTML = '<div style="color:gray;text-align:center;">No recent actions</div>';
			return;
		}

		logContainer.innerHTML = actionLog.map((entry) => {
			const icon = entry.type === "success" ? "bx-check-circle" : entry.type === "error" ? "bx-x-circle" : "bx-info-circle";
			const color = entry.type === "success" ? "#10b981" : entry.type === "error" ? "#ef4444" : "#3b82f6";
			return `
				<div style="padding:6px;display:flex;gap:8px;font-size:13px;">
					<i class='bx ${icon}' style="color:${color}"></i>
					<span style="flex:1;">${entry.message}</span>
					<span style="font-size:11px;">${entry.timestamp}</span>
				</div>`;
		}).join("");
	}

	// Status map — 4M and 4C are UI-only pseudo-values, never sent raw to the API
	const statusMap = {
		0: "Warehouse",
		1: "New",
		2: "Picked up",
		3: "Delivered",
		"4M": "Cancelled by Merchant",
		"4C": "Cancelled by Customer",
		5: "Paid",
		6: "Collected",
	};

	// ─── QUICK UPDATE ──────────────────────────────────────────────────────────────

	// Splices the server's updated order into the in-memory list and re-renders.
	// The update/cancel endpoints already return the full order, so refetching
	// is pure waste — loadOrders() walks every page sequentially (100 per
	// request), which is what made each manual action take seconds.
	function patchLocalOrder(updatedOrder) {
		if (!updatedOrder?.id) return false;
		const idx = allOrders.findIndex((o) => o.id === updatedOrder.id);
		if (idx === -1) return false;
		allOrders[idx] = updatedOrder;
		applyFilters();
		return true;
	}

	// Same idea for a freshly created order. It goes to the front because the
	// list endpoint sorts by createdAt desc — that's where a refetch would
	// have placed it.
	function insertLocalOrder(newOrder) {
		if (!newOrder?.id) return false;
		const idx = allOrders.findIndex((o) => o.id === newOrder.id);
		if (idx === -1) {
			allOrders.unshift(newOrder);
		} else {
			allOrders[idx] = newOrder;
		}
		applyFilters();
		return true;
	}

	async function quickUpdateOrder(orderId) {
		if (isProcessing) return;
		isProcessing = true;

		const input = document.getElementById("actionOrderId");
		if (!input) { isProcessing = false; return; }
		input.focus();

		const rawStatus = document.getElementById("actionStatus")?.value;
		const newDriver = document.getElementById("actionDriver")?.value;
		const exchangeCheckbox = document.getElementById("actionExchange");
		const exchangeNotesField = document.getElementById("actionExchangeNotes");

		if (!rawStatus && !newDriver && !exchangeCheckbox?.checked && !exchangeNotesField?.value.trim()) {
			showActionMessage("Select status, driver, or exchange first", "error");
			isProcessing = false;
			return;
		}

		// Cancellation statuses need special handling
		const isCancelByMerchant = rawStatus === "4M";
		const isCancelByCustomer = rawStatus === "4C";
		const isCancellation = isCancelByMerchant || isCancelByCustomer;

		let updatedOrder = null;

		try {
			if (isCancellation) {
				// For cancellations, we need to know the current order status first.
				// Read it from the server rather than the local cache — a stale
				// cancelledFromStatus would mis-record what the merchant owes.
				const orderRes = await fetch(`${API_BASE_URL}/orders/${orderId}`);
				if (!orderRes.ok) throw new Error("Order not found");
				const orderData = await orderRes.json();
				const order = orderData.order || orderData;
				const currentStatus = order.s; // numeric status

				updatedOrder = await cancelOrder(orderId, isCancelByCustomer ? "customer" : "merchant", currentStatus);
			} else {
				// Normal update
				const updates = {};
				if (rawStatus) updates.s = parseInt(rawStatus);
				if (newDriver) updates.driver = newDriver || null;
				if (exchangeCheckbox) updates.e = exchangeCheckbox.checked;
				if (exchangeNotesField) updates.eN = exchangeNotesField.value.trim();

				const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updates),
				});

				if (!response.ok) {
					const errBody = await response.json().catch(() => ({}));
					throw new Error(errBody.error || "Failed to update order");
				}
				const payload = await response.json();
				updatedOrder = payload.order || payload;
				currentActionOrder = updatedOrder;

				const changes = [];
				if (rawStatus) changes.push(`Status → ${statusMap[parseInt(rawStatus)] || rawStatus}`);
				if (newDriver) {
					const driverName = window.drivers?.find((d) => d.id === newDriver)?.name || newDriver;
					changes.push(`Driver → ${driverName}`);
				}
				if (exchangeCheckbox) changes.push(`Exchange → ${exchangeCheckbox.checked ? "Yes" : "No"}`);
				if (exchangeNotesField?.value.trim()) changes.push(`Notes → ${exchangeNotesField.value.trim()}`);

				addToActionLog(`Order ${orderId} updated: ${changes.join(", ")}`, "success");
			}

			// Reflect the change in the table and preview immediately — without
			// this they keep showing pre-action status/driver, which reads as if
			// the action didn't apply. Both come from the response we already
			// have, so this is synchronous; only fall back to a refetch if the
			// order somehow isn't in the loaded set.
			if (!patchLocalOrder(updatedOrder)) {
				loadOrders();
			}
			updateActionPreview(orderId, updatedOrder);

			playSuccessBeep();
			input.style.background = "#d1fae5";
			setTimeout(() => (input.style.background = ""), 200);
			input.value = "";
			input.focus();

			return true;
		} catch (err) {
			console.error(err);
			addToActionLog(`Failed to update order ${orderId}: ${err.message}`, "error");
			playErrorBeep();
			input.style.background = "#fee2e2";
			setTimeout(() => (input.style.background = ""), 200);
			showActionMessage(`Error: ${err.message}`, "error");
			return false;
		} finally {
			isProcessing = false;
		}
	}

	// ─── CANCELLATION ─────────────────────────────────────────────────────────────

	async function cancelOrder(orderId, cancelledBy, currentNumericStatus) {
		// Map numeric status back to enum string so we can store cancelledFromStatus.
		// Matches src/utils/orderStatus.js — index 5 is Paid, 6 is COLLECTED.
		const numericToEnum = {
			0: "WAREHOUSE",
			1: "NEW",
			2: "Picked_up",
			3: "DELIVERED",
			4: "Canceled",
			5: "Paid",
			6: "COLLECTED",
		};
		const cancelledFromStatus = numericToEnum[currentNumericStatus] || "UNKNOWN";

		const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cancelledBy, cancelledFromStatus }),
		});

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.error || "Failed to cancel order");
		}

		const result = await response.json();

		// Build a human-readable log message describing what happens financially
		let financeNote = "";
		if (cancelledBy === "merchant") {
			financeNote = "— no payment, no charges";
		} else if (cancelledBy === "customer") {
			financeNote = `— delivery charge $${result.order?.pr?.d ?? "?"} owed by merchant (settled once collected back)`;
		}

		addToActionLog(
			`Order ${orderId} cancelled by ${cancelledBy} ${financeNote}`,
			"success",
		);

		return result.order || null;
	}

	// ─── MESSAGES ─────────────────────────────────────────────────────────────────

	function showActionMessage(message, type = "success") {
		const container = document.getElementById("manualActionsForm");
		if (!container) return;

		const existing = container.querySelector(".temp-msg");
		if (existing) existing.remove();

		const messageDiv = document.createElement("div");
		messageDiv.className = "temp-msg";
		messageDiv.textContent = message;
		messageDiv.style.cssText = `color:${type === "error" ? "#ef4444" : "#10b981"};margin-top:10px;`;
		container.appendChild(messageDiv);
		setTimeout(() => messageDiv.remove(), 2000);
	}

	async function clearActionLog() {
		if (await window.Dialog.confirm("Clear log?", { title: "Confirm" })) {
			actionLog = [];
			localStorage.removeItem("actionLog");
			displayActionLog();
		}
	}

	// Shows the order's actual current status/driver before (and after) a
	// Manual Action runs, so it's obvious the change really applied instead
	// of having to trust stale table data.
	async function updateActionPreview(orderId, preloadedOrder) {
		const statusEl = document.getElementById("previewCurrentStatus");
		const driverEl = document.getElementById("previewCurrentDriver");
		if (!statusEl || !driverEl) return;

		if (!orderId) {
			statusEl.textContent = "";
			driverEl.textContent = "";
			return;
		}

		// Right after an action we already hold the updated order, so render
		// from it instead of spending a round trip re-reading what we just wrote.
		if (preloadedOrder) {
			statusEl.textContent =
				cancelledStatusLabel(preloadedOrder) ||
				STATUS_NAMES[preloadedOrder.s] ||
				"—";
			driverEl.textContent = preloadedOrder.driver || "Unassigned";
			return;
		}

		try {
			const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
			if (!res.ok) {
				statusEl.textContent = "Order not found";
				driverEl.textContent = "—";
				return;
			}
			const data = await res.json();
			const order = data.order || data;
			statusEl.textContent =
				cancelledStatusLabel(order) || STATUS_NAMES[order.s] || "—";
			driverEl.textContent = order.driver || "Unassigned";
		} catch {
			statusEl.textContent = "—";
			driverEl.textContent = "—";
		}
	}

	function updateApplyButtonState() {
		const applyBtn = document.getElementById("applyChangesBtn");
		const orderIdInput = document.getElementById("actionOrderId");
		const statusSelect = document.getElementById("actionStatus");
		const driverSelect = document.getElementById("actionDriver");
		const exchangeCheckbox = document.getElementById("actionExchange");
		const exchangeNotesField = document.getElementById("actionExchangeNotes");
	
		if (!applyBtn) return;
	
		const hasOrderId = orderIdInput && orderIdInput.value.trim() !== "";
		const hasStatus = statusSelect && statusSelect.value !== "";
		const hasDriver = driverSelect && driverSelect.value !== "";
		const hasExchange = exchangeCheckbox && exchangeCheckbox.checked;
		const hasExchangeNotes = exchangeNotesField && exchangeNotesField.value.trim() !== "";
	
		// Enable button if we have an order ID AND at least one action (status, driver, or exchange)
		const canApply = hasOrderId && (hasStatus || hasDriver || hasExchange || hasExchangeNotes);
		applyBtn.disabled = !canApply;
	}
	
	// ─── INIT ──────────────────────────────────────────────────────────────────────
	
	function initManualActions() {
		loadDriversForActions();
		displayActionLog();
		initSearchableSelect("actionDriver", "actionDriverSearch", "actionDriverDropdown");
	
		const orderInput = document.getElementById("actionOrderId");
		const statusSelect = document.getElementById("actionStatus");
		const driverSelect = document.getElementById("actionDriver");
		const driverSearchInput = document.getElementById("actionDriverSearch");
		const exchangeCheckbox = document.getElementById("actionExchange");
		const exchangeNotesField = document.getElementById("actionExchangeNotes");
		const applyBtn = document.getElementById("applyChangesBtn");
		const resetBtn = document.getElementById("resetActionBtn");
	
		// Update button state whenever any input changes
		if (orderInput) {
			orderInput.addEventListener("input", updateApplyButtonState);
			orderInput.addEventListener("blur", () =>
				updateActionPreview(orderInput.value.trim()),
			);
			orderInput.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					const orderId = orderInput.value.trim();
					if (orderId && !applyBtn.disabled) {
						applyBtn.click(); // ✓ Trigger the button click
					}
				}
			});
		}
	
		if (statusSelect) statusSelect.addEventListener("change", updateApplyButtonState);
		if (driverSelect) driverSelect.addEventListener("change", updateApplyButtonState);
		if (exchangeCheckbox) exchangeCheckbox.addEventListener("change", updateApplyButtonState);
		if (exchangeNotesField) exchangeNotesField.addEventListener("input", updateApplyButtonState);
	
		// Apply button click handler
		if (applyBtn) {
			applyBtn.addEventListener("click", () => {
				const orderId = orderInput?.value.trim();
				if (orderId && !applyBtn.disabled) {
					quickUpdateOrder(orderId);
				}
			});
		}
	
		// Reset button
		if (resetBtn) {
			resetBtn.addEventListener("click", () => {
				if (orderInput) orderInput.value = "";
				if (statusSelect) statusSelect.value = "";
				if (driverSelect) driverSelect.value = "";
				if (driverSearchInput) driverSearchInput.value = "";
				if (exchangeCheckbox) exchangeCheckbox.checked = false;
				if (exchangeNotesField) exchangeNotesField.value = "";
				updateApplyButtonState();
			});
		}
	
		// Initial state
		updateApplyButtonState();

		initAdminScanner();
	}

	// ─── CONTINUOUS BARCODE SCANNING (phones only) ─────────────────────────────────
	//
	// Unlike the driver dashboard's scanner (one scan → confirm → close), this
	// one stays open: each decoded barcode immediately applies whatever
	// driver/status is currently selected above, flashes green/red on the
	// camera view, and is ready for the next barcode right away — built for
	// scanning a stack of packages back to back.

	let adminScanLoadPromise = null;
	let adminScanControls = null;
	let adminScanBusy = false;

	function loadAdminScanLibrary() {
		if (window.ZXing) return Promise.resolve();
		if (!adminScanLoadPromise) {
			adminScanLoadPromise = new Promise((resolve, reject) => {
				const script = document.createElement("script");
				// Must come from jsdelivr, not unpkg — the app's CSP script-src
				// allowlist only trusts jsdelivr for externally-loaded scripts.
				script.src = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
				script.onload = () => resolve();
				script.onerror = () => reject(new Error("Failed to load barcode scanner library"));
				document.head.appendChild(script);
			});
		}
		return adminScanLoadPromise;
	}

	function initAdminScanner() {
		const scanBtn = document.getElementById("scanActionBtn");
		const modal = document.getElementById("adminScanModal");
		const closeBtn = document.getElementById("closeAdminScanModal");
		const stopBtn = document.getElementById("stopAdminScanBtn");
		if (!scanBtn || !modal) return;

		scanBtn.addEventListener("click", () => openAdminScanModal());
		closeBtn?.addEventListener("click", closeAdminScanModal);
		stopBtn?.addEventListener("click", closeAdminScanModal);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeAdminScanModal();
		});
	}

	async function openAdminScanModal() {
		const modal = document.getElementById("adminScanModal");
		const statusEl = document.getElementById("adminScanStatus");
		modal.style.display = "block";
		statusEl.style.color = "";
		statusEl.textContent = "Loading scanner…";

		try {
			await loadAdminScanLibrary();
			const reader = new window.ZXing.BrowserMultiFormatReader();
			statusEl.textContent = "Scan a barcode…";
			adminScanControls = await reader.decodeFromConstraints(
				{ video: { facingMode: "environment" } },
				"adminScanVideo",
				(result) => {
					if (result) handleAdminScan(result.getText());
				},
			);
		} catch (err) {
			console.error("Admin scanner error:", err);
			statusEl.style.color = "#dc2626";
			statusEl.textContent =
				err.name === "NotAllowedError"
					? "Camera access denied. Please allow camera access and try again."
					: err.name === "NotFoundError"
						? "No camera found on this device."
						: "Could not start the scanner. Please try again.";
		}
	}

	function closeAdminScanModal() {
		document.getElementById("adminScanModal").style.display = "none";
		if (adminScanControls) {
			adminScanControls.stop();
			adminScanControls = null;
		}
		adminScanBusy = false;
	}

	// A barcode sitting in frame gets decoded many times a second — adminScanBusy
	// blocks re-triggering until the current scan's apply + flash effect finishes.
	async function handleAdminScan(scannedId) {
		if (adminScanBusy) return;
		adminScanBusy = true;

		const orderId = scannedId.trim();
		const orderInput = document.getElementById("actionOrderId");
		if (orderInput) orderInput.value = orderId;

		const success = await quickUpdateOrder(orderId);
		flashAdminScan(success, orderId);

		setTimeout(() => {
			adminScanBusy = false;
		}, 1200);
	}

	function flashAdminScan(success, orderId) {
		const flashEl = document.getElementById("adminScanFlash");
		const statusEl = document.getElementById("adminScanStatus");
		if (flashEl) {
			flashEl.className = `scan-flash-overlay ${success ? "scan-flash-success" : "scan-flash-error"}`;
			setTimeout(() => {
				flashEl.className = "scan-flash-overlay";
			}, 500);
		}
		if (statusEl) {
			statusEl.style.color = success ? "#16a34a" : "#dc2626";
			statusEl.textContent = success
				? `✓ ${orderId} applied — scan the next barcode`
				: `✗ ${orderId} failed — see log below`;
		}
	}

	document.addEventListener("DOMContentLoaded", initManualActions);

	//  ORDER ADJUSTMENT LOGIC
	const adjOrderIdInput = document.getElementById("adjustmentOrderId");
	const adjOrderPreview = document.getElementById("adjOrderPreview");
	const adjPreviewOrderId = document.getElementById("adjPreviewOrderId");
	const adjPreviewCustomer = document.getElementById("adjPreviewCustomer");
	const timelineContainer = document.getElementById("orderTimelineContainer");

	let currentAdjOrder = null;

	const actionTypeColors = {
		creation: "tl-creation",
		update: "tl-update",
		status_change: "tl-status",
	};

	const actionTypeLabels = {
		creation: "Order Created",
		update: "Order Updated",
		status_change: "Status Updated",
	};

	const HISTORY_STATUS_NAMES = [
		"Warehouse",
		"New",
		"Picked Up",
		"Delivered",
		"Cancelled",
		"Paid",
		"Collected",
	];

	const HISTORY_FIELD_LABELS = {
		s: "Status",
		driver: "Driver",
		e: "Exchange",
		eN: "Exchange Note",
		m: "Merchant",
		id: "Order ID",
		"c.f": "First Name",
		"c.l": "Last Name",
		"c.p": "Phone",
		"c.loc.d": "District",
		"c.loc.cty": "City",
		"pr.t": "Total Price",
		"pr.d": "Delivery Charge",
	};

	function describeHistoryValue(key, value) {
		if (key === "s") return HISTORY_STATUS_NAMES[value] ?? value;
		if (key === "driver") return value || "Unassigned";
		if (key === "e") return value ? "Yes" : "No";
		return value;
	}

	function flattenHistoryChanges(obj, prefix = "") {
		const out = [];
		Object.entries(obj || {}).forEach(([key, value]) => {
			const path = prefix ? `${prefix}.${key}` : key;
			if (value && typeof value === "object" && !Array.isArray(value)) {
				out.push(...flattenHistoryChanges(value, path));
			} else if (value !== undefined && value !== null && value !== "") {
				out.push([path, value]);
			}
		});
		return out;
	}

	function formatHistoryChanges(newValue) {
		const changes = flattenHistoryChanges(newValue);
		if (!changes.length) return "";
		return changes
			.map(
				([key, value]) =>
					`<div class="diff-item">${HISTORY_FIELD_LABELS[key] || key}: <span class="diff-value">${describeHistoryValue(key, value)}</span></div>`,
			)
			.join("");
	}

	async function fetchAndRenderTimeline(orderId) {
		if (!timelineContainer) return;
		timelineContainer.innerHTML =
			'<div style="text-align: center; color: var(--text-muted);"><i class="bx bx-loader-alt bx-spin"></i> Loading timeline...</div>';
		timelineContainer.classList.remove("hidden");

		try {
			const res = await fetch(
				`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/history`,
			);

			if (!res.ok) throw new Error("Failed to fetch history");
			const history = await res.json();

			if (!history || history.length === 0) {
				timelineContainer.innerHTML =
					'<div style="text-align: center; color: var(--text-muted); margin-top: 10px;">No history recorded for this order.</div>';
				return;
			}

			timelineContainer.innerHTML = "";

			history.forEach((entry, index) => {
				// Skip manual notes as requested
				if (entry.action_type === "note") return;

				const date = new Date(entry.created_at);
				const timeString = date.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				});
				const dateString = date.toLocaleDateString();

				// Determine styling
				let colorClass =
					actionTypeColors[entry.action_type] || "tl-update";
				let title =
					actionTypeLabels[entry.action_type] || "System Action";
				let contentString = "";

				if (entry.action_type === "status_change") {
					const sVal = entry.new_value;
					colorClass = `tl-status-${sVal}`;
					const statusNames = [
						"Warehouse",
						"New",
						"Picked Up",
						"Delivered",
						"Cancelled",
						"Paid",
						"Collected",
					];
					title = `Status: ${statusNames[sVal] || "Unknown"}`;

					if (entry.metadata && entry.metadata.note) {
						contentString = `Note: ${entry.metadata.note}`;
					}
				} else if (entry.action_type === "update") {
					contentString =
						formatHistoryChanges(entry.new_value) ||
						"Order parameters were externally updated.";
				} else if (entry.action_type === "creation") {
					contentString = `Order injected into the system.`;
				}

				const stepNum = index + 1;
				const performedBy = entry.performed_by || "System";

				const cardHTML = `
                <div class="timeline-card ${colorClass}">
                    <div class="timeline-step">${stepNum}</div>
                    <div class="tl-header">
                        <div class="tl-title"><i class='bx bx-git-commit'></i> ${title}</div>
                        <div class="tl-time">${dateString} ${timeString}</div>
                    </div>
                    ${contentString ? `<div class="tl-body">${contentString}</div>` : ""}
                    <div class="tl-meta">
                        <span><i class='bx bx-user'></i> By: ${performedBy}</span>
                    </div>
                </div>
            `;
				timelineContainer.innerHTML += cardHTML;
			});
		} catch (err) {
			console.error(err);
			timelineContainer.innerHTML =
				'<div style="text-align: center; color: #ef4444; margin-top: 10px;">Failed to load order history.</div>';
		}
	}

	if (adjOrderIdInput) {
		let debounceTimer;
		adjOrderIdInput.addEventListener("input", (e) => {
			clearTimeout(debounceTimer);
			const orderId = e.target.value.trim();

			if (!orderId) {
				adjOrderPreview.style.display = "none";
				if (timelineContainer) {
					timelineContainer.classList.add("hidden");
					timelineContainer.innerHTML = "";
				}
				currentAdjOrder = null;
				return;
			}

			debounceTimer = setTimeout(async () => {
				try {
					const res = await fetch(
						`${API_BASE_URL}/orders/track/${encodeURIComponent(orderId)}`,
					);
					if (!res.ok) throw new Error("Not found");
					const order = await res.json();
					currentAdjOrder = order;

					adjPreviewOrderId.textContent = `#${order.id}`;
					adjPreviewCustomer.textContent = `${order.c.f} ${order.c.l || ""} (${order.c.p})`;
					adjOrderPreview.style.display = "block";

					fetchAndRenderTimeline(order.id);
				} catch (err) {
					adjOrderPreview.style.display = "none";
					if (timelineContainer)
						timelineContainer.classList.add("hidden");
					currentAdjOrder = null;
				}
			}, 500);
		});
	}

})();

// PRINT SELECTED ORDERS
async function printSelectedOrders() {
	const checked = Array.from(document.querySelectorAll(".order-chk:checked"));
	if (checked.length === 0) {
		await window.Dialog.alert("Please select at least one order to print.", { title: "Notice" });
		return;
	}

	const statusNames = [
		"Warehouse",
		"New",
		"Picked Up",
		"Delivered",
		"Cancelled",
		"Paid",
	];

	const rows = checked
		.map((chk) => {
			const orderId = chk.dataset.orderId;
			const order = allOrders.find((o) => o.id === orderId);
			if (!order) return "";

			const statusText = statusNames[order.s] || "Unknown";
			const customerName =
				`${order.c?.f || ""} ${order.c?.l || ""}`.trim();
			const location = [order.c?.loc?.cty, order.c?.loc?.d]
				.filter(Boolean)
				.join(", ");
			const priceWoDelivery = (
				(order.pr?.t || 0) - (order.pr?.d || 0)
			).toFixed(2);
			const createdAt = new Date(order.createdAt).toLocaleDateString();

			return `
        <tr>
            <td>#${order.id}</td>
            <td>${order.m || "-"}</td>
            <td>${customerName}</td>
            <td>${order.c?.p || "-"}</td>
            <td>${location}</td>
            <td>$${priceWoDelivery}</td>
            <td>$${(order.pr?.d || 0).toFixed(2)}</td>
            <td>$${(order.pr?.t || 0).toFixed(2)}</td>
            <td><span class="s-${order.s}">${statusText}</span></td>
            <td>${order.driver || "-"}</td>
            <td>${createdAt}</td>
        </tr>`;
		})
		.join("");

	const win = window.open("", "_blank", "width=1100,height=700");
	win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Selected Orders Print</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
            h2 { text-align: center; margin-bottom: 16px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #1e293b; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
            td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) td { background: #f8fafc; }
            .s-0 { color:#f59e0b; } .s-1 { color:#3b82f6; } .s-2 { color:#8b5cf6; }
            .s-3 { color:#22c55e; font-weight:700; } .s-4 { color:#ef4444; } .s-5 { color:#10b981; font-weight:700; }
            @media print {
                button { display: none; }
                body { margin: 0; }
            }
        </style>
    </head>
    <body>
        <h2>Go Delivery &mdash; Selected Orders (${checked.length})</h2>
        <p style="text-align:center; color:#64748b; font-size:11px; margin-bottom:12px;">Printed: ${new Date().toLocaleString()}</p>
        <table>
            <thead>
                <tr>
                    <th>Order ID</th><th>Merchant</th><th>Customer</th><th>Phone</th>
                    <th>Location</th><th>Price</th><th>Delivery</th><th>Total</th>
                    <th>Status</th><th>Driver</th><th>Date</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
		<p style="text-align:center; margin-top:20px; color:#64748b; font-size:11px;">Sending to printer...</p>
    </body>
    </html>
    `);
	win.document.close();
}
