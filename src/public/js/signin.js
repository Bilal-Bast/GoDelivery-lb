const lbox = document.getElementById("login-box");
const loginBtn = document.getElementById("openLogin");
const closeBtn = document.querySelector(".close");

function resetLoginBoxView() {
	const loginBox = document.getElementById("loginFormBox");
	const forgotBox = document.getElementById("forgotPasswordFormBox");
	if (loginBox) loginBox.style.display = "block";
	if (forgotBox) forgotBox.style.display = "none";
}

loginBtn.onclick = () => {
	resetLoginBoxView();
	lbox.style.display = "flex";
};

closeBtn.onclick = () => {
	lbox.style.display = "none";
};

window.onclick = (e) => {
	if (e.target === lbox) {
		lbox.style.display = "none";
	}
};

// ─── Forgot password ────────────────────────────────────────────────────────

const loginFormBox = document.getElementById("loginFormBox");
const forgotPasswordFormBox = document.getElementById("forgotPasswordFormBox");
const openForgotPassword = document.getElementById("openForgotPassword");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (openForgotPassword && loginFormBox && forgotPasswordFormBox) {
	openForgotPassword.addEventListener("click", (e) => {
		e.preventDefault();
		loginFormBox.style.display = "none";
		forgotPasswordFormBox.style.display = "block";
	});

	forgotPasswordFormBox
		.querySelector(".close")
		.addEventListener("click", () => {
			lbox.style.display = "none";
			forgotPasswordFormBox.style.display = "none";
			loginFormBox.style.display = "block";
		});
}

if (forgotPasswordForm) {
	forgotPasswordForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const email = document.getElementById("forgotEmail").value.trim();
		const submitBtn = document.getElementById("forgotPasswordSubmit");
		const messageEl = document.getElementById("forgotPasswordMessage");

		submitBtn.disabled = true;
		submitBtn.textContent = "Sending...";
		messageEl.textContent = "";

		try {
			const response = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = await response.json();
			messageEl.style.color = response.ok
				? "var(--success-color, green)"
				: "var(--error-color)";
			messageEl.textContent =
				data.message || data.error || "Something went wrong.";
		} catch (error) {
			console.error(error);
			messageEl.style.color = "var(--error-color)";
			messageEl.textContent = "Server error. Please try again later.";
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = "Send reset link";
		}
	});
}

const trackForm = document.getElementById("trackForm");
if (trackForm) {
	trackForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const id = document.getElementById("trackOrderId").value.trim();
		if (id) {
			window.location.href = `/track?id=${encodeURIComponent(id)}`;
		}
	});
}

document.querySelector("#loginForm").addEventListener("submit", async (e) => {
	e.preventDefault();

	const usernameInput = document.querySelector("#username");
	const passwordInput = document.querySelector("#password");
	const username = usernameInput.value;
	const password = passwordInput.value;
	const submitBtn = document.getElementById("loginBtnSubmit");
	const errorText = document.getElementById("Try-again");

	// Add loading state
	if (submitBtn) {
		submitBtn.classList.add("loading");
		submitBtn.textContent = "Logging in...";
	}
	if (errorText) errorText.textContent = "";

	try {
		const response = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password }),
		});

		// A non-JSON body (e.g. a plain-text rate-limit response, or an HTML
		// error page from a proxy) shouldn't crash the login flow — fall back
		// to an empty object so the messaging below still has something to
		// work with instead of throwing.
		const data = await response.json().catch(() => ({}));

		if (!response.ok) {
			if (errorText) {
				errorText.textContent =
					typeof data === "string"
						? data
						: data.error || data.message || "Invalid username or password";
			} else {
				await window.Dialog.alert(data.error || data.message || "Invalid username or password", { title: "Error", danger: true });
			}
			if (submitBtn) {
				submitBtn.classList.remove("loading");
				submitBtn.textContent = "Log in";
			}
			return;
		}

		// Redirect based on role — server sets HTTP-only cookie, no localStorage needed
		if (data.role === "admin") {
			window.location.href = "/admin";
		} else if (data.role === "driver") {
			window.location.href = "/driver";
		} else {
			window.location.href = "/merchant";
		}
	} catch (error) {
		console.error(error);
		if (errorText) {
			errorText.textContent = "Server error. Please try again later.";
		} else {
			await window.Dialog.alert("Server error", { title: "Error", danger: true });
		}
		if (submitBtn) {
			submitBtn.classList.remove("loading");
			submitBtn.textContent = "Log in";
		}
	}
});

// Password Toggle Logic
const togglePassword = document.getElementById("togglePassword");
if (togglePassword) {
	togglePassword.addEventListener("click", function () {
		const passwordInput = document.getElementById("password");
		const icon = this.querySelector("i");

		if (passwordInput.type === "password") {
			passwordInput.type = "text";
			icon.classList.remove("bx-hide");
			icon.classList.add("bx-show");
		} else {
			passwordInput.type = "password";
			icon.classList.remove("bx-show");
			icon.classList.add("bx-hide");
		}
	});
}

// Handle browser autofill / value changes for floating labels
const handleFloatingLabel = (e) => {
	if (e.target.value.trim() !== "") {
		e.target.parentElement.classList.add("has-value");
	} else {
		e.target.parentElement.classList.remove("has-value");
	}
};

document.querySelectorAll(".input-box input").forEach((input) => {
	input.addEventListener("input", handleFloatingLabel);
	input.addEventListener("change", handleFloatingLabel);
	// Initial check
	if (input.value.trim() !== "") {
		input.parentElement.classList.add("has-value");
	}
});

