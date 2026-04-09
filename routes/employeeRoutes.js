const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  addEmployee,
  listEmployees,
  getEmployee,
  getEmployeeByCompany,
  updateEmployee,
  removeEmployee,
} = require("../controllers/employeeController");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e8)}${ext}`;
    cb(null, safeName);
  },
});

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      return cb(new Error("Only jpg, png, and webp images are allowed."));
    }
    return cb(null, true);
  },
});

router.post("/", upload.single("image"), addEmployee);
router.get("/", listEmployees);
router.get("/company/:companyId", getEmployeeByCompany);
router.get("/:id", getEmployee);
router.put("/:id", upload.single("image"), updateEmployee);
router.delete("/:id", removeEmployee);

module.exports = router;
