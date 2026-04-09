const pool = require("../config/db");

const createEmployee = async (employee) => {
  const {
    name,
    designation,
    companyId,
    joiningDate,
    emergencyContact,
    bloodGroup,
    imageUrl,
    qrCodeUrl,
  } = employee;

  const query = `
    INSERT INTO employees
      (name, designation, company_id, joining_date, emergency_contact, blood_group, image_url, qr_code_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *;
  `;

  const values = [
    name,
    designation,
    companyId,
    joiningDate,
    emergencyContact,
    bloodGroup,
    imageUrl,
    qrCodeUrl,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getEmployees = async () => {
  const { rows } = await pool.query("SELECT * FROM employees ORDER BY id DESC;");
  return rows;
};

const getEmployeeById = async (id) => {
  const { rows } = await pool.query("SELECT * FROM employees WHERE id = $1;", [id]);
  return rows[0];
};

const getEmployeeByCompanyId = async (companyId) => {
  const { rows } = await pool.query(
    "SELECT * FROM employees WHERE company_id = $1;",
    [companyId]
  );
  return rows[0];
};

const updateEmployeeById = async (id, employee) => {
  const {
    name,
    designation,
    companyId,
    joiningDate,
    emergencyContact,
    bloodGroup,
    imageUrl,
    qrCodeUrl,
  } = employee;

  const query = `
    UPDATE employees
    SET
      name = $1,
      designation = $2,
      company_id = $3,
      joining_date = $4,
      emergency_contact = $5,
      blood_group = $6,
      image_url = $7,
      qr_code_url = $8
    WHERE id = $9
    RETURNING *;
  `;

  const values = [
    name,
    designation,
    companyId,
    joiningDate,
    emergencyContact,
    bloodGroup,
    imageUrl,
    qrCodeUrl,
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const deleteEmployeeById = async (id) => {
  const { rows } = await pool.query(
    "DELETE FROM employees WHERE id = $1 RETURNING *;",
    [id]
  );
  return rows[0];
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  getEmployeeByCompanyId,
  updateEmployeeById,
  deleteEmployeeById,
};
