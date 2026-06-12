const { authorizeRoles } = require("./authMiddleware");

module.exports = authorizeRoles("admin");
