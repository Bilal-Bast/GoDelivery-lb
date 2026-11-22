// Default for date filters: the start date is one month ago (local time).
// The day is clamped for shorter months (e.g. Mar 31 -> Feb 28/29).
window.defaultDateFrom = () => {
	const date = new Date();
	const day = date.getDate();
	date.setDate(1);
	date.setMonth(date.getMonth() - 1);
	const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	date.setDate(Math.min(day, lastDay));
	const pad = (value) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
