const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const basename = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    cb(null, `${Date.now()}-${basename || "image"}${extension}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  return cb(new Error("Only image uploads are allowed"), false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
