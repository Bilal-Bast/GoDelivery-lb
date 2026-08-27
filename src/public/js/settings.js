(function () {
	const API = "/api";

	// ─── Password Strength Checker ─────────────────────────────────────────────
	function checkPasswordStrength(password) {
		let strength = 0;
		if (!password) return 0;

		// Length
		if (password.length >= 8) strength += 25;
		if (password.length >= 12) strength += 10;

		// Uppercase
		if (/[A-Z]/.test(password)) strength += 20;

		// Lowercase
		if (/[a-z]/.test(password)) strength += 20;

		// Numbers
		if (/\d/.test(password)) strength += 15;

		// Special chars
		if (/[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 10;

		return Math.min(strength, 100);
	}

	function getPasswordStrengthClass(score) {
		if (score < 40) return "strength-weak";
		if (score < 70) return "strength-medium";
		return "strength-strong";
	}

	function getPasswordStrengthText(score) {
		if (score < 40) return "Weak";
		if (score < 70) return "Medium";
		return "Strong";
	}

	// ─── Validation Helpers ───────────────────────────────────────────────────
	const validators = {
		username(value) {
			if (!value) return "Username is required";
			if (value.length < 3) return "Username must be at least 3 characters";
			return "";
		},
		email(value) {
			if (!value) return "";
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(value)) return "Please enter a valid email address";
			return "";
		},
		password(value) {
			if (!value) return "Password is required";
			if (value.length < 6)
				return "Password must be at least 6 characters";
			return "";
		},
		firstName(value) {
			if (!value) return "First name is required";
			if (value.length < 2) return "First name must be at least 2 characters";
			return "";
		},
		phone(value) {
			if (!value) return "Phone number is required";
			if (!/^\d{7,15}$/.test(value.replace(/\D/g, "")))
				return "Please enter a valid phone number";
			return "";
		},
		paymentDay(value) {
			if (!value) return "Payment day is required";
			return "";
		},
		orderIdPrefix(value) {
			if (!value) return "";
			if (!/^[a-zA-Z0-9]{1,8}$/.test(value))
				return "Only letters/numbers, up to 8 characters";
			return "";
		},
	};

	/**
	 * Show a feedback message under a form.
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
		}, 4000);
	}

	/**
	 * Show field validation error
	 */
	function showFieldError(elementId, message) {
		const errorEl = document.getElementById(elementId + "_error");
		const inputEl = document.getElementById(elementId);
		if (!errorEl) return;

		if (message) {
			errorEl.textContent = message;
			errorEl.style.display = "block";
			if (inputEl) inputEl.setAttribute("aria-invalid", "true");
		} else {
			errorEl.textContent = "";
			errorEl.style.display = "none";
			if (inputEl) inputEl.setAttribute("aria-invalid", "false");
		}
	}

	/**
	 * Disable / re-enable a button while a request is in-flight
	 */
	function setLoading(btn, loading) {
		btn.disabled = loading;
		btn.style.opacity = loading ? "0.6" : "1";
		if (!btn.dataset.label) btn.dataset.label = btn.textContent;
		btn.textContent = loading ? "Saving…" : btn.dataset.label;
	}

	// ─── Modal Helpers ───────────────────────────────────────────────────────
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
				item.innerHTML = `<span class="emoji-flag">${country.flag}</span> <span>${country.name} (${country.code})</span>`;
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

	// ─── Country Codes List ──────────────────────────────────────────────────
	const countryCodes = [
		{ code: "+93", name: "Afghanistan", flag: "🇦🇫", regex: /^\d{9}$/ },
		{ code: "+355", name: "Albania", flag: "🇦🇱", regex: /^\d{8,9}$/ },
		{ code: "+213", name: "Algeria", flag: "🇩🇿", regex: /^\d{9,10}$/ },
		{ code: "+961", name: "Lebanon", flag: "🇱🇧", regex: /^\d{7,8}$/ },
		// ... (rest of countryCodes array from original file)
	];

	/**
	 * Validate phone with country-specific format
	 */
	function validatePhone(phone, countryCode) {
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
			return `Invalid phone number format for ${countryName}`;
		}
		return "";
	}

	// ─── API call helper ─────────────────────────────────────────────────────
	async function apiPost(endpoint, body = {}) {
		try {
			const response = await fetch(`${API}${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(body),
			});

			const raw = await response.text();
			let data;

			try {
				data = JSON.parse(raw);
			} catch {
				data = { message: raw };
			}

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

	// ─── Real-time Field Validation ───────────────────────────────────────────
	function setupFieldValidation(fieldId, validatorKey, errorMessageId) {
		const field = document.getElementById(fieldId);
		if (!field) return;

		field.addEventListener("blur", () => {
			const error = validators[validatorKey]?.(field.value) || "";
			showFieldError(fieldId, error);
		});

		field.addEventListener("input", () => {
			// Clear error on input
			showFieldError(fieldId, "");
		});
	}

	// ─── Password Strength Display ─────────────────────────────────────────────
	function setupPasswordStrength(fieldId, barId, textId) {
		const field = document.getElementById(fieldId);
		if (!field) return;

		field.addEventListener("input", () => {
			const score = checkPasswordStrength(field.value);
			const className = getPasswordStrengthClass(score);
			const textContent = getPasswordStrengthText(score);

			field.className = field.className.replace(
				/strength-\w+/g,
				"",
			);
			field.classList.add(className);

			if (barId) {
				const bar = document.getElementById(barId);
				if (bar) {
					const afterContent = bar.style.getPropertyValue("--width");
					bar.style.setProperty("--width", (score / 100) * 100 + "%");
				}
			}

			if (textId) {
				const text = document.getElementById(textId);
				if (text) {
					text.textContent = textContent;
					text.className =
						"strength-text strength-" + className.replace("strength-", "");
				}
			}
		});
	}

	// ─── DOMContentLoaded ────────────────────────────────────────────────────
	document.addEventListener("DOMContentLoaded", () => {
		// ── Grab Modal Elements ──────────────────────────────────────────────
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

		// ── "Add New Account" accordion toggle ──────────────────────────────
		const addAccountToggle = document.getElementById("addAccountToggle");
		const addAccountContent = document.getElementById("addAccountContent");

		if (addAccountToggle && addAccountContent) {
			addAccountToggle.addEventListener("click", () => {
				const isHidden = addAccountContent.classList.contains("hidden");
				addAccountContent.classList.toggle("hidden", !isHidden);
				addAccountToggle.classList.toggle("active", isHidden);
			});
		}

		// ── Open / Close modals ──────────────────────────────────────────────
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

		// ── Country Dropdowns ────────────────────────────────────────────────
		initCountryDropdown("admin");
		initCountryDropdown("merchant");
		initCountryDropdown("driver");

		// ── Account-type radio (prepaid / postpaid) ──────────────────────────
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

		// ── Setup Field Validation for Admin ──────────────────────────────────
		setupFieldValidation("adminUsername", "username", "adminUsername");
		setupFieldValidation("adminEmail", "email", "adminEmail");
		setupFieldValidation("adminFirstName", "firstName", "adminFirstName");
		setupFieldValidation("adminPhone", "phone", "adminPhone");
		setupPasswordStrength("adminPassword", "adminPasswordStrength", "adminPasswordText");

		// ── Setup Field Validation for Merchant ───────────────────────────────
		setupFieldValidation(
			"merchantFirstName",
			"firstName",
			"merchantFirstName",
		);
		setupFieldValidation("merchantUsername", "username", "merchantUsername");
		setupFieldValidation("merchantEmail", "email", "merchantEmail");
		setupFieldValidation("merchantPhone", "phone", "merchantPhone");
		setupPasswordStrength(
			"merchantPassword",
			"merchantPasswordStrength",
			"merchantPasswordText",
		);

		// ── Setup Field Validation for Driver ─────────────────────────────────
		setupFieldValidation("driverFirstName", "firstName", "driverFirstName");
		setupFieldValidation("driverUsername", "username", "driverUsername");
		setupFieldValidation("driverEmail", "email", "driverEmail");
		setupFieldValidation("driverPhone", "phone", "driverPhone");
		setupPasswordStrength(
			"driverPassword",
			"driverPasswordStrength",
			"driverPasswordText",
		);

		// ── Add Admin ────────────────────────────────────────────────────────
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

				// Validate all fields
				let hasError = false;
				const validations = {
					adminUsername: validators.username(username),
					adminEmail: validators.email(email),
					adminPassword: validators.password(password),
					adminFirstName: validators.firstName(firstName),
					adminPhone: validatePhone(phone, countryCode),
				};

				Object.entries(validations).forEach(([fieldId, error]) => {
					showFieldError(fieldId, error);
					if (error) hasError = true;
				});

				if (hasError) return;

				setLoading(addAdminBtn, true);

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
				const csrfInpA = document.createElement("input");
				csrfInpA.type = "hidden";
				csrfInpA.name = "_csrf";
				csrfInpA.value = window.__CSRF_TOKEN__ || "";
				formA.appendChild(csrfInpA);
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
					showFieldError(id, "");
				});

				showMessage(
					"adminMessage",
					"✓ Admin account added successfully!",
				);
				setTimeout(() => closeModal(addAdminModal), 1500);
			});
		}

		// ── Add Merchant ─────────────────────────────────────────────────────
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

				const paymentDay =
					document.getElementById("merchantPaymentDay").value;
				const orderIdPrefix = document
					.getElementById("merchantOrderIdPrefix")
					.value.trim();

				// Validate all fields
				let hasError = false;
				const validations = {
					merchantUsername: validators.username(username),
					merchantEmail: validators.email(email),
					merchantPassword: validators.password(password),
					merchantFirstName: validators.firstName(firstName),
					merchantPhone: validatePhone(phone, countryCode),
					merchantOrderIdPrefix: validators.orderIdPrefix(orderIdPrefix),
				};

				// Prepaid merchants have nothing extra to configure — they're
				// settled by advance payments against a running balance.
				if (accountType !== "prepaid") {
					validations.merchantPaymentDay =
						validators.paymentDay(paymentDay);
				}

				Object.entries(validations).forEach(([fieldId, error]) => {
					showFieldError(fieldId, error);
					if (error) hasError = true;
				});

				if (hasError) return;

				setLoading(addMerchantBtn, true);

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
					paymentDay: accountType === "postpaid" ? paymentDay : null,
					orderIdPrefix,
					deliveryCharges,
				});
				formM.appendChild(inpM);
				const csrfInpM = document.createElement("input");
				csrfInpM.type = "hidden";
				csrfInpM.name = "_csrf";
				csrfInpM.value = window.__CSRF_TOKEN__ || "";
				formM.appendChild(csrfInpM);
				document.body.appendChild(formM);
				formM.submit();

				[
					"merchantUsername",
					"merchantEmail",
					"merchantPassword",
					"merchantFirstName",
					"merchantLastName",
					"merchantPhone",
					"merchantPaymentDay",
					"merchantOrderIdPrefix",
				].forEach((id) => {
					const el = document.getElementById(id);
					if (el) {
						el.value = "";
						showFieldError(id, "");
					}
				});

				showMessage(
					"merchantMessage",
					"✓ Merchant account added successfully!",
				);
				setTimeout(() => closeModal(addMerchantModal), 1500);
			});
		}

		// ── Add Driver ───────────────────────────────────────────────────────
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
				const deliveryFee = document
					.getElementById("driverDeliveryFee")
					.value.trim();

				// Validate all fields
				let hasError = false;
				const validations = {
					driverUsername: validators.username(username),
					driverEmail: validators.email(email),
					driverPassword: validators.password(password),
					driverFirstName: validators.firstName(firstName),
					driverPhone: validatePhone(phone, countryCode),
				};

				Object.entries(validations).forEach(([fieldId, error]) => {
					showFieldError(fieldId, error);
					if (error) hasError = true;
				});

				if (hasError) return;

				setLoading(addDriverBtn, true);

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
					deliveryFee: deliveryFee === "" ? null : Number(deliveryFee),
				});
				formD.appendChild(inpD);
				const csrfInpD = document.createElement("input");
				csrfInpD.type = "hidden";
				csrfInpD.name = "_csrf";
				csrfInpD.value = window.__CSRF_TOKEN__ || "";
				formD.appendChild(csrfInpD);
				document.body.appendChild(formD);
				formD.submit();

				[
					"driverUsername",
					"driverEmail",
					"driverPassword",
					"driverFirstName",
					"driverLastName",
					"driverPhone",
					"driverDeliveryFee",
				].forEach((id) => {
					const el = document.getElementById(id);
					if (el) {
						el.value = "";
						showFieldError(id, "");
					}
				});

				showMessage(
					"driverMessage",
					"✓ Driver account added successfully!",
				);
				setTimeout(() => closeModal(addDriverModal), 1500);
			});
		}

		// ── Location Management ──────────────────────────────────────────────
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
		});

		// ── Change My Password ───────────────────────────────────────────────
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
						"✓ Password updated successfully!",
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

		// ── Reset User Password ──────────────────────────────────────────────
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
					opt.value = u.id || u._id;
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
						"✓ Password reset successfully!",
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

		// ── Manage Delivery Charges ──────────────────────────────────────────
		const manageChargesToggle = document.getElementById(
			"manageChargesToggle",
		);
		const manageChargesContent = document.getElementById(
			"manageChargesContent",
		);
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

		manageChargesToggle?.addEventListener("click", () => {
			const isHidden = manageChargesContent.classList.contains("hidden");
			manageChargesContent.classList.toggle("hidden", !isHidden);
			manageChargesToggle.classList.toggle("active", isHidden);
			if (!manageChargesContent.classList.contains("hidden")) {
				loadMerchantsForCharges();
			}
		});

		document
			.getElementById("saveChargesBtn")
			?.addEventListener("click", async () => {
				const select = document.getElementById("merchantSelect");
				const merchantId = select.value;
				if (!merchantId) return;

				const btn = document.getElementById("saveChargesBtn");
				btn.dataset.label = btn.dataset.label || btn.textContent;

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

					const m = allMerchants.find((x) => x._id === merchantId);
					if (m) m.deliveryCharges = deliveryCharges;

					showMessage(
						"chargesMessage",
						"✓ Delivery charges updated successfully!",
						false,
					);
				} catch (err) {
					showMessage("chargesMessage", err.message, true);
				} finally {
					setLoading(btn, false);
				}
			});

		// ── Manage Driver Fee ────────────────────────────────────────────────
		const manageDriverFeeToggle = document.getElementById(
			"manageDriverFeeToggle",
		);
		const manageDriverFeeContent = document.getElementById(
			"manageDriverFeeContent",
		);
		let allDriversForFee = [];

		async function loadDriversForFee() {
			try {
				const res = await fetch(`${API}/users`, {
					credentials: "include",
				});
				const users = await res.json();
				allDriversForFee = (Array.isArray(users) ? users : []).filter(
					(u) => u.role === "driver",
				);

				const select = document.getElementById("driverFeeSelect");
				if (!select) return;
				select.innerHTML =
					'<option value="">Select a driver...</option>';
				allDriversForFee.forEach((d) => {
					const option = document.createElement("option");
					option.value = d.id || d._id;
					option.textContent = `${d.username} (${d.firstName} ${d.lastName})`.trim();
					select.appendChild(option);
				});
			} catch (err) {
				console.error("Error loading drivers:", err);
			}
		}

		manageDriverFeeToggle?.addEventListener("click", () => {
			const isHidden = manageDriverFeeContent.classList.contains("hidden");
			manageDriverFeeContent.classList.toggle("hidden", !isHidden);
			manageDriverFeeToggle.classList.toggle("active", isHidden);
			if (!manageDriverFeeContent.classList.contains("hidden")) {
				loadDriversForFee();
			}
		});

		document
			.getElementById("driverFeeSelect")
			?.addEventListener("change", (e) => {
				const driverId = e.target.value;
				const fields = document.getElementById("driverFeeFields");
				if (!driverId) {
					fields.classList.add("hidden");
					return;
				}
				const d = allDriversForFee.find(
					(x) => (x.id || x._id) === driverId,
				);
				document.getElementById("editDriverFee").value =
					d && d.deliveryFee != null ? d.deliveryFee : "";
				fields.classList.remove("hidden");
			});

		document
			.getElementById("saveDriverFeeBtn")
			?.addEventListener("click", async () => {
				const select = document.getElementById("driverFeeSelect");
				const driverId = select.value;
				if (!driverId) return;

				const btn = document.getElementById("saveDriverFeeBtn");
				btn.dataset.label = btn.dataset.label || btn.textContent;
				const rawFee = document
					.getElementById("editDriverFee")
					.value.trim();
				const deliveryFee = rawFee === "" ? null : Number(rawFee);

				if (
					deliveryFee != null &&
					(!Number.isFinite(deliveryFee) || deliveryFee < 0)
				) {
					showMessage(
						"driverFeeMessage",
						"Please enter a valid delivery fee",
						true,
					);
					return;
				}

				setLoading(btn, true);
				try {
					const res = await fetch(
						`${API}/users/drivers/${driverId}`,
						{
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							credentials: "include",
							body: JSON.stringify({ deliveryFee }),
						},
					);
					const data = await res.json();
					if (!res.ok)
						throw new Error(
							data.error ||
								data.message ||
								"Error updating delivery fee",
						);

					const d = allDriversForFee.find(
						(x) => (x.id || x._id) === driverId,
					);
					if (d) d.deliveryFee = deliveryFee;

					showMessage(
						"driverFeeMessage",
						"✓ Delivery fee updated successfully!",
						false,
					);
				} catch (err) {
					showMessage("driverFeeMessage", err.message, true);
				} finally {
					setLoading(btn, false);
				}
			});

		loadLocations();

		// Show global success/error messages
		(() => {
			try {
				const params = new URLSearchParams(
					window.location.search,
				);
				if (params.get("success") === "1") {
					showMessage("pageMessage", "✓ Operation completed successfully.");
					history.replaceState(
						null,
						"",
						window.location.pathname,
					);
				} else if (params.get("error")) {
					const err = decodeURIComponent(params.get("error"));
					showMessage("pageMessage", err, true);
					history.replaceState(
						null,
						"",
						window.location.pathname,
					);
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
					await window.Dialog.alert("City added successfully!", { title: "Success" });
					this.reset();
					await loadLocations();
				} catch (err) {
					console.error(err);
					await window.Dialog.alert(err.message || "Server error", { title: "Error", danger: true });
				} finally {
					setLoading(btn, false);
				}
			});
	});
})();