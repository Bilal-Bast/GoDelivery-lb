import { body, param } from "express-validator";

export const createOrderValidators = [
	body("id").notEmpty().withMessage("id is required"),
	body("m").notEmpty().withMessage("merchant is required"),
	body("c.f").notEmpty().withMessage("customer first name is required"),
	body("c.p").notEmpty().withMessage("customer phone is required"),
	body("c.loc.d").notEmpty().withMessage("district is required"),
	body("c.loc.cty").notEmpty().withMessage("city is required"),
	body("pr.t").isNumeric().withMessage("total price must be a number"),
	body("pr.d")
		.optional()
		.isNumeric()
		.withMessage("delivery charge must be a number"),
	body("s").optional().isInt({ min: 0, max: 6 }).withMessage("status must be 0-6"),
];

export const updateOrderValidators = [
	param("id").notEmpty().withMessage("order id is required"),
	body("m").optional().isString(),
	body("c.f").optional().isString(),
	body("c.p").optional().isString(),
	body("pr.t").optional().isNumeric().withMessage("total price must be a number"),
	body("pr.d")
		.optional()
		.isNumeric()
		.withMessage("delivery charge must be a number"),
	body("s").optional().isInt({ min: 0, max: 6 }).withMessage("status must be 0-6"),
];

export const updateOrderStatusValidators = [
	param("id").notEmpty().withMessage("order id is required"),
	body("s").notEmpty().withMessage("status is required"),
];

export const createPaymentValidators = [
	body("merchantUsername")
		.notEmpty()
		.withMessage("merchantUsername is required"),
	body("orderIds")
		.custom((v) => {
			if (!v) return false;
			if (Array.isArray(v) && v.length) return true;
			if (typeof v === "string" && v.trim()) return true;
			return false;
		})
		.withMessage(
			"orderIds must be a non-empty array or comma-separated string",
		),
	body("amount").optional().isNumeric().withMessage("amount must be numeric"),
];

export const createCollectionValidators = [
	body("driverUsername").notEmpty().withMessage("driverUsername is required"),
	body("orderIds")
		.custom((v) => {
			if (!v) return false;
			if (Array.isArray(v) && v.length) return true;
			if (typeof v === "string" && v.trim()) return true;
			return false;
		})
		.withMessage(
			"orderIds must be a non-empty array or comma-separated string",
		),
	body("amount").optional().isNumeric().withMessage("amount must be numeric"),
];

export const addAdminValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("email")
		.notEmpty()
		.withMessage("email is required")
		.isEmail()
		.withMessage("email must be valid"),
	body("firstName").optional().isString(),
	body("lastName").optional().isString(),
	body("password")
		.notEmpty()
		.withMessage("password is required")
		.isLength({ min: 8 })
		.withMessage("password must be at least 8 characters")
		.matches(/[a-z]/)
		.withMessage("password must contain a lowercase letter")
		.matches(/[A-Z]/)
		.withMessage("password must contain an uppercase letter")
		.matches(/[0-9]/)
		.withMessage("password must contain a number")
		.matches(/[!@#$%^&*]/)
		.withMessage("password must contain a special character (!@#$%^&*)"),
];

export const addDriverValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("email")
		.notEmpty()
		.withMessage("email is required")
		.isEmail()
		.withMessage("email must be valid"),
	body("password")
		.notEmpty()
		.withMessage("password is required")
		.isLength({ min: 8 })
		.withMessage("password must be at least 8 characters")
		.matches(/[a-z]/)
		.withMessage("password must contain a lowercase letter")
		.matches(/[A-Z]/)
		.withMessage("password must contain an uppercase letter")
		.matches(/[0-9]/)
		.withMessage("password must contain a number")
		.matches(/[!@#$%^&*]/)
		.withMessage("password must contain a special character (!@#$%^&*)"),
	body("firstName").optional().isString(),
	body("lastName").optional().isString(),
];

export const addMerchantValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("email")
		.notEmpty()
		.withMessage("email is required")
		.isEmail()
		.withMessage("email must be valid"),
	body("password")
		.notEmpty()
		.withMessage("password is required")
		.isLength({ min: 8 })
		.withMessage("password must be at least 8 characters")
		.matches(/[a-z]/)
		.withMessage("password must contain a lowercase letter")
		.matches(/[A-Z]/)
		.withMessage("password must contain an uppercase letter")
		.matches(/[0-9]/)
		.withMessage("password must contain a number")
		.matches(/[!@#$%^&*]/)
		.withMessage("password must contain a special character (!@#$%^&*)"),
	body("accountType").optional().isIn(["prepaid", "postpaid"]),
];

export const updateUserValidators = [
	param("id").notEmpty().withMessage("user id is required"),
	body("firstName").optional().isString(),
	body("lastName").optional().isString(),
	body("paymentDay").optional().isString(),
	body("password")
		.optional()
		.isLength({ min: 8 })
		.withMessage("password must be at least 8 characters")
		.matches(/[a-z]/)
		.withMessage("password must contain a lowercase letter")
		.matches(/[A-Z]/)
		.withMessage("password must contain an uppercase letter")
		.matches(/[0-9]/)
		.withMessage("password must contain a number")
		.matches(/[!@#$%^&*]/)
		.withMessage("password must contain a special character (!@#$%^&*)"),
];

export const loginValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("password").notEmpty().withMessage("password is required"),
];

const strongPassword = body("newPassword")
	.notEmpty()
	.withMessage("newPassword is required")
	.isLength({ min: 8 })
	.withMessage("password must be at least 8 characters")
	.matches(/[a-z]/)
	.withMessage("password must contain a lowercase letter")
	.matches(/[A-Z]/)
	.withMessage("password must contain an uppercase letter")
	.matches(/[0-9]/)
	.withMessage("password must contain a number")
	.matches(/[!@#$%^&*]/)
	.withMessage("password must contain a special character (!@#$%^&*)");

export const changePasswordValidators = [
	body("currentPassword").notEmpty().withMessage("currentPassword is required"),
	strongPassword,
];

export const forgotPasswordValidators = [
	body("email")
		.notEmpty()
		.withMessage("email is required")
		.isEmail()
		.withMessage("email must be valid"),
];

export const resetPasswordValidators = [
	body("token").notEmpty().withMessage("token is required"),
	strongPassword,
];

export const addLocationValidators = [
	body("district").notEmpty().withMessage("district is required"),
	body("cityEn").notEmpty().withMessage("cityEn is required"),
	body("cityAr").optional().isString(),
];
