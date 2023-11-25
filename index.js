const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const AWS = require('aws-sdk');




const https = require('https');


require('dotenv').config();

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.use(cors());



const port = 8000;
app.listen(port, () => {
  console.log('Listening on port ' + port);
});

app.get('/', (req, res) => res.send('My first Node API!'));


var mysql = require('mysql');
const { error } = require('console');
var con = mysql.createConnection({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_DATABASE,
    multipleStatements: true
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    
  });

AWS.config.update({ region: 'us-east-1' });
app.use(bodyParser.json());




app.get('/employees', 
    (req, res) => {

      const jwt = require('jsonwebtoken');
      const fs = require('fs');

      const token = req?.headers?.token;
      const cert = fs.readFileSync('public.pem', 'utf8');
      jwt.verify(token, cert, { algorithms: ['RS256'] }, (err, payload) => {
          if (err) {
            // Not a valid token
            console.log('Error:', err);
            return;
          }

          const decodedJwt = jwt.decode(token);
        
          // Token successfully verified
          console.log('Payload:', payload);
          console.log('jwt:', decodedJwt);
          const pageNo = req.query.pageNo || 1 ;
          const offset = (pageNo-1) * 10;
          let condition = "";
          if(req?.query?.emp_no) {
            condtiton = "where emp_no = "+ req?.query?.emp_no;
          }


          const query = "SELECT count(*) as count FROM employees ";
          con.query(query, function(err, results) {
            const count = results;
            const query = "SELECT * FROM employees e "+ condition + " limit 10 OFFSET "+offset;
            con.query(query, function(err, results) {
              if(err){
                return res.status(500).json(err);
              } else return res.status(200).json({count: count[0]?.count, result: results});
            });
          });    
      });

      
    }
);


app.post('/employee', 
    (req, res) => {
      
      let emp_no = req?.body?.emp_no;

      var hire_date = new Date();
      hire_date = hire_date.toISOString().split('T')[0];

      if(!emp_no) {
        con.query('select max(emp_no) as max from employees',function(err, results) {
          emp_no = +results[0].max + 1;

          const email = req.body.first_name.toLowerCase()+"."+req.body.last_name.toLowerCase() + "@geeksquad.com";
          const password = '$2a$12$XPpevwzivYcfWtEkUTFnNOIM67wjSqojxBb/eYXZLP6DN18n.LWNy';
          

          const query = 
          
          `insert into employees (emp_no, birth_date, first_name, last_name, gender, hire_date, email, password) values (?,?,?,?,?,?,?,?);
          insert into salaries (emp_no, salary, from_date, to_date) values (?,?,?,?);
          insert into titles (emp_no, title, from_date, to_date) values (?,?,?,?);
          insert into dept_emp (emp_no, dept_no, from_date, to_date) values (?,?,?,?);
          `;
          
          con.query(query,[
            
            emp_no, req.body.birth_date, req.body.first_name, req.body.last_name, req.body.gender, hire_date, email, password,
                            
                            emp_no, +req.body.salary, hire_date, '9999-01-01',
                            emp_no, req.body.title, hire_date, '9999-01-01',
                            emp_no, req.body.dept_no, hire_date, '9999-01-01',
                          ],function(err, results) {
            return res.status(200).json({ body: results });
          });
        });
      } else {

        let query = "";
        let params = [];

        if(req?.body?.first_name || req?.body?.last_name || req?.body?.gender || req?.body?.birth_date){
          query += `update employees set birth_date = ?, first_name = ? , last_name = ? , gender = ? where emp_no = ?  ;`;
          params.push(req.body.birth_date, req.body.first_name, req.body.last_name, req.body.gender, emp_no);
        }

        if(req.body.dept_no){
          query+=`
          update dept_emp set to_date = ? where emp_no = ? and to_date = ?;
          insert into dept_emp (emp_no, dept_no, from_date, to_date) values (?,?,?,?);`
          params.push(hire_date, emp_no, '9999-01-01', emp_no, req.body.dept_no, hire_date, '9999-01-01');
        }

        if(req.body.salary) {
          query+=`
          update salaries set to_date = ? where emp_no = ? and to_date = ?;
          insert into salaries (emp_no, salary, from_date, to_date) values (?,?,?,?);`;
          params.push(hire_date, emp_no, '9999-01-01', emp_no, req.body.salary, hire_date, '9999-01-01');
        }

        if(req.body.title) {
          query+= `
          update titles set to_date = ? where emp_no = ? and to_date = ?;
          insert into titles (emp_no, title, from_date, to_date) values (?,?,?,?);`;
          params.push(hire_date, emp_no, '9999-01-01', emp_no, req.body.title, hire_date, '9999-01-01');
        }
  
        con.query(query,params,function(err, results) {
          if(err){
            return res.status(500).json(err);
          } else return res.status(200).json({ body: results });
        });
      }    
    }
);



app.get('/departments', 
    (req, res) => {
      
      const emp_no = req.params.emp_no;

      const query = "SELECT count(*) as count FROM departments ";
          con.query(query, function(err, results) {
            const count = results;
            const pageNo = req.query.pageNo || 1 ;
            const offset = (pageNo-1) * 10;
            const query = "select distinct(d.dept_no), d.dept_name, concat(e.first_name, ' ', e.last_name) as manager from dept_manager as dm natural join departments as d natural join employees as e where dm.to_date = '9999-01-01' and dm.emp_no = e.emp_no order by dept_no;"
            con.query(query, function(err, results) {
              if(err){
                return res.status(500).json(err);
              } else return res.status(200).json({count: count && count[0]?.count, result: results});
            });
          });   
      } 
);


