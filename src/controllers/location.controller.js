import prisma from "../config/prisma.js";

function mapDistrictToLocation(district) {
	return {
		id: district.id,
		district: { en: district.nameEn, ar: district.nameAr },
		cities: district.cities.map((city) => ({
			en: city.nameEn,
			ar: city.nameAr,
		})),
		createdAt: district.createdAt,
		updatedAt: district.updatedAt,
	};
}

async function getLocations(req, res, next) {
	try {
		const districts = await prisma.district.findMany({
			include: { cities: true },
			orderBy: { nameEn: "asc" },
		});
		res.json(districts.map(mapDistrictToLocation));
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

		let existingDistrict = await prisma.district.findFirst({
			where: { nameEn: district },
			include: { cities: true },
		});

		if (existingDistrict) {
			const exists = existingDistrict.cities.some(
				(city) => city.nameEn === cityEn,
			);
			if (!exists) {
				await prisma.city.create({
					data: {
						districtId: existingDistrict.id,
						nameEn: cityEn,
						nameAr: cityAr || cityEn,
					},
				});
			}

			const updatedCities = await prisma.city.findMany({
				where: { districtId: existingDistrict.id },
			});
			res.json({
				id: existingDistrict.id,
				district: {
					en: existingDistrict.nameEn,
					ar: existingDistrict.nameAr,
				},
				cities: updatedCities.map((city) => ({
					en: city.nameEn,
					ar: city.nameAr,
				})),
				createdAt: existingDistrict.createdAt,
				updatedAt: existingDistrict.updatedAt,
			});
		} else {
			const newDistrict = await prisma.district.create({
				data: {
					nameEn: district,
					nameAr: district,
					cities: {
						create: [
							{ nameEn: cityEn, nameAr: cityAr || cityEn },
						],
					},
				},
				include: { cities: true },
			});

			res.json(mapDistrictToLocation(newDistrict));
		}
	} catch (error) {
		if (process.env.NODE_ENV !== "production") {
			console.error("POST /locations error:", error);
		}
		next(error);
	}
}

async function deleteLocation(req, res, next) {
	try {
		const districtId = req.params.id;
		await prisma.$transaction([
			prisma.city.deleteMany({ where: { districtId } }),
			prisma.district.delete({ where: { id: districtId } }),
		]);
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

		let existingDistrict = await prisma.district.findFirst({
			where: { nameEn: district },
			include: { cities: true },
		});

		if (existingDistrict) {
			const exists = existingDistrict.cities.some(
				(city) => city.nameEn === cityEn,
			);
			if (!exists) {
				await prisma.city.create({
					data: {
						districtId: existingDistrict.id,
						nameEn: cityEn,
						nameAr: cityAr || cityEn,
					},
				});
			}
		} else {
			await prisma.district.create({
				data: {
					nameEn: district,
					nameAr: district,
					cities: {
						create: [
							{ nameEn: cityEn, nameAr: cityAr || cityEn },
						],
					},
				},
			});
		}

		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("addLocationSSR error:", err);
		return res.redirect("/settings?error=Failed+to+add+location");
	}
}

export { addLocationSSR };
