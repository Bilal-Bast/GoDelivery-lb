(() => {
	function updateSelectedTotal() {
		let total = 0;
		document
			.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
			.forEach((cb) => {
				total +=
					parseFloat(cb.closest("tr").children[3].textContent) || 0;
			});
		const el = document.getElementById("selectedTotal");
		if (el) el.textContent = `$${total.toFixed(2)}`;
	}

	document.addEventListener("DOMContentLoaded", () => {
		const selectAll = document.getElementById("selectAllOrders");
		if (selectAll) {
			selectAll.addEventListener("change", function () {
				document
					.querySelectorAll('#ordersBody input[type="checkbox"]')
					.forEach((cb) => (cb.checked = this.checked));
				updateSelectedTotal();
			});
		}

		document
			.querySelectorAll('#ordersBody input[type="checkbox"]')
			.forEach((cb) =>
				cb.addEventListener("change", updateSelectedTotal),
			);

		window.updateSelectedTotal = updateSelectedTotal;
		updateSelectedTotal();
	});
})();
