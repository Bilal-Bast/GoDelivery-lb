import bcrypt from "bcrypt";

import prisma from "../config/prisma.js";
import { safeRedirect } from "../utils/urlSafeRedirect.js";
import {
	mapAccountTypeToPrisma,
	normalizeRoleForOutput,
	normalizeAccountTypeForOutput,
} from "../utils/roleMapper.js";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;

function isSuperAdminUsername(username) {
return Boolean(SUPER_ADMIN_USERNAME && username === SUPER_ADMIN_USERNAME);
}

function transformDeliveryCharges(deliveryCharges) {
if (!Array.isArray(deliveryCharges)) return {};
return deliveryCharges.reduce((result, item) => {
if (!item || item.region == null || item.price == null) {
return result;
}
result[item.region] = item.price;
return result;
}, {});
}

function serializeUser(user) {
if (!user) return user;
const result = { ...user };
if (Array.isArray(result.deliveryCharges)) {
result.deliveryCharges = transformDeliveryCharges(result.deliveryCharges);
} else {
result.deliveryCharges = {};
}
if (result.role) {
result.role = normalizeRoleForOutput(result.role);
}
if (result.accountType) {
result.accountType = normalizeAccountTypeForOutput(result.accountType);
}
delete result.password;
return result;
}

function serializeUsers(users) {
return users.map(serializeUser);
}

function normalizeDeliveryCharges(value) {
if (value == null) return {};
let parsed = value;
if (typeof parsed === "string") {
parsed = JSON.parse(parsed);
}
if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
return {};
}
return Object.entries(parsed).reduce((result, [region, price]) => {
if (region == null) return result;
const numericPrice = Number(price);
if (!Number.isFinite(numericPrice)) return result;
result[region] = numericPrice;
return result;
}, {});
}

function deliveryChargesRelationData(deliveryCharges) {
return Object.entries(deliveryCharges).map(([region, price]) => ({
region,
price,
}));
}

async function addAdmin(req, res, next) {
try {
const { username, email, password, firstName, lastName, phone } = req.body;

if (!username || !email || !password || !firstName || !phone) {
return res.status(400).json({ error: "Missing required fields" });
}

const existing = await prisma.user.findFirst({
where: {
OR: [{ username }, { email }],
},
});
if (existing)
return res
.status(400)
.json({ error: "Username or email already exists" });

const hashed = await bcrypt.hash(password, 10);
await prisma.user.create({
data: {
username,
email,
password: hashed,
role: "ADMIN",
firstName,
lastName,
phone,
},
});

res.status(201).json({
message: `Admin "${username}" created successfully`,
});
} catch (error) {
next(error);
}
}

async function addMerchant(req, res, next) {
try {
const {
username,
email,
password,
firstName,
lastName,
phone,
accountType,
cashPercentage,
paymentDay,
deliveryCharges,
} = req.body;

if (!username || !email || !password || !firstName || !phone) {
return res.status(400).json({ error: "Missing required fields" });
}
const prismaAccountType = mapAccountTypeToPrisma(accountType);
if (
prismaAccountType === "PREPAID" &&
(cashPercentage == null || cashPercentage < 0 || cashPercentage > 100)
) {
return res.status(400).json({ error: "Invalid cash percentage" });
}
if (prismaAccountType === "POSTPAID" && !paymentDay) {
return res.status(400).json({
error: "Payment day is required for postpaid accounts",
});
}

const existing = await prisma.user.findFirst({
where: {
OR: [{ username }, { email }],
},
});
if (existing)
return res
.status(400)
.json({ error: "Username or email already exists" });

const hashed = await bcrypt.hash(password, 10);
const charges = normalizeDeliveryCharges(deliveryCharges);
await prisma.user.create({
data: {
username,
email,
password: hashed,
role: "MERCHANT",
firstName,
lastName,
phone,
accountType: prismaAccountType,
cashPercentage:
prismaAccountType === "PREPAID"
? Number(cashPercentage)
: null,
paymentDay:
prismaAccountType === "POSTPAID" ? paymentDay : null,
deliveryCharges:
Object.keys(charges).length > 0
? { create: deliveryChargesRelationData(charges) }
: undefined,
},
});

res.status(201).json({
message: `Merchant "${username}" created successfully`,
});
} catch (error) {
next(error);
}
}

async function addDriver(req, res, next) {
try {
const { username, email, password, firstName, lastName, phone } = req.body;

if (!username || !email || !password || !firstName || !phone) {
return res.status(400).json({ error: "Missing required fields" });
}

const existing = await prisma.user.findFirst({
where: {
OR: [{ username }, { email }],
},
});
if (existing)
return res
.status(400)
.json({ error: "Username or email already exists" });

const hashed = await bcrypt.hash(password, 10);
await prisma.user.create({
data: {
username,
email,
password: hashed,
role: "DRIVER",
firstName,
lastName,
phone,
},
});

res.status(201).json({
message: `Driver "${username}" created successfully`,
});
} catch (error) {
next(error);
}
}

