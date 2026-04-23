function driverOnly(req, res, next) {
	if (req.user?.role !== "driver") {
		return res.status(403).json({ error: "Driver access required" });
	}
	next();
}

export default driverOnly;
