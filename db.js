const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "SEBI@1234",
    database: "biblioteca"
});

db.connect(err=>{
    if(err) console.log(err);
    else console.log("MySQL conectat");
});

module.exports = db;