async function getUsers(req, res, next) {
try {
let users = await prisma.user.findMany({
include: {
deliveryCharges: true,
},
});
if (!isSuperAdminUsername(req.user?.username)) {
users = users.filter((u) => !isSuperAdminUsername(u.username));
}
res.json(serializeUsers(users));
} catch (error) {
next(error);
}
}

async function getMerchants(req, res, next) {
try {
const where = { role: "MERCHANT" };
if (req.query.username) {
where.username = req.query.username;
}
const merchants = await prisma.user.findMany({
where,
include: {
deliveryCharges: true,
},
});
res.json(serializeUsers(merchants));
} catch (error) {
next(error);
}
}

async function getMerchantByUsername(req, res, next) {
try {
const merchant = await prisma.user.findFirst({
where: {
username: req.params.username,
role: "MERCHANT",
},
include: {
deliveryCharges: true,
},
});
if (!merchant)
return res.status(404).json({ error: "Merchant not found" });
res.json(serializeUser(merchant));
} catch (error) {
next(error);
}
}

async function deleteUser(req, res, next) {
try {
if (!req.params.id) {
return res.status(400).json({ error: "Invalid user ID" });
}
const target = await prisma.user.findUnique({
where: { id: req.params.id },
});
if (!target) return res.status(404).json({ error: "User not found" });
if (
isSuperAdminUsername(target.username) &&
!isSuperAdminUsername(req.user?.username)
) {
return res.status(403).json({ error: "Forbidden" });
}

await prisma.user.delete({ where: { id: req.params.id } });
res.json({ message: "User deleted" });
} catch (error) {
next(error);
}
}

async function getUser(req, res, next) {
try {
if (!req.params.id) {
return res.status(400).json({ error: "Invalid user ID" });
}
const user = await prisma.user.findUnique({
where: { id: req.params.id },
include: { deliveryCharges: true },
});
if (!user) return res.status(404).json({ error: "User not found" });
if (
isSuperAdminUsername(user.username) &&
!isSuperAdminUsername(req.user?.username)
) {
return res.status(403).json({ error: "Forbidden" });
}
res.json(serializeUser(user));
} catch (error) {
next(error);
}
}

async function updateUser(req, res, next) {
try {
if (!req.params.id) {
return res.status(400).json({ error: "Invalid user ID" });
}
const user = await prisma.user.findUnique({
where: { id: req.params.id },
});
if (!user) return res.status(404).json({ error: "User not found" });
if (
isSuperAdminUsername(user.username) &&
!isSuperAdminUsername(req.user?.username)
) {
return res.status(403).json({ error: "Forbidden" });
}

const data = {};
if (req.body.username) {
data.username = req.body.username;
}
if (req.body.password) {
data.password = await bcrypt.hash(req.body.password, 10);
}

await prisma.user.update({
where: { id: req.params.id },
data,
});
res.json({ message: "Profile updated" });
} catch (error) {
next(error);
}
}

async function updateMerchant(req, res, next) {
try {
if (!req.params.id) {
return res.status(400).json({ error: "Invalid user ID" });
}
const merchant = await prisma.user.findUnique({
where: { id: req.params.id },
});
if (!merchant || merchant.role !== "MERCHANT") {
return res.status(404).json({ message: "Merchant not found" });
}

const data = {};
if (req.body.deliveryCharges != null) {
let charges;
try {
charges = normalizeDeliveryCharges(req.body.deliveryCharges);
} catch (error) {
return res
.status(400)
.json({ error: "Invalid deliveryCharges JSON" });
}
data.deliveryCharges = {
deleteMany: {},
create: deliveryChargesRelationData(charges),
};
}

const updatedMerchant = await prisma.user.update({
where: { id: req.params.id },
data,
include: { deliveryCharges: true },
});

res.json({
message: "Merchant updated successfully",
merchant: serializeUser(updatedMerchant),
});
} catch (error) {
next(error);
}
}

async function updateMerchantSSR(req, res, next) {
try {
const merchantId = req.body.merchantId || req.body.id;
if (!merchantId)
return res.redirect("/settings?error=Missing+merchant+id");

const merchant = await prisma.user.findUnique({
where: { id: merchantId },
});
if (!merchant || merchant.role !== "MERCHANT")
return res.redirect("/settings?error=Merchant+not+found");

let deliveryCharges = req.body.deliveryCharges || req.body.deliveryChargesJson;
try {
deliveryCharges = normalizeDeliveryCharges(deliveryCharges);
} catch (e) {
console.error("Invalid deliveryCharges JSON", e);
return res.redirect("/settings?error=Invalid+delivery+charges");
}

await prisma.user.update({
where: { id: merchantId },
data: {
deliveryCharges: {
deleteMany: {},
create: deliveryChargesRelationData(deliveryCharges),
},
},
});
return res.redirect("/settings?success=1");
} catch (err) {
console.error("updateMerchantSSR error:", err);
return res.redirect("/settings?error=Failed+to+update+merchant");
}
}

