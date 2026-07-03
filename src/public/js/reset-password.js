const form = document.getElementById("resetPasswordForm");
const messageEl = document.getElementById("resetPasswordMessage");
const submitBtn = document.getElementById("resetPasswordSubmit");

const token = new URLSearchParams(window.location.search).get("token");

function showMessage(text, isError = false) {
	messageEl.textContent = text;
	messageEl.style.color = isError
		? "var(--error-color)"
		: "var(--success-color, green)";
}

if (!token) {
	showMessage(
		"This reset link is missing a token. Please request a new one.",
		true,
	);
	submitBtn.disabled = true;
}

form.addEventListener("submit", async (e) => {
	e.preventDefault();
	if (!token) return;

	const newPassword = document.getElementById("newPassword").value;
	const confirmPassword = document.getElementById("confirmPassword").value;

	if (newPassword !== confirmPassword) {
		showMessage("Passwords do not match.", true);
		return;
	}

	submitBtn.disabled = true;
	submitBtn.classList.add("loading");
	submitBtn.textContent = "Resetting...";

	try {
		const response = await fetch("/api/auth/reset-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, newPassword }),
		});
		const data = await response.json();

		if (!response.ok) {
			showMessage(data.error || "Failed to reset password.", true);
			submitBtn.disabled = false;
			submitBtn.classList.remove("loading");
			submitBtn.textContent = "Reset password";
			return;
		}

		showMessage("Password reset! Redirecting to log in...");
		setTimeout(() => {
			window.location.href = "/signin";
		}, 1500);
	} catch (error) {
		console.error(error);
		showMessage("Server error. Please try again later.", true);
		submitBtn.disabled = false;
		submitBtn.classList.remove("loading");
		submitBtn.textContent = "Reset password";
	}
});
