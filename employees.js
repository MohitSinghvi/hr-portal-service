const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true
});

exports.handler = async (event) => {
    const route = event.routeKey;
    
    switch (route) {
        case 'GET /employees':
            return getEmployees(event);
        case 'POST /employee':
            return createOrUpdateEmployee(event);
        case 'GET /employee/{emp_no}':
            return getEmployeeByEmpNo(event);
        case 'GET /employee/{emp_no}/departments':
            return getEmployeeDepartments(event);
        case 'GET /employee/{emp_no}/salaries':
            return getEmployeeSalaries(event);
        case 'GET /employee/{emp_no}/titles':
            return getEmployeeTitles(event);
        default:
            return { statusCode: 404, body: 'Not Found' };
    }
};

function getEmployees(event) {
    const token = event.headers.token;
    const pageNo = event.queryStringParameters.pageNo || 1;
    const offset = (pageNo - 1) * 10;
    let condition = "";

    // Verify JWT token
    const cert = fs.readFileSync('public.pem', 'utf8');
    jwt.verify(token, cert, { algorithms: ['RS256'] }, (err, payload) => {
        if (err) {
            // Token verification failed
            console.log('Error:', err);
            return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // Token successfully verified
        console.log('Payload:', payload);

        // Check if emp_no is provided in query parameters
        if (event.queryStringParameters.emp_no) {
            condition = "WHERE emp_no = " + event.queryStringParameters.emp_no;
        }

        // Fetch count of employees
        const countQuery = "SELECT COUNT(*) AS count FROM employees " + condition;
        con.query(countQuery, function (err, results) {
            if (err) {
                return { statusCode: 500, body: JSON.stringify({ error: err }) };
            }
            const count = results[0].count;

            // Fetch employees with pagination
            const query = "SELECT * FROM employees " + condition + " LIMIT 10 OFFSET " + offset;
            con.query(query, function (err, results) {
                if (err) {
                    return { statusCode: 500, body: JSON.stringify({ error: err }) };
                }
                return {
                    statusCode: 200,
                    body: JSON.stringify({ count: count, result: results })
                };
            });
        });
    });
}

function createOrUpdateEmployee(event) {
    const empData = JSON.parse(event.body);
    let emp_no = empData.emp_no;
    const hire_date = new Date().toISOString().split('T')[0];

    if (!emp_no) {
        // If emp_no is not provided, generate a new one
        con.query('SELECT MAX(emp_no) AS max FROM employees', function (err, results) {
            if (err) {
                return { statusCode: 500, body: JSON.stringify({ error: err }) };
            }
            emp_no = parseInt(results[0].max) + 1;

            // Insert new employee data
            const query = `
                INSERT INTO employees (emp_no, birth_date, first_name, last_name, gender, hire_date, is_admin) 
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;
            con.query(query, [
                emp_no, empData.birth_date, empData.first_name, empData.last_name, empData.gender, hire_date, empData.is_admin || 0
            ], function (err, results) {
                if (err) {
                    return { statusCode: 500, body: JSON.stringify({ error: err }) };
                }
                return { statusCode: 200, body: JSON.stringify({ message: 'Employee created', emp_no: emp_no }) };
            });
        });
    } else {
        // Update existing employee data
        const query = `
            UPDATE employees 
            SET birth_date = ?, first_name = ?, last_name = ?, gender = ?, is_admin = ?
            WHERE emp_no = ?;
        `;
        con.query(query, [
            empData.birth_date, empData.first_name, empData.last_name, empData.gender, empData.is_admin || 0, emp_no
        ], function (err, results) {
            if (err) {
                return { statusCode: 500, body: JSON.stringify({ error: err }) };
            }
            return { statusCode: 200, body: JSON.stringify({ message: 'Employee updated', emp_no: emp_no }) };
        });
    }
}

function getEmployeeByEmpNo(event) {
    const emp_no = event.pathParameters.emp_no;

    const query = `
        SELECT emp_no, birth_date, first_name, last_name, gender, hire_date, is_admin 
        FROM employees 
        WHERE emp_no = ?;
    `;
    con.query(query, [emp_no], function (err, results) {
        if (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err }) };
        }
        if (results.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Employee not found' }) };
        }
        return { statusCode: 200, body: JSON.stringify(results[0]) };
    });
}



function getEmployeeDepartments(event) {
    const emp_no = event.pathParameters.emp_no;

    // Fetch departments of the employee by emp_no
    const query = `
        SELECT d.dept_name, de.from_date, de.to_date 
        FROM dept_emp de 
        INNER JOIN departments d ON de.dept_no = d.dept_no 
        WHERE de.emp_no = ?;
    `;
    con.query(query, [emp_no], function (err, results) {
        if (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err }) };
        }
        return { statusCode: 200, body: JSON.stringify({ departments: results }) };
    });
}

function getEmployeeSalaries(event) {
    const emp_no = event.pathParameters.emp_no;

    // Fetch salaries of the employee by emp_no
    const query = `
        SELECT salary, from_date, to_date 
        FROM salaries 
        WHERE emp_no = ?;
    `;
    con.query(query, [emp_no], function (err, results) {
        if (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err }) };
        }
        return { statusCode: 200, body: JSON.stringify({ salaries: results }) };
    });
}

function getEmployeeTitles(event) {
    const emp_no = event.pathParameters.emp_no;

    // Fetch titles of the employee by emp_no
    const query = `
        SELECT title, from_date, to_date 
        FROM titles 
        WHERE emp_no = ?;
    `;
    con.query(query, [emp_no], function (err, results) {
        if (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err }) };
        }
        return { statusCode: 200, body: JSON.stringify({ titles: results }) };
    });
}
