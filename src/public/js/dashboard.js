// Admin dashboard ("Command Center") — /admin only.
// Everything is derived client-side from window.__INIT_DATA__ (orders,
// merchants, drivers) that the SSR route already hydrates, so this adds
// no extra queries. admin.js still owns the navbar/sidebar/notifications.

(function () {
	const STATUS = [
		{ key: "warehouse", name: "Warehouse", color: "#f59e0b", icon: "bx-buildings" },
		{ key: "new", name: "New", color: "#06b6d4", icon: "bx-plus-circle" },
		{ key: "picked", name: "Picked Up", color: "#8b5cf6", icon: "bx-package" },
		{ key: "delivered", name: "Delivered", color: "#22c55e", icon: "bx-check-circle" },
		{ key: "cancelled", name: "Cancelled", color: "#ef4444", icon: "bx-x-circle" },
		{ key: "paid", name: "Paid", color: "#10b981", icon: "bx-check-double" },
		{ key: "collected", name: "Collected", color: "#3b82f6", icon: "bx-wallet" },
	];

	const PERIODS = [
		{ id: "today", label: "Today", days: 1 },
		{ id: "7d", label: "7 Days", days: 7 },
		{ id: "30d", label: "30 Days", days: 30 },
		{ id: "90d", label: "90 Days", days: 90 },
		{ id: "all", label: "All Time", days: null },
	];

	const STUCK_DAYS = 3;
	const DAY_MS = 86400000;
	const REFRESH_MS = 120000;

	const state = {
		period: localStorage.getItem("dashPeriod") || "30d",
		trendMetric: "revenue",
		autoRefresh: localStorage.getItem("dashAutoRefresh") === "1",
		charts: {},
		refreshTimer: null,
	};

	// ── helpers ──────────────────────────────────────────────
	const $ = (id) => document.getElementById(id);

	const money = (n) =>
		"$" +
		Math.round(Number(n) || 0)
			.toLocaleString("en-US");

	const moneyShort = (n) => {
		const v = Number(n) || 0;
		if (Math.abs(v) >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
		if (Math.abs(v) >= 10000) return "$" + Math.round(v / 1000) + "k";
		return money(v);
	};

	const pct = (n) => (Number(n) || 0).toFixed(1) + "%";

	const esc = (s) =>
		String(s ?? "").replace(/[&<>"']/g, (c) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		})[c]);

	const initials = (s) =>
		String(s || "?")
			.trim()
			.split(/[\s._-]+/)
			.slice(0, 2)
			.map((w) => w[0])
			.join("")
			.toUpperCase() || "?";

	function timeAgo(date) {
		const diff = Date.now() - new Date(date).getTime();
		if (!Number.isFinite(diff)) return "";
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "just now";
		if (mins < 60) return mins + "m ago";
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return hrs + "h ago";
		const days = Math.floor(hrs / 24);
		if (days < 30) return days + "d ago";
		return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	const isCancelled = (o) => o.s === 4 || Boolean(o.cancelledBy);
	const isDelivered = (o) => !isCancelled(o) && (o.s === 3 || o.s === 5 || o.s === 6);
	const revenueOf = (o) => (isCancelled(o) ? 0 : Number(o.pr?.t) || 0);
	const feeOf = (o) => Number(o.pr?.d) || 0;
	const customerOf = (o) => [o.c?.f, o.c?.l].filter(Boolean).join(" ") || "Unknown customer";
	const regionOf = (o) => o.c?.loc?.d || "Unassigned";

	function periodRange(id) {
		const def = PERIODS.find((p) => p.id === id) || PERIODS[2];
		if (def.days === null) return { start: null, end: null, days: null, label: def.label };
		const end = new Date();
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		start.setDate(start.getDate() - (def.days - 1));
		return { start, end, days: def.days, label: def.label };
	}

	function inRange(order, start, end) {
		if (!start) return true;
		const t = new Date(order.createdAt).getTime();
		return t >= start.getTime() && t <= end.getTime();
	}

	// ── metrics ──────────────────────────────────────────────
	function summarize(orders) {
		const s = {
			orders: orders.length,
			revenue: 0,
			fees: 0,
			delivered: 0,
			cancelled: 0,
			express: 0,
			counts: STATUS.map(() => 0),
			statusValue: STATUS.map(() => 0),
		};
		orders.forEach((o) => {
			s.revenue += revenueOf(o);
			if (isDelivered(o)) {
				s.delivered++;
				s.fees += feeOf(o);
			}
			if (isCancelled(o)) s.cancelled++;
			if (o.e) s.express++;
			const idx = isCancelled(o) ? 4 : o.s;
			if (idx >= 0 && idx < STATUS.length) {
				s.counts[idx]++;
				s.statusValue[idx] += Number(o.pr?.t) || 0;
			}
		});
		s.aov = s.orders ? s.revenue / s.orders : 0;
		s.deliveryRate = s.orders ? (s.delivered / s.orders) * 100 : 0;
		s.cancelRate = s.orders ? (s.cancelled / s.orders) * 100 : 0;
		return s;
	}

	function bucketByDay(orders, start, days, valueFn) {
		// returns [{label, value}] — one bucket per day across the window
		const map = new Map();
		let from = start;
		let span = days;
		if (!from) {
			const times = orders.map((o) => new Date(o.createdAt).getTime()).filter(Number.isFinite);
			if (!times.length) return [];
			from = new Date(Math.min(...times));
			from.setHours(0, 0, 0, 0);
			span = Math.min(180, Math.floor((Date.now() - from.getTime()) / DAY_MS) + 1);
			from = new Date(Date.now() - (span - 1) * DAY_MS);
			from.setHours(0, 0, 0, 0);
		}
		for (let i = 0; i < span; i++) {
			const d = new Date(from.getTime() + i * DAY_MS);
			map.set(d.toDateString(), { date: d, value: 0 });
		}
		orders.forEach((o) => {
			const key = new Date(o.createdAt).toDateString();
			const bucket = map.get(key);
			if (bucket) bucket.value += valueFn(o);
		});
		return [...map.values()];
	}

	// ── small inline sparkline (no chart lib needed) ─────────
	function sparkline(values, color) {
		const w = 92;
		const h = 30;
		if (!values.length) return "";
		const max = Math.max(...values, 1);
		const min = Math.min(...values, 0);
		const range = max - min || 1;
		const step = values.length > 1 ? w / (values.length - 1) : w;
		const pts = values.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
		const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
		const area = line + " L" + w + " " + h + " L0 " + h + " Z";
		const gid = "sg" + Math.random().toString(36).slice(2, 8);
		const last = pts[pts.length - 1];
		return (
			'<svg class="dash-kpi-spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
			'<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
			'<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>' +
			'<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
			"</linearGradient></defs>" +
			'<path d="' + area + '" fill="url(#' + gid + ')"/>' +
			'<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
			'<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.2" fill="' + color + '"/>' +
			"</svg>"
		);
	}

	function deltaChip(current, previous, opts) {
		const invert = opts && opts.invert;
		const suffix = (opts && opts.suffix) || "%";
		if (previous === 0 && current === 0) return '<span class="dash-delta flat">— no change</span>';
		let change;
		if (previous === 0) change = 100;
		else change = ((current - previous) / Math.abs(previous)) * 100;
		const rounded = Math.abs(change) < 0.05 ? 0 : change;
		if (rounded === 0) return '<span class="dash-delta flat">— flat</span>';
		const good = invert ? rounded < 0 : rounded > 0;
		const cls = good ? "up" : "down";
		const arrow = rounded > 0 ? "bx-trending-up" : "bx-trending-down";
		return (
			'<span class="dash-delta ' + cls + '"><i class="bx ' + arrow + '"></i>' +
			(rounded > 0 ? "+" : "") + rounded.toFixed(1) + suffix + "</span>"
		);
	}

	function countUp(el, target, format) {
		const dur = 700;
		const start = performance.now();
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (reduce) {
			el.textContent = format(target);
			return;
		}
		function frame(now) {
			const p = Math.min(1, (now - start) / dur);
			const eased = 1 - Math.pow(1 - p, 3);
			el.textContent = format(target * eased);
			if (p < 1) requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
	}

	// ── renderers ────────────────────────────────────────────
	function renderKpis(cur, prev, series) {
		const cards = [
			{
				label: "Revenue",
				tone: "#4f46e5",
				icon: "bx-dollar-circle",
				value: cur.revenue,
				prev: prev.revenue,
				format: (v) => money(v),
				spark: series.revenue,
			},
			{
				label: "Orders",
				tone: "#06b6d4",
				icon: "bx-package",
				value: cur.orders,
				prev: prev.orders,
				format: (v) => Math.round(v).toLocaleString("en-US"),
				spark: series.orders,
			},
			{
				label: "Delivered",
				tone: "#22c55e",
				icon: "bx-check-circle",
				value: cur.delivered,
				prev: prev.delivered,
				format: (v) => Math.round(v).toLocaleString("en-US"),
				note: pct(cur.deliveryRate) + " success rate",
				spark: series.delivered,
			},
			{
				label: "Avg Order Value",
				tone: "#f59e0b",
				icon: "bx-receipt",
				value: cur.aov,
				prev: prev.aov,
				format: (v) => money(v),
				spark: series.aov,
			},
			{
				label: "Cancel Rate",
				tone: "#ef4444",
				icon: "bx-x-circle",
				value: cur.cancelRate,
				prev: prev.cancelRate,
				format: (v) => v.toFixed(1) + "%",
				invert: true,
				note: cur.cancelled + " cancelled",
				spark: series.cancelled,
			},
			{
				label: "Delivery Fees",
				tone: "#0ea5e9",
				icon: "bx-money-withdraw",
				value: cur.fees,
				prev: prev.fees,
				format: (v) => money(v),
				note: "earned on delivered",
				spark: series.fees,
			},
		];

		$("dashKpis").innerHTML = cards
			.map(
				(c, i) =>
					'<article class="dash-kpi dash-rise" style="--tone:' + c.tone + ";animation-delay:" + i * 45 + 'ms">' +
					'<div class="dash-kpi-top">' +
					'<span class="dash-kpi-label">' + esc(c.label) + "</span>" +
					'<span class="dash-kpi-icon"><i class="bx ' + c.icon + '"></i></span>' +
					"</div>" +
					'<div class="dash-kpi-value" data-kpi="' + i + '">' + c.format(0) + "</div>" +
					'<div class="dash-kpi-foot">' +
					deltaChip(c.value, c.prev, { invert: c.invert }) +
					sparkline(c.spark, c.tone) +
					"</div>" +
					(c.note ? '<div class="dash-panel-sub" style="margin:-2px 0 6px">' + esc(c.note) + "</div>" : "") +
					"</article>",
			)
			.join("");

		cards.forEach((c, i) => {
			const el = document.querySelector('[data-kpi="' + i + '"]');
			if (el) countUp(el, c.value, c.format);
		});
	}

	function renderPipeline(cur) {
		const flow = [0, 1, 2, 3, 6, 5]; // warehouse → new → picked → delivered → collected → paid
		const max = Math.max(...flow.map((i) => cur.counts[i]), 1);
		const html = flow
			.map((i, idx) => {
				const st = STATUS[i];
				const count = cur.counts[i];
				const share = Math.round((count / max) * 100);
				return (
					(idx ? '<i class="bx bx-chevron-right dash-arrow"></i>' : "") +
					'<a class="dash-stage" style="--tone:' + st.color + '" href="/orders?status=' + i + '">' +
					'<div class="dash-stage-name"><i></i>' + esc(st.name) + "</div>" +
					'<div class="dash-stage-count">' + count.toLocaleString("en-US") + "</div>" +
					'<div class="dash-stage-money">' + moneyShort(cur.statusValue[i]) + "</div>" +
					'<div class="dash-stage-bar"><span data-w="' + share + '"></span></div>' +
					"</a>"
				);
			})
			.join("");
		$("dashPipeline").innerHTML = html;
		$("dashPipelineNote").textContent =
			cur.counts[4] + " cancelled in this period · " + cur.express + " express";
		requestAnimationFrame(() => {
			document.querySelectorAll("#dashPipeline .dash-stage-bar span").forEach((el) => {
				el.style.width = el.dataset.w + "%";
			});
		});
	}

	function renderAlerts(all, merchants) {
		const now = Date.now();
		const open = all.filter((o) => !isCancelled(o) && o.s !== 5);

		const expressPending = open.filter((o) => o.e && o.s !== 3 && o.s !== 5 && o.s !== 6);
		const stuck = open.filter((o) => {
			const ts = new Date(o.statusUpdatedAt || o.createdAt).getTime();
			return Number.isFinite(ts) && now - ts > STUCK_DAYS * DAY_MS && o.s !== 5 && o.s !== 6;
		});
		const needsPickup = all.filter((o) => o.needsPickup && !isCancelled(o));
		const unassigned = all.filter((o) => !o.driver && (o.s === 0 || o.s === 1));
		const toCollect = all.filter((o) => o.s === 3 && !isCancelled(o));
		const toPayout = all.filter((o) => o.s === 6 && !isCancelled(o));
		const returnsOpen = all.filter((o) => isCancelled(o) && !o.collectedBack);

		const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
		const dueMerchants = (merchants || []).filter(
			(m) => m.accountType === "postpaid" && String(m.paymentDay || "").toLowerCase() === today,
		);

		const items = [
			{
				n: expressPending.length,
				tone: "#f43f5e",
				icon: "bx-bolt-circle",
				title: "Express orders in flight",
				desc: "Marked express and not delivered yet",
				href: "/orders",
			},
			{
				n: stuck.length,
				tone: "#f59e0b",
				icon: "bx-time-five",
				title: "Stalled over " + STUCK_DAYS + " days",
				desc: "No status change since " + STUCK_DAYS + "+ days",
				href: "/orders",
			},
			{
				n: unassigned.length,
				tone: "#8b5cf6",
				icon: "bx-user-x",
				title: "Awaiting a driver",
				desc: "In warehouse or new, nobody assigned",
				href: "/orders",
			},
			{
				n: needsPickup.length,
				tone: "#06b6d4",
				icon: "bx-transfer",
				title: "Pickup mismatch",
				desc: "Picked up by a different driver",
				href: "/orders",
			},
			{
				n: toCollect.length,
				tone: "#3b82f6",
				icon: "bx-wallet",
				title: "Cash to collect",
				desc: moneyShort(toCollect.reduce((s, o) => s + revenueOf(o), 0)) + " held by drivers",
				href: "/collect",
			},
			{
				n: toPayout.length,
				tone: "#10b981",
				icon: "bx-money-withdraw",
				title: "Merchant payouts pending",
				desc: moneyShort(toPayout.reduce((s, o) => s + revenueOf(o) - feeOf(o), 0)) + " owed to merchants",
				href: "/pay",
			},
			{
				n: returnsOpen.length,
				tone: "#ef4444",
				icon: "bx-undo",
				title: "Returns not collected back",
				desc: "Cancelled orders still out",
				href: "/return",
			},
			{
				n: dueMerchants.length,
				tone: "#eab308",
				icon: "bx-calendar-exclamation",
				title: "Postpaid due today",
				desc: dueMerchants.map((m) => m.username).slice(0, 3).join(", ") || "Scheduled for today",
				href: "/pay",
			},
		].filter((a) => a.n > 0);

		$("dashAlertCount").textContent = items.length ? items.length + " open" : "all clear";

		$("dashAlerts").innerHTML = items.length
			? items
					.map(
						(a) =>
							'<a class="dash-alert" style="--tone:' + a.tone + '" href="' + a.href + '">' +
							'<span class="dash-alert-icon"><i class="bx ' + a.icon + '"></i></span>' +
							'<span class="dash-alert-body">' +
							'<span class="dash-alert-title">' + esc(a.title) + "</span>" +
							'<span class="dash-alert-desc">' + esc(a.desc) + "</span>" +
							"</span>" +
							'<span class="dash-alert-count">' + a.n + "</span>" +
							"</a>",
					)
					.join("")
			: '<div class="dash-empty"><i class="bx bx-check-shield"></i>Nothing needs your attention right now.</div>';
	}

	function renderMoney(all) {
		const inTransit = all.filter((o) => !isCancelled(o) && (o.s === 0 || o.s === 1 || o.s === 2));
		const withDrivers = all.filter((o) => o.s === 3 && !isCancelled(o));
		const inHouse = all.filter((o) => o.s === 6 && !isCancelled(o));
		const settled = all.filter((o) => o.s === 5 && !isCancelled(o));

		const items = [
			{
				tone: "#8b5cf6",
				icon: "bx-navigation",
				label: "In transit",
				value: inTransit.reduce((s, o) => s + revenueOf(o), 0),
				hint: inTransit.length + " orders on the road",
			},
			{
				tone: "#3b82f6",
				icon: "bx-user-voice",
				label: "Held by drivers",
				value: withDrivers.reduce((s, o) => s + revenueOf(o), 0),
				hint: withDrivers.length + " delivered, not collected",
			},
			{
				tone: "#f59e0b",
				icon: "bx-buildings",
				label: "Owed to merchants",
				value: inHouse.reduce((s, o) => s + revenueOf(o) - feeOf(o), 0),
				hint: inHouse.length + " collected, not paid out",
			},
			{
				tone: "#10b981",
				icon: "bx-check-double",
				label: "Settled",
				value: settled.reduce((s, o) => s + revenueOf(o), 0),
				hint: settled.length + " fully closed",
			},
			{
				tone: "#0ea5e9",
				icon: "bx-trending-up",
				label: "Company earnings",
				value: all.filter(isDelivered).reduce((s, o) => s + feeOf(o), 0),
				hint: "delivery fees, all delivered",
			},
		];

		$("dashMoney").innerHTML = items
			.map(
				(m) =>
					'<div class="dash-money-item" style="--tone:' + m.tone + '">' +
					'<div class="dash-money-label"><i class="bx ' + m.icon + '"></i>' + esc(m.label) + "</div>" +
					'<div class="dash-money-value">' + money(m.value) + "</div>" +
					'<div class="dash-money-hint">' + esc(m.hint) + "</div>" +
					"</div>",
			)
			.join("");
	}

	function renderMerchants(orders) {
		const map = new Map();
		orders.forEach((o) => {
			const key = o.m || "—";
			if (!map.has(key)) map.set(key, { name: key, orders: 0, revenue: 0, delivered: 0, cancelled: 0 });
			const row = map.get(key);
			row.orders++;
			row.revenue += revenueOf(o);
			if (isDelivered(o)) row.delivered++;
			if (isCancelled(o)) row.cancelled++;
		});
		const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
		const max = rows.length ? rows[0].revenue || 1 : 1;

		$("dashMerchants").innerHTML = rows.length
			? rows
					.map((r, i) => {
						const rate = r.orders ? (r.delivered / r.orders) * 100 : 0;
						const tone = rate >= 80 ? "#16a34a" : rate >= 55 ? "#f59e0b" : "#ef4444";
						return (
							"<tr>" +
							'<td><div class="dash-who">' +
							'<span class="dash-rank ' + (i < 3 ? "r" + (i + 1) : "") + '">' + (i + 1) + "</span>" +
							'<span class="dash-avatar">' + esc(initials(r.name)) + "</span>" +
							'<span class="dash-who-text"><span class="dash-who-name">' + esc(r.name) + "</span>" +
							'<span class="dash-who-sub">' + r.orders + " orders</span></span>" +
							"</div></td>" +
							'<td class="ta-r dash-num">' + money(r.revenue) + "</td>" +
							'<td style="width:110px"><div class="dash-meter"><span data-w="' +
							Math.round((r.revenue / max) * 100) + '"></span></div></td>' +
							'<td class="ta-r"><span class="dash-tag" style="--tone:' + tone + '">' + pct(rate) + "</span></td>" +
							"</tr>"
						);
					})
					.join("")
			: '<tr><td colspan="4"><div class="dash-empty"><i class="bx bx-store"></i>No merchant activity in this period.</div></td></tr>';

		requestAnimationFrame(() => {
			document.querySelectorAll("#dashMerchants .dash-meter span").forEach((el) => {
				el.style.width = el.dataset.w + "%";
			});
		});
	}

	function renderDrivers(orders, drivers) {
		const names = new Map((drivers || []).map((d) => [d.username, d.name || d.username]));
		const map = new Map();
		orders.forEach((o) => {
			if (!o.driver) return;
			if (!map.has(o.driver))
				map.set(o.driver, { user: o.driver, assigned: 0, delivered: 0, cancelled: 0, cash: 0, fees: 0 });
			const row = map.get(o.driver);
			row.assigned++;
			if (isDelivered(o)) {
				row.delivered++;
				row.fees += feeOf(o);
			}
			if (isCancelled(o)) row.cancelled++;
			if (o.s === 3 && !isCancelled(o)) row.cash += revenueOf(o);
		});
		const rows = [...map.values()].sort((a, b) => b.delivered - a.delivered).slice(0, 8);

		$("dashDrivers").innerHTML = rows.length
			? rows
					.map((r, i) => {
						const rate = r.assigned ? (r.delivered / r.assigned) * 100 : 0;
						const tone = rate >= 85 ? "#16a34a" : rate >= 60 ? "#f59e0b" : "#ef4444";
						return (
							"<tr>" +
							'<td><div class="dash-who">' +
							'<span class="dash-rank ' + (i < 3 ? "r" + (i + 1) : "") + '">' + (i + 1) + "</span>" +
							'<span class="dash-avatar" style="background:linear-gradient(135deg,#0ea5e9,#6366f1)">' +
							esc(initials(names.get(r.user) || r.user)) + "</span>" +
							'<span class="dash-who-text"><span class="dash-who-name">' +
							esc(names.get(r.user) || r.user) + "</span>" +
							'<span class="dash-who-sub">' + r.assigned + " assigned</span></span>" +
							"</div></td>" +
							'<td class="ta-r dash-num">' + r.delivered + "</td>" +
							'<td class="ta-r dash-num">' + money(r.cash) + "</td>" +
							'<td class="ta-r"><span class="dash-tag" style="--tone:' + tone + '">' + pct(rate) + "</span></td>" +
							"</tr>"
						);
					})
					.join("")
			: '<tr><td colspan="4"><div class="dash-empty"><i class="bx bx-car"></i>No driver activity in this period.</div></td></tr>';
	}

	function renderRegions(orders) {
		const map = new Map();
		orders.forEach((o) => {
			const key = regionOf(o);
			if (!map.has(key)) map.set(key, { name: key, orders: 0, revenue: 0 });
			const row = map.get(key);
			row.orders++;
			row.revenue += revenueOf(o);
		});
		const rows = [...map.values()].sort((a, b) => b.orders - a.orders).slice(0, 7);
		const max = rows.length ? rows[0].orders || 1 : 1;

		$("dashRegions").innerHTML = rows.length
			? rows
					.map(
						(r) =>
							'<div class="dash-bar-row">' +
							'<div class="dash-bar-name">' + esc(r.name) + "</div>" +
							'<div class="dash-bar-val">' + r.orders + " · " + moneyShort(r.revenue) + "</div>" +
							'<div class="dash-bar-track"><span data-w="' + Math.round((r.orders / max) * 100) + '"></span></div>' +
							"</div>",
					)
					.join("")
			: '<div class="dash-empty"><i class="bx bx-map"></i>No regional data yet.</div>';

		requestAnimationFrame(() => {
			document.querySelectorAll("#dashRegions .dash-bar-track span").forEach((el) => {
				el.style.width = el.dataset.w + "%";
			});
		});
	}

	function renderHeatmap(orders) {
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const grid = days.map(() => new Array(24).fill(0));
		orders.forEach((o) => {
			const d = new Date(o.createdAt);
			if (!Number.isFinite(d.getTime())) return;
			grid[d.getDay()][d.getHours()]++;
		});
		const max = Math.max(1, ...grid.flat());

		$("dashHeatLabels").innerHTML = days.map((d) => "<span>" + d + "</span>").join("");
		$("dashHeatRows").innerHTML = grid
			.map(
				(row, di) =>
					'<div class="dash-heat-row">' +
					row
						.map((v, hi) => {
							const a = v ? 0.15 + (v / max) * 0.85 : 0;
							const bg = v ? "rgba(22,22,150," + a.toFixed(2) + ")" : "";
							return (
								'<div class="dash-heat-cell"' +
								(bg ? ' style="background:' + bg + '"' : "") +
								' title="' + days[di] + " " + String(hi).padStart(2, "0") + ":00 — " + v + ' orders"></div>'
							);
						})
						.join("") +
					"</div>",
			)
			.join("");
		$("dashHeatHours").innerHTML = Array.from({ length: 24 }, (_, h) =>
			"<span>" + (h % 3 === 0 ? h : "") + "</span>",
		).join("");

		let best = { day: 0, hour: 0, v: 0 };
		grid.forEach((row, di) =>
			row.forEach((v, hi) => {
				if (v > best.v) best = { day: di, hour: hi, v };
			}),
		);
		$("dashHeatPeak").textContent = best.v
			? "Peak: " + days[best.day] + " at " + String(best.hour).padStart(2, "0") + ":00 (" + best.v + " orders)"
			: "No orders in this period";
	}

	function renderFeed(all) {
		const recent = [...all]
			.sort(
				(a, b) =>
					new Date(b.statusUpdatedAt || b.createdAt) - new Date(a.statusUpdatedAt || a.createdAt),
			)
			.slice(0, 25);

		$("dashFeed").innerHTML = recent.length
			? recent
					.map((o) => {
						const idx = isCancelled(o) ? 4 : o.s;
						const st = STATUS[idx] || STATUS[0];
						const when = o.statusUpdatedAt || o.createdAt;
						return (
							'<a class="dash-feed-item" style="--tone:' + st.color + '" href="/orders?search=' +
							encodeURIComponent(o.id) + '">' +
							'<span class="dash-feed-body">' +
							'<span class="dash-feed-title">#' + esc(o.id) + " · " + esc(st.name) +
							(o.e ? ' <i class="bx bxs-bolt" style="color:#f43f5e"></i>' : "") + "</span>" +
							'<span class="dash-feed-meta">' + esc(customerOf(o)) + " — " + esc(regionOf(o)) +
							(o.m ? " · " + esc(o.m) : "") + "</span>" +
							"</span>" +
							'<span class="dash-feed-right">' +
							'<span class="dash-feed-amount">' + money(o.pr?.t) + "</span>" +
							'<span class="dash-feed-time">' + esc(timeAgo(when)) + "</span>" +
							"</span>" +
							"</a>"
						);
					})
					.join("")
			: '<div class="dash-empty"><i class="bx bx-pulse"></i>No recent movement.</div>';
	}

	// ── charts ───────────────────────────────────────────────
	function renderTrendChart(orders, start, days) {
		const canvas = $("dashTrendChart");
		if (!canvas || typeof Chart === "undefined") return;

		const metrics = {
			revenue: { label: "Revenue", fn: revenueOf, color: "#4f46e5", money: true },
			orders: { label: "Orders", fn: () => 1, color: "#06b6d4", money: false },
			fees: { label: "Delivery fees", fn: (o) => (isDelivered(o) ? feeOf(o) : 0), color: "#10b981", money: true },
		};
		const m = metrics[state.trendMetric] || metrics.revenue;
		const buckets = bucketByDay(orders, start, days, m.fn);
		const cancelBuckets = bucketByDay(orders, start, days, (o) => (isCancelled(o) ? 1 : 0));

		const ctx = canvas.getContext("2d");
		const grad = ctx.createLinearGradient(0, 0, 0, 280);
		grad.addColorStop(0, m.color + "45");
		grad.addColorStop(1, m.color + "00");

		state.charts.trend?.destroy();
		state.charts.trend = new Chart(canvas, {
			type: "line",
			data: {
				labels: buckets.map((b) =>
					b.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
				),
				datasets: [
					{
						label: m.label,
						data: buckets.map((b) => b.value),
						borderColor: m.color,
						backgroundColor: grad,
						fill: true,
						tension: 0.38,
						borderWidth: 2.5,
						pointRadius: 0,
						pointHoverRadius: 5,
						pointHoverBackgroundColor: m.color,
						pointHoverBorderColor: "#fff",
						pointHoverBorderWidth: 2,
					},
					{
						label: "Cancelled",
						data: cancelBuckets.map((b) => b.value),
						borderColor: "#ef4444",
						borderWidth: 1.5,
						borderDash: [4, 4],
						pointRadius: 0,
						pointHoverRadius: 4,
						fill: false,
						tension: 0.35,
						yAxisID: "y1",
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: "index", intersect: false },
				plugins: {
					legend: {
						display: true,
						position: "top",
						align: "end",
						labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 11 } },
					},
					tooltip: {
						backgroundColor: "rgba(15,23,42,0.94)",
						padding: 11,
						cornerRadius: 10,
						titleFont: { size: 12 },
						bodyFont: { size: 12 },
						displayColors: true,
						callbacks: {
							label: (c) =>
								" " + c.dataset.label + ": " +
								(c.datasetIndex === 0 && m.money ? money(c.parsed.y) : c.parsed.y),
						},
					},
				},
				scales: {
					x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 }, color: "#94a3b8" } },
					y: {
						beginAtZero: true,
						border: { display: false },
						grid: { color: "#f1f5f9" },
						ticks: {
							font: { size: 10 },
							color: "#94a3b8",
							callback: (v) => (m.money ? moneyShort(v) : v),
						},
					},
					// Cancelled rides on its own hidden axis, scaled down so it
					// reads as a reference line instead of competing with the
					// primary series.
					y1: {
						display: false,
						beginAtZero: true,
						position: "right",
						max: Math.max(3, ...cancelBuckets.map((b) => b.value)) * 3,
					},
				},
			},
		});
	}

	function renderStatusChart(cur) {
		const canvas = $("dashStatusChart");
		if (!canvas || typeof Chart === "undefined") return;
		const total = cur.counts.reduce((a, b) => a + b, 0);

		state.charts.status?.destroy();
		state.charts.status = new Chart(canvas, {
			type: "doughnut",
			data: {
				labels: STATUS.map((s) => s.name),
				datasets: [
					{
						data: cur.counts,
						backgroundColor: STATUS.map((s) => s.color),
						borderWidth: 3,
						borderColor: "#fff",
						hoverOffset: 8,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: "72%",
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: "rgba(15,23,42,0.94)",
						padding: 10,
						cornerRadius: 10,
						callbacks: {
							label: (c) =>
								" " + c.label + ": " + c.parsed +
								(total ? " (" + ((c.parsed / total) * 100).toFixed(1) + "%)" : ""),
						},
					},
				},
			},
		});

		$("dashDonutTotal").textContent = total.toLocaleString("en-US");
		$("dashStatusLegend").innerHTML = STATUS.map(
			(s, i) =>
				'<div class="dash-legend-item"><i style="background:' + s.color + '"></i>' +
				esc(s.name) + "<b>" + cur.counts[i] + "</b></div>",
		).join("");
	}

	// ── CSV export ───────────────────────────────────────────
	function exportCsv(orders, label) {
		const head = [
			"Order ID", "Created", "Status", "Merchant", "Driver",
			"Customer", "Phone", "District", "City", "Total", "Delivery Fee", "Express",
		];
		const cell = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
		const lines = [head.map(cell).join(",")];
		orders.forEach((o) => {
			const st = STATUS[isCancelled(o) ? 4 : o.s];
			lines.push(
				[
					o.id,
					new Date(o.createdAt).toISOString(),
					st ? st.name : o.s,
					o.m || "",
					o.driver || "",
					customerOf(o),
					o.c?.p || "",
					o.c?.loc?.d || "",
					o.c?.loc?.cty || "",
					o.pr?.t ?? 0,
					o.pr?.d ?? 0,
					o.e ? "yes" : "no",
				]
					.map(cell)
					.join(","),
			);
		});
		const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "godelivery-orders-" + label.toLowerCase().replace(/\s+/g, "-") + "-" +
			new Date().toISOString().slice(0, 10) + ".csv";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(a.href);
	}

	// ── main render pass ─────────────────────────────────────
	function render() {
		const data = window.__INIT_DATA__ || {};
		const all = Array.isArray(data.orders) ? data.orders : [];
		const merchants = data.merchants || [];
		const drivers = data.drivers || [];

		const { start, end, days, label } = periodRange(state.period);
		const current = all.filter((o) => inRange(o, start, end));

		let previous = [];
		if (start && days) {
			const prevEnd = new Date(start.getTime() - 1);
			const prevStart = new Date(start.getTime() - days * DAY_MS);
			previous = all.filter((o) => inRange(o, prevStart, prevEnd));
		}

		const cur = summarize(current);
		const prev = summarize(previous);

		// sparkline series over the current window
		const sparkDays = Math.min(days || 30, 30);
		const sparkStart = new Date();
		sparkStart.setHours(0, 0, 0, 0);
		sparkStart.setDate(sparkStart.getDate() - (sparkDays - 1));
		const sparkSet = all.filter((o) => inRange(o, sparkStart, new Date()));
		const series = {
			revenue: bucketByDay(sparkSet, sparkStart, sparkDays, revenueOf).map((b) => b.value),
			orders: bucketByDay(sparkSet, sparkStart, sparkDays, () => 1).map((b) => b.value),
			delivered: bucketByDay(sparkSet, sparkStart, sparkDays, (o) => (isDelivered(o) ? 1 : 0)).map((b) => b.value),
			cancelled: bucketByDay(sparkSet, sparkStart, sparkDays, (o) => (isCancelled(o) ? 1 : 0)).map((b) => b.value),
			fees: bucketByDay(sparkSet, sparkStart, sparkDays, (o) => (isDelivered(o) ? feeOf(o) : 0)).map((b) => b.value),
		};
		series.aov = series.revenue.map((v, i) => (series.orders[i] ? v / series.orders[i] : 0));

		renderKpis(cur, prev, series);
		renderPipeline(cur);
		renderTrendChart(current, start, days);
		renderStatusChart(cur);
		renderAlerts(all, merchants);
		renderMoney(all);
		renderMerchants(current);
		renderDrivers(current, drivers);
		renderRegions(current);
		renderHeatmap(current);
		renderFeed(all);

		$("dashScopeNote").textContent =
			label + " · " + cur.orders.toLocaleString("en-US") + " orders · " + money(cur.revenue);
		$("dashPeriodLabel").textContent = label;
		$("dashUpdated").textContent = new Date().toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});

		state.exportSet = { orders: current, label };
	}

	// ── wiring ───────────────────────────────────────────────
	function buildPeriodControl() {
		const wrap = $("dashPeriods");
		wrap.innerHTML = PERIODS.map(
			(p) =>
				'<button type="button" data-period="' + p.id + '"' +
				(p.id === state.period ? ' class="is-active"' : "") +
				">" + p.label + "</button>",
		).join("");
		wrap.addEventListener("click", (e) => {
			const btn = e.target.closest("button[data-period]");
			if (!btn) return;
			state.period = btn.dataset.period;
			localStorage.setItem("dashPeriod", state.period);
			wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
			render();
		});
	}

	function setAutoRefresh(on) {
		state.autoRefresh = on;
		localStorage.setItem("dashAutoRefresh", on ? "1" : "0");
		$("dashAutoBtn").classList.toggle("is-on", on);
		$("dashAutoBtn").innerHTML =
			'<i class="bx bx-' + (on ? "pause" : "play") + '-circle"></i> Auto-refresh ' + (on ? "on" : "off");
		clearInterval(state.refreshTimer);
		if (on) state.refreshTimer = setInterval(() => window.location.reload(), REFRESH_MS);
	}

	function greeting() {
		const h = new Date().getHours();
		if (h < 12) return "Good morning";
		if (h < 18) return "Good afternoon";
		return "Good evening";
	}

	function init() {
		if (!$("dashboard")) return;

		const user = window.__CURRENT_USER__ || {};
		const name = user.firstName || user.username || "Admin";
		$("dashGreeting").textContent = greeting() + ", " + name;
		$("dashToday").textContent = new Date().toLocaleDateString("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		});

		buildPeriodControl();

		$("dashTrendTabs").addEventListener("click", (e) => {
			const btn = e.target.closest("button[data-metric]");
			if (!btn) return;
			state.trendMetric = btn.dataset.metric;
			$("dashTrendTabs")
				.querySelectorAll("button")
				.forEach((b) => b.classList.toggle("is-active", b === btn));
			const { start, days } = periodRange(state.period);
			const all = window.__INIT_DATA__?.orders || [];
			renderTrendChart(all.filter((o) => inRange(o, start, new Date())), start, days);
		});

		$("dashRefreshBtn").addEventListener("click", () => window.location.reload());
		$("dashExportBtn").addEventListener("click", () => {
			const set = state.exportSet || { orders: [], label: "all" };
			exportCsv(set.orders, set.label);
		});
		$("dashPrintBtn").addEventListener("click", () => window.print());
		$("dashAutoBtn").addEventListener("click", () => setAutoRefresh(!state.autoRefresh));

		setAutoRefresh(state.autoRefresh);
		render();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
