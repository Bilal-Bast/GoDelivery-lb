const lbox = document.getElementById("login-box");
const loginBtn = document.getElementById("openLogin");
const closeBtn = document.querySelector(".close");

loginBtn.onclick = () => {
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
	const errorText = document.getElementById("Try again");

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

		const data = await response.json();

		if (!response.ok) {
			if (errorText) {
				errorText.textContent =
					typeof data === "string"
						? data
						: data.message || "Invalid username or password";
			} else {
				alert(data);
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
			alert("Server error");
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

