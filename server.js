const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db");
const fs = require("fs");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "biblioteca123",
    resave: false,
    saveUninitialized: false
}));

function isAdmin(req, res, next){
    if(!req.session.user || !req.session.user.isAdmin){
        return res.json({status:"error", message:"Acces interzis - doar admin"});
    }
    next();
}

// ================= USER INFO =================
app.get("/me",(req,res)=>{
    if(req.session.user){
        res.json({
            id: req.session.user.id,
            username: req.session.user.username,
            isAdmin: req.session.user.isAdmin
        });
    } else {
        res.json(null);
    }
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
    db.query(
        "SELECT * FROM users WHERE username=?",
        [req.body.username],
        async (err, result) => {
            if (err) return res.json({ success: false, message: "Eroare DB" });
            if (result.length === 0) 
                return res.json({ success: false, message: "User nu exista" });

            const ok = await bcrypt.compare(req.body.password, result[0].password);
            if (ok) {
                req.session.user = {
                    id: result[0].id,
                    username: result[0].username,
                    isAdmin: result[0].isAdmin
                };
                res.json({ success: true });
            } else {
                res.json({ success: false, message: "Parola gresita" });
            }
        }
    );
});

// ================= REGISTER =================
app.post("/register", async (req,res)=>{
    try{
        const hash = await bcrypt.hash(req.body.password,10);
        db.query(
            "INSERT INTO users(username,password) VALUES(?,?)",
            [req.body.username, hash],
            (err)=>{
                if(err) return res.send("User exista deja");
                res.redirect("/login.html");
            }
        );
    }catch{
        res.send("Eroare register");
    }
});

// ================= LOGOUT =================
app.get("/logout",(req,res)=>{
    req.session.destroy(()=> res.redirect("/index.html"));
});

// ================= CARTI =================
app.get("/books", (req,res)=>{
    db.query("SELECT * FROM books", (err, data)=>{
        if(err) return res.json([]);
        res.json(data);
    });
});

// ================= FAVORITES =================
app.post("/favoriteToggle", (req,res)=>{
    if(!req.session.user) return res.json({status:"error"});
    const userId = req.session.user.id;
    const bookId = req.body.bookId;

    db.query("SELECT * FROM favorites WHERE user_id=? AND book_id=?", [userId, bookId], (err,result)=>{
        if(result.length>0){
            db.query("DELETE FROM favorites WHERE user_id=? AND book_id=?", [userId, bookId], ()=>res.json({status:"removed"}));
        } else {
            db.query("INSERT INTO favorites(user_id, book_id) VALUES(?,?)", [userId, bookId], ()=>res.json({status:"added"}));
        }
    });
});

app.get("/myFavorites", (req,res)=>{
    if(!req.session.user) return res.json([]);
    const userId = req.session.user.id;
    db.query("SELECT book_id FROM favorites WHERE user_id=?", [userId], (err, results)=>{
        if(err) return res.json([]);
        res.json(results.map(r=>r.book_id));
    });
});

// ================= LOANS =================
app.post("/loanToggle", (req,res)=>{
    if(!req.session.user) return res.json({status:"error"});
    const userId = req.session.user.id;
    const bookId = req.body.bookId;

    db.query("SELECT * FROM loans WHERE user_id=? AND book_id=?", [userId, bookId], (err,result)=>{
        if(result.length>0){
            db.query("DELETE FROM loans WHERE user_id=? AND book_id=?", [userId, bookId], ()=>res.json({status:"removed"}));
        } else {
            db.query("INSERT INTO loans(user_id, book_id) VALUES(?,?)", [userId, bookId], ()=>res.json({status:"added"}));
        }
    });
});

app.get("/myLoans", (req,res)=>{
    if(!req.session.user) return res.json([]);
    const userId = req.session.user.id;
    db.query("SELECT book_id FROM loans WHERE user_id=?", [userId], (err, results)=>{
        if(err) return res.json([]);
        res.json(results.map(r=>r.book_id));
    });
});

// ================= ADMIN =================
app.get("/admin", isAdmin, (req,res)=> res.sendFile(__dirname + "/public/admin.html"));

app.get("/adminBooks", isAdmin, (req,res)=>{
    db.query("SELECT * FROM books", (err,data)=>{
        if(err) return res.json({status:"error", message:"Eroare DB"});
        res.json(data);
    });
});

app.post("/addBook", isAdmin, (req,res)=>{
    db.query(
        "INSERT INTO books(title,author,description,image) VALUES(?,?,?,?)",
        [req.body.title,req.body.author,req.body.description,req.body.image],
        ()=>res.json({status:"ok"})
    );
});

app.get("/deleteBook/:id", isAdmin, (req,res)=>{
    db.query("DELETE FROM books WHERE id=?", [req.params.id], ()=>res.json({status:"ok"}));
});

app.get("/stats", isAdmin, (req,res)=>{
    db.query("SELECT author, COUNT(*) as nr FROM books GROUP BY author", (err,data)=>{
        if(err) return res.json({status:"error"});
        res.json({
            labels:data.map(d=>d.author),
            values:data.map(d=>d.nr)
        });
    });
});

// ================= INDEX =================
app.get("/index.html", (req,res)=>{
    if(req.session.user){
        const html = fs.readFileSync("./public/index.html","utf8");
        const userScript = `<script>window.currentUser=${JSON.stringify(req.session.user)}</script>`;
        res.send(html.replace("</head>", `${userScript}</head>`));
    } else {
        res.sendFile(__dirname + "/public/index.html");
    }
});

app.listen(3000,()=>console.log("Server pornit pe http://localhost:3000"));
