const { authorizeRoles } = require("./authMiddleware");

module.exports = authorizeRoles("owner", "admin");
