(async () => {
	try {
		await import("./app.js");
		console.log("imported");
	} catch (e) {
		console.error("IMPORT ERR", e && (e.stack || e));
		process.exit(1);
	}
})();