app.post('/department', 
    (req, res) => {
      let dept_no = req?.body?.dept_no;

      let today = new Date();
      today = today.toISOString().split('T')[0];

      if(!dept_no) {

        con.query('select max(dept_no) as max from departments',function(err, results) {
          dept_no = (+(results[0]?.max?.substring(1)) +1) + '';

          while(dept_no.length<3){
            dept_no = '0'+ dept_no;
          }
          dept_no = 'd'+dept_no;
  
          con.query("insert into departments (dept_no, dept_name) values (?,?); insert into dept_manager (dept_no, emp_no, from_date, to_date) values (?,?,?,?)",[dept_no, req.body.dept_name,dept_no, req.body.manager_no, today, '9999-01-01' ], function(err, results) {
              return res.status(200).json(results);
          });  

        })
        
      } else {

        let query = '';
        let params = [];

        if(req.body.dept_name) {
          query += 'update departments set dept_name = ? where dept_no = ?;';
          params.push(req.body.dept_name, req.body.dept_no);
        }

        if(req.body.manager_no) {
          query += `
          update dept_manager set to_date = ?  where to_date = '9999-01-01' and dept_no = ? ;
          insert into dept_manager (dept_no, emp_no, from_date, to_date) values(?,?,?,?)`;
          params.push(today, req.body.dept_no, req.body.dept_no,req.body.manager_no, today, '9999-01-01');
        }  
        con.query(query,params, function(err, results) {
          if(err){
            return res.status(500).json(err);
          } else return res.status(200).json(results);
        });  
      }
    }
);



app.get('/employee/:emp_no', 
    (req, res) => {

      const jwt = require('jsonwebtoken');
      const fs = require('fs');

      const token = req?.headers?.token;
      const cert = fs.readFileSync('public.pem', 'utf8');
      jwt.verify(token, cert, { algorithms: ['RS256'] }, (err, payload) => {
          if (err) {
            // Not a valid token
            console.log('Error:', err);
            return;
          }

          const decodedJwt = jwt.decode(token);
        
          // Token successfully verified
          console.log('Payload:', payload);
          console.log('jwt:', decodedJwt);
          const pageNo = req.query.pageNo || 1 ;

          const offset = (pageNo-1) * 10;
          let condition = "";
          if(req?.params?.emp_no) {
            condition = "where emp_no = "+ req?.params?.emp_no;
          }
          const query = "select e.emp_no, e.birth_date, e.first_name, e.last_name, e.gender, e.hire_date, e.is_admin, s.salary, t.title, d.dept_name, d.dept_no from `HR-portal`.employees e, `HR-portal`.salaries s, `HR-portal`.titles t, `HR-portal`.dept_emp de, `HR-portal`.departments d where s.emp_no = e.emp_no and t.emp_no = e.emp_no and de.emp_no = e.emp_no and d.dept_no = de.dept_no and s.to_date = '9999-01-01' and t.to_date = '9999-01-01' and de.to_date = '9999-01-01' and e.emp_no = " + req?.params?.emp_no ;

          con.query(query, function(err, results) {
            if(err) {
              return res.status(500).json(err);
            }
            return res.status(200).json(results);
          });
            // } 
      });

      
    }
);


app.get('/department/:dept_no', 
    (req, res) => {

      const jwt = require('jsonwebtoken');
      const fs = require('fs');

      const token = req?.headers?.token;
      const cert = fs.readFileSync('public.pem', 'utf8');
      jwt.verify(token, cert, { algorithms: ['RS256'] }, (err, payload) => {
          if (err) {
            console.log('Error:', err);
            return;
          }

          const decodedJwt = jwt.decode(token);

          if(req?.params?.dept_no) {
            condition = "where emp_no = "+ req?.params?.dept_no;
          }

          const query = "select distinct(d.dept_no), d.dept_name, concat(e.first_name, ' ', e.last_name) as manager, e.emp_no as manager_no from dept_manager as dm natural join departments as d natural join employees as e where dm.to_date = '9999-01-01' and dm.emp_no = e.emp_no and dept_no = '"+ req?.params?.dept_no +"' order by dept_no;"

          con.query(query, function(err, results) {
            if(err) {
              res.status(500).json(err);
            }
            return res.status(200).json(results);
          });
      });

      
    }
);


app.get('/employee/:emp_no/departments', 
    (req, res) => {
      
      const emp_no = req.params.emp_no;

      const query = "SELECT d.dept_name, de.from_date, de.to_date from dept_emp de ,departments d where d.dept_no = de.dept_no and emp_no = "+ emp_no;

      con.query(query, function(err, results) {
        if(err){
          return res.status(500).json(err);
        } else return res.status(200).json({ body: results });});
      }
);

app.get('/employee/:emp_no/salaries', 
    (req, res) => {
      
      const emp_no = req.params.emp_no;

      const query = "SELECT de.salary, de.from_date, de.to_date from salaries de where emp_no = "+ emp_no;

      con.query(query, function(err, results) {
        if(err){
          return res.status(500).json(err);
        } else return res.status(200).json({ body: results });});
      }
);

app.get('/employee/:emp_no/titles', 
    (req, res) => {
      
      const emp_no = req.params.emp_no;

      const query = "SELECT de.title, de.from_date, de.to_date from titles de where emp_no = "+ emp_no;

      con.query(query, function(err, results) {
        if(err){
          return res.status(500).json(err);
        } else return res.status(200).json({ body: results });});
      }
);