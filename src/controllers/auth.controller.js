import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "SECRETKEY123";

async function login(req, res) {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });

		if (!user) {
			return res
				.status(400)
				.json({ error: "Invalid username or password" });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res
				.status(400)
				.json({ error: "Invalid username or password" });
		}

		const token = jwt.sign(
			{ id: user._id, role: user.role, username: user.username },
			JWT_SECRET,
			{ expiresIn: "1d" },
		);

		res.json({ token, role: user.role, username: user.username });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
}

export { login };
