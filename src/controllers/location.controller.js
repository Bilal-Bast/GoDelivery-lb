import Location from "../models/location.model.js";

async function getLocations(req, res, next) {
	try {
		const locations = await Location.find();
		res.json(locations);
	} catch (error) {
		next(error);
	}
}

async function addLocation(req, res, next) {
	try {
		const { district, cityEn, cityAr } = req.body;

		if (!district || !cityEn) {
			return res
				.status(400)
				.json({ message: "District and city are required" });
		}

		let location = await Location.findOne({ "district.en": district });

		if (location) {
			const exists = location.cities.some((city) => city.en === cityEn);
			if (!exists) {
				location.cities.push({ en: cityEn, ar: cityAr || cityEn });
				await location.save();
			}
		} else {
			location = new Location({
				district: { en: district, ar: district },
				cities: [{ en: cityEn, ar: cityAr || cityEn }],
			});
			await location.save();
		}

		res.json(location);
	} catch (error) {
		// Log error but don't expose details to client
		if (process.env.NODE_ENV !== "production") {
			console.error("POST /locations error:", error);
		}
		next(error);
	}
}

async function deleteLocation(req, res, next) {
	try {
		await Location.findByIdAndDelete(req.params.id);
		res.json({ message: "Location deleted" });
	} catch (error) {
		next(error);
	}
}

export { getLocations, addLocation, deleteLocation };

// SSR wrapper for adding a location via server-rendered form
async function addLocationSSR(req, res, next) {
	try {
		const { district, cityEn, cityAr } = req.body;

		if (!district || !cityEn) {
			return res.redirect("/settings?error=District+and+city+required");
		}

		let location = await Location.findOne({ "district.en": district });

		if (location) {
			const exists = location.cities.some((city) => city.en === cityEn);
			if (!exists) {
				location.cities.push({ en: cityEn, ar: cityAr || cityEn });
				await location.save();
			}
		} else {
			location = new Location({
				district: { en: district, ar: district },
				cities: [{ en: cityEn, ar: cityAr || cityEn }],
			});
			await location.save();
		}

		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("addLocationSSR error:", err);
		return res.redirect("/settings?error=Failed+to+add+location");
	}
}

export { addLocationSSR };
