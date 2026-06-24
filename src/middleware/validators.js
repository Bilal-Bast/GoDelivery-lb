import { body, param } from "express-validator";

export const createOrderValidators = [
	body("m").notEmpty().withMessage("merchant is required"),
	body("items")
		.isArray({ min: 1 })
		.withMessage("items must be a non-empty array"),
	body("amount")
		.optional()
		.isNumeric()
		.withMessage("amount must be a number"),
];

export const updateOrderValidators = [
	param("id").notEmpty().withMessage("order id is required"),
	body("items").optional().isArray().withMessage("items must be an array"),
	body("m").optional().isString(),
	body("amount")
		.optional()
		.isNumeric()
		.withMessage("amount must be a number"),
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
	body("firstName").optional().isString(),
	body("lastName").optional().isString(),
	body("password").notEmpty().withMessage("password is required"),
];

export const addDriverValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("firstName").optional().isString(),
	body("lastName").optional().isString(),
];

export const addMerchantValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("accountType").optional().isIn(["prepaid", "postpaid"]),
];

export const updateUserValidators = [
	param("id").notEmpty().withMessage("user id is required"),
	body("firstName").optional().isString(),
	body("lastName").optional().isString(),
	body("paymentDay").optional().isString(),
];

export const loginValidators = [
	body("username").notEmpty().withMessage("username is required"),
	body("password").notEmpty().withMessage("password is required"),
];

export const addLocationValidators = [
	body("district").notEmpty().withMessage("district is required"),
	body("cityEn").notEmpty().withMessage("cityEn is required"),
	body("cityAr").optional().isString(),
];
