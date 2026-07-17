import prisma from "../config/prisma.js";
import lebanonDistricts from "../data/lebanon-locations.js";

async function seedLocations() {
	const count = await prisma.district.count();
	if (count > 0) return;

	for (const district of lebanonDistricts) {
		await prisma.district.create({
			data: {
				nameEn: district.districtEn,
				nameAr: district.districtAr,
				cities: {
					create: district.citiesEn
						.map((cityEn, index) => ({
							nameEn: cityEn,
							nameAr: district.citiesAr[index],
						}))
						.filter((city) => city.nameAr),
				},
			},
		});
	}

	console.log("Locations seeded successfully");
}

export default seedLocations;
