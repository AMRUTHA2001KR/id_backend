const fs = require("fs");
const os = require("os");
const path = require("path");
const QRCode = require("qrcode");
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  getEmployeeByCompanyId,
  updateEmployeeById,
  deleteEmployeeById,
} = require("../models/employeeModel");

const genericServerError = { message: "Something went wrong. Please try again." };

const publicBaseUrl = (req) =>
  process.env.SERVER_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;

const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

const getLocalIpv4 = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
};

const profileBaseUrl = (req) => {
  if (process.env.FRONTEND_BASE_URL) {
    return trimTrailingSlash(process.env.FRONTEND_BASE_URL);
  }

  const requestedHost = req.get("host") || "";
  const isLocalhost =
    requestedHost.includes("localhost") || requestedHost.includes("127.0.0.1");
  if (!isLocalhost) {
    return `${req.protocol}://${requestedHost}`;
  }

  const lanIp = getLocalIpv4();
  const frontendPort = process.env.FRONTEND_PORT || "5173";
  if (lanIp) {
    return `http://${lanIp}:${frontendPort}`;
  }

  return "http://localhost:5173";
};

const ensureQrDir = () => {
  const qrDir = path.join(__dirname, "..", "uploads", "qrcodes");
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }
  return qrDir;
};

const employeePayload = (body, imageUrl, qrCodeUrl) => ({
  name: body.name,
  designation: body.designation,
  companyId: body.companyId,
  joiningDate: body.joiningDate,
  emergencyContact: body.emergencyContact,
  bloodGroup: body.bloodGroup,
  imageUrl,
  qrCodeUrl,
});

// vCard so both iOS and Android cameras show a contact card with the details.
const vcardEscape = (v) =>
  String(v || "")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");

const qrDetailsText = (b) => {
  const date = String(b.joiningDate || "").slice(0, 10);
  const companyId = String(b.companyId || "").trim();
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(b.name)}`,
    `N:${vcardEscape(b.name)};;;;`,
    "ORG:Inversa Technosoft",
    `TITLE:${vcardEscape(b.designation)}`,
    `TEL;TYPE=CELL:${vcardEscape(b.emergencyContact)}`,
  ];
  if (companyId.includes("@")) lines.push(`EMAIL:${vcardEscape(companyId)}`);
  lines.push(
    `NOTE:${vcardEscape(
      `Company ID: ${companyId}\nJoining Date: ${date}\nEmergency Contact: ${String(b.emergencyContact || "").trim()}\nBlood Group: ${String(b.bloodGroup || "").trim()}`
    )}`,
    "END:VCARD"
  );
  return lines.join("\r\n");
};

const addEmployee = async (req, res) => {
  try {
    const requiredFields = [
      "name",
      "designation",
      "companyId",
      "joiningDate",
      "emergencyContact",
      "bloodGroup",
    ];
    const missing = requiredFields.find((field) => !req.body[field]);
    if (missing) {
      return res.status(400).json({ message: `Missing field: ${missing}` });
    }

    const qrDir = ensureQrDir();
    const qrFileName = `${req.body.companyId}.png`;
    const qrFilePath = path.join(qrDir, qrFileName);
    await QRCode.toFile(qrFilePath, qrDetailsText(req.body), {
      color: { dark: "#000000", light: "#ffffff" },
      width: 600,
      margin: 4,
      errorCorrectionLevel: "L",
    });

    const serverUrl = publicBaseUrl(req);
    const imageUrl = req.file ? `${serverUrl}/uploads/${req.file.filename}` : null;
    const qrCodeUrl = `${serverUrl}/uploads/qrcodes/${qrFileName}`;
    const employee = await createEmployee(
      employeePayload(req.body, imageUrl, qrCodeUrl)
    );

    return res.status(201).json(employee);
  } catch (error) {
    console.error("addEmployee error:", error.message);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Company ID already exists." });
    }
    return res.status(500).json(genericServerError);
  }
};

const listEmployees = async (req, res) => {
  try {
    const employees = await getEmployees();
    return res.json(employees);
  } catch (error) {
    console.error("listEmployees error:", error.message);
    return res.status(500).json(genericServerError);
  }
};

const getEmployee = async (req, res) => {
  try {
    const employee = await getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }
    return res.json(employee);
  } catch (error) {
    console.error("getEmployee error:", error.message);
    return res.status(500).json(genericServerError);
  }
};

const getEmployeeByCompany = async (req, res) => {
  try {
    const employee = await getEmployeeByCompanyId(req.params.companyId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }
    return res.json(employee);
  } catch (error) {
    console.error("getEmployeeByCompany error:", error.message);
    return res.status(500).json(genericServerError);
  }
};

const updateEmployee = async (req, res) => {
  try {
    const existingEmployee = await getEmployeeById(req.params.id);
    if (!existingEmployee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    let imageUrl = existingEmployee.image_url;
    if (req.file) {
      imageUrl = `${publicBaseUrl(req)}/uploads/${req.file.filename}`;
    }

    const qrDir = ensureQrDir();
    const qrFileName = `${req.body.companyId}.png`;
    const qrFilePath = path.join(qrDir, qrFileName);
    await QRCode.toFile(qrFilePath, qrDetailsText(req.body), {
      width: 600,
      margin: 4,
      errorCorrectionLevel: "L",
    });

    const qrCodeUrl = `${publicBaseUrl(req)}/uploads/qrcodes/${qrFileName}`;
    const updated = await updateEmployeeById(
      req.params.id,
      employeePayload(req.body, imageUrl, qrCodeUrl)
    );

    return res.json(updated);
  } catch (error) {
    console.error("updateEmployee error:", error.message);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Company ID already exists." });
    }
    return res.status(500).json(genericServerError);
  }
};

const removeEmployee = async (req, res) => {
  try {
    const deleted = await deleteEmployeeById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Employee not found." });
    }
    return res.json({ message: "Employee deleted successfully." });
  } catch (error) {
    console.error("removeEmployee error:", error.message);
    return res.status(500).json(genericServerError);
  }
};

module.exports = {
  addEmployee,
  listEmployees,
  getEmployee,
  getEmployeeByCompany,
  updateEmployee,
  removeEmployee,
};
