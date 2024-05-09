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
        case 'GET /departments':
            return getDepartments(event);
        case 'POST /department':
            return createOrUpdateDepartment(event);
        case 'GET /department/{dept_no}':
            return getDepartmentByDeptNo(event);
        default:
            return { statusCode: 404, body: 'Not Found' };
    }
};

function getDepartments(event) {
    const pageNo = event.queryStringParameters.pageNo || 1;
    const offset = (pageNo - 1) * 10;

    // Fetch count of departments
    const countQuery = "SELECT COUNT(*) AS count FROM departments";
    con.query(countQuery, function (err, results) {
        if (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err }) };
        }
        const count = results[0].count;

        // Fetch departments with pagination
        const query = "SELECT dept_no, dept_name FROM departments ORDER BY dept_no LIMIT 10 OFFSET ?";
        con.query(query, [offset], function (err, results) {
            if (err) {
                return { statusCode: 500, body: JSON.stringify({ error: err }) };
            }
            return {
                statusCode: 200,
                body: JSON.stringify({ count: count, result: results })
            };
        });
    });
}

function createOrUpdateDepartment(event) {
    const deptData = JSON.parse(event.body);
    let dept_no = deptData.dept_no;

    if (!dept_no) {
        // If dept_no is not provided, generate a new one
        con.query('SELECT MAX(dept_no) AS max FROM departments', function (err, results) {
            if (err) {
                return { statusCode: 500, body: JSON.stringify({ error: err }) };
            }
            const maxDeptNo = parseInt(results[0].max) || 0;
            dept_no = 'd' + (maxDeptNo + 1).toString().padStart(3, '0');

            // Insert new department data
            const query = `
                INSERT INTO departments (dept_no, dept_name) 
                VALUES (?, ?);
            `;
            con.query(query, [dept_no, deptData.dept_name], function (err, results) {
                if (err) {
                    return { statusCode: 500, body: JSON.stringify({ error: err }) };
                }
                return { statusCode: 200, body: JSON.stringify({ message: 'Department created', dept_no: dept_no }) };
            });
        });
    } else {
        // Update existing department data
        const query = `
            UPDATE departments 
            SET dept_name = ? 
            WHERE dept_no = ?;
        `;
        con.query(query, [deptData.dept_name, dept_no], function (err, results) {
            if (err) {
                return { statusCode: 500, body: JSON.stringify({ error: err }) };
            }
            return { statusCode: 200, body: JSON.stringify({ message: 'Department updated', dept_no: dept_no }) };
        });
    }
}

function getDepartmentByDeptNo(event) {
    const dept_no = event.pathParameters.dept_no;

    // Fetch department details by dept_no
    const query = `
        SELECT dept_no, dept_name 
        FROM departments 
        WHERE dept_no = ?;
    `;
    con.query(query, [dept_no], function (err, results) {
        if (err) {
            return { statusCode: 500, body: JSON.stringify({ error: err }) };
        }
        if (results.length === 0) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Department not found' }) };
        }
        return { statusCode: 200, body: JSON.stringify(results[0]) };
    });
}
