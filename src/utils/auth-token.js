import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function signAuthToken(user) {
	return jwt.sign(
		{
			id: user.id,
			role: user.role,
			username: user.username,
		},
		JWT_SECRET,
		{ expiresIn: AUTH_TOKEN_TTL_SECONDS },
	);
}

function setAuthCookie(res, token) {
	res.cookie("token", token, {
		httpOnly: true,
		sameSite: "strict",
		maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
		secure: process.env.NODE_ENV === "production",
	});
}

function renewAuthCookie(res, user) {
	const token = signAuthToken(user);
	setAuthCookie(res, token);
	return token;
}

export { signAuthToken, setAuthCookie, renewAuthCookie };
