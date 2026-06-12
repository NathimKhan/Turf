const express = require("express");
const { param } = require("express-validator");
const { deleteUser, getUserById, getUsers, updateUser, updateUserValidation } = require("../controllers/userController");
const adminOnly = require("../middleware/adminMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/errorMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", getUsers);
router.get("/:id", param("id").isMongoId().withMessage("Valid user id is required"), validateRequest, getUserById);
router.put("/:id", upload.single("profileImage"), updateUserValidation, validateRequest, updateUser);
router.delete("/:id", param("id").isMongoId().withMessage("Valid user id is required"), validateRequest, deleteUser);

module.exports = router;
