CREATE DATABASE usuario2;
USE usuario2;

CREATE TABLE pacientes(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50),
    numeroid INT,
    age INT,
    password VARCHAR(20)
);

CREATE TABLE citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT,
    especialidad VARCHAR(50),
    fecha DATE,
    hora TIME,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
);