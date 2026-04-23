import Location from "../models/location.model.js";

async function getLocations(req, res) {
	try {
		const locations = await Location.find();
		res.json(locations);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function addLocation(req, res) {
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
		console.error("POST /locations error:", error);
		res.status(500).json({ message: error.message });
	}
}

async function deleteLocation(req, res) {
	try {
		await Location.findByIdAndDelete(req.params.id);
		res.json({ message: "Location deleted" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

export { getLocations, addLocation, deleteLocation };
