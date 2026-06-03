import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET;

async function login(req, res, next) {
	try {
		const { username, password } = req.body;
		if (!username || !password) {
			return res
				.status(400)
				.json({ error: "Username and password are required" });
		}
		const user = await User.findOne({ username });
		if (!user) {
			return res
				.status(401)
				.json({ error: "Invalid username or password" });
		}
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res
				.status(401)
				.json({ error: "Invalid username or password" });
		}
		const token = jwt.sign(
			{
				id: user._id,
				role: user.role,
				username: user.username,
			},
			JWT_SECRET,
			{ expiresIn: "1d" },
		);
		// Set HTTP-only cookie for SSR pages
		res.cookie("token", token, {
			httpOnly: true,
			sameSite: "strict",
			maxAge: 24 * 60 * 60 * 1000, // 1 day
			secure: process.env.NODE_ENV === "production",
		});

		res.json({
			token,
			role: user.role,
			username: user.username,
			user: {
				id: user._id,
				role: user.role,
				username: user.username,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		next(error);
	}
}

async function getMe(req, res, next) {
	try {
		const user = await User.findById(req.user.id).select("-password");
		if (!user) return res.status(404).json({ error: "User not found" });
		res.json(user);
	} catch (error) {
		next(error);
	}
}

function logout(req, res) {
	res.clearCookie("token");
	res.redirect("/signin");
}

export { login, getMe, logout };
