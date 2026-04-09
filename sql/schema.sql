CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  company_id VARCHAR(50) UNIQUE NOT NULL,
  joining_date DATE NOT NULL,
  emergency_contact VARCHAR(20) NOT NULL,
  blood_group VARCHAR(10) NOT NULL,
  image_url TEXT,
  qr_code_url TEXT
);
