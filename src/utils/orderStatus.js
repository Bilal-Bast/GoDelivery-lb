// Single source of truth for the legacy numeric order status (0-6) <-> Prisma OrderStatus enum mapping.
// Order matters: index N here must match the Order model's original numeric status N.

const statusNumberToEnum = [
	"WAREHOUSE",
	"NEW",
	"Picked_up",
	"DELIVERED",
	"Canceled",
	"Paid",
	"COLLECTED",
];

const statusEnumToNumber = {
	WAREHOUSE: 0,
	NEW: 1,
	Picked_up: 2,
	DELIVERED: 3,
	Canceled: 4,
	Paid: 5,
	COLLECTED: 6,
};

const statusNames = [
	"Warehouse",
	"New",
	"Picked Up",
	"Delivered",
	"Cancelled",
	"Paid",
	"Collected",
];

const legacyStatusMap = {
	Warehouse: 0,
	New: 1,
	"Picked up": 2,
	Delivered: 3,
	Cancelled: 4,
	Paid: 5,
	Collected: 6,
};

export { statusNumberToEnum, statusEnumToNumber, statusNames, legacyStatusMap };
