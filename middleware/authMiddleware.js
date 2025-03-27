import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Simpan data user di req.user
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

export default authMiddleware;