export {
addAdmin,
addMerchant,
addDriver,
getUsers,
getMerchants,
getMerchantByUsername,
deleteUser,
getUser,
updateUser,
updateMerchant,
};

async function addAdminSSR(req, res, next) {
try {
let payload = req.body;
if (payload.payload) {
try {
payload = JSON.parse(payload.payload);
} catch {}
}

const { username, email, password, firstName, lastName, phone } = payload;
if (!username || !email || !password || !firstName || !phone) {
return res.redirect("/settings?error=Missing+required+fields");
}
if (password.length < 6) {
return res.redirect("/settings?error=Password+too+short");
}

const existing = await prisma.user.findUnique({
where: { username },
});
if (existing) return res.redirect("/settings?error=Username+exists");

const hashed = await bcrypt.hash(password, 10);
await prisma.user.create({
data: {
username,
email,
password: hashed,
role: "ADMIN",
firstName,
lastName,
phone,
},
});
return res.redirect("/settings?success=1");
} catch (err) {
console.error("addAdminSSR error:", err);
return res.redirect("/settings?error=Failed+to+create+admin");
}
}

async function addDriverSSR(req, res, next) {
try {
let payload = req.body;
if (payload.payload) {
try {
payload = JSON.parse(payload.payload);
} catch {}
}
const { username, email, password, firstName, lastName, phone } = payload;
if (!username || !email || !password || !firstName || !phone) {
return res.redirect("/settings?error=Missing+required+fields");
}
if (password.length < 6) {
return res.redirect("/settings?error=Password+too+short");
}
const existing = await prisma.user.findUnique({
where: { username },
});
if (existing) return res.redirect("/settings?error=Username+exists");

const hashed = await bcrypt.hash(password, 10);
await prisma.user.create({
data: {
username,
email,
password: hashed,
role: "DRIVER",
firstName,
lastName,
phone,
},
});
return res.redirect("/settings?success=1");
} catch (err) {
console.error("addDriverSSR error:", err);
return res.redirect("/settings?error=Failed+to+create+driver");
}
}

async function addMerchantSSR(req, res, next) {
try {
let payload = req.body;
if (payload.payload) {
try {
payload = JSON.parse(payload.payload);
} catch {}
}
const {
username,
email,
password,
firstName,
lastName,
phone,
accountType,
cashPercentage,
paymentDay,
deliveryCharges,
} = payload;

if (!username || !email || !password || !firstName || !phone) {
return res.redirect("/settings?error=Missing+required+fields");
}
if (password.length < 6) {
return res.redirect("/settings?error=Password+too+short");
}
const prismaAccountType = mapAccountTypeToPrisma(accountType);
if (
prismaAccountType === "PREPAID" &&
(cashPercentage == null || cashPercentage < 0 || cashPercentage > 100)
) {
return res.redirect("/settings?error=Invalid+cash+percentage");
}
if (prismaAccountType === "POSTPAID" && !paymentDay) {
return res.redirect("/settings?error=Payment+day+required");
}
const existing = await prisma.user.findUnique({
where: { username },
});
if (existing) return res.redirect("/settings?error=Username+exists");

const hashed = await bcrypt.hash(password, 10);
const charges = normalizeDeliveryCharges(deliveryCharges);
await prisma.user.create({
data: {
username,
email,
password: hashed,
role: "MERCHANT",
firstName,
lastName,
phone,
accountType: prismaAccountType,
cashPercentage:
prismaAccountType === "PREPAID"
? Number(cashPercentage)
: null,
paymentDay:
prismaAccountType === "POSTPAID" ? paymentDay : null,
deliveryCharges:
Object.keys(charges).length > 0
? { create: deliveryChargesRelationData(charges) }
: undefined,
},
});
return res.redirect("/settings?success=1");
} catch (err) {
console.error("addMerchantSSR error:", err);
return res.redirect("/settings?error=Failed+to+create+merchant");
}
}

async function deleteUserSSR(req, res, next) {
try {
const id = req.body.id || req.body.userId;
if (!id)
return res.redirect(
safeRedirect("/users", { error: "Missing user id" }),
);

const target = await prisma.user.findUnique({
where: { id },
});
if (!target)
return res.redirect(
safeRedirect("/users", { error: "User not found" }),
);
if (
isSuperAdminUsername(target.username) &&
!isSuperAdminUsername(req.user?.username)
) {
return res.redirect(
safeRedirect("/users", { error: "Forbidden" }),
);
}

await prisma.user.delete({ where: { id } });
return res.redirect(safeRedirect("/users", { success: "1" }));
} catch (error) {
console.error("deleteUserSSR error:", error);
return res.redirect(
safeRedirect("/users", { error: "Failed to delete user" }),
);
}
}

export { addAdminSSR, addDriverSSR, addMerchantSSR, deleteUserSSR, updateMerchantSSR };
