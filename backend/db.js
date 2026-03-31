const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "student_system",
    password: "Pp@170306",
    port: 5432,
});

module.exports = pool;