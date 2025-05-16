// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const jwt = require("jsonwebtoken"); // JWT package
const cookieParser = require('cookie-parser');

const app = express();


// Middleware for parsing incoming requests
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

// Connect to MongoDB
mongoose.connect('mongodb+srv://vrishankraina:vrishank@cluster0.2wttn.mongodb.net/collegeconnect')
  .then(() => console.log("Connected to Database"))
  .catch(err => console.log("Error in Connecting to Database: ", err));

// Get database connection
const db = mongoose.connection;
const usersCollection = db.collection("users");
const eventsCollection = db.collection("events");
const clubsCollection = db.collection("clubs");
const { ObjectId } = require("mongodb");

// Define JWT secret (for production, store in process.env.JWT_SECRET)
const secretKey = process.env.JWT_SECRET || "your_jwt_secret";

// Middleware to verify JWT tokens
function authenticateToken(req, res, next) {
    // Expect token in the Authorization header as: "Bearer <token>"
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access token missing" });
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = user;
        next();
    });
}

function authorizeAdmin(req, res, next) {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }
    next();
  }
// Routes

// Home route
app.get("/", (req, res) => {
    res.set({ "Access-Control-Allow-Origin": "*" });
    res.sendFile(path.join(__dirname, "public","pages", "home.html"));
});

// Register route (serves register.html)
app.get("/register", (req, res) => {
    res.set({ "Access-Control-Allow-Origin": "*" });
    res.sendFile(path.join(__dirname, "public", "pages", "register.html"));
});

// Admin events route
app.get("/admin_events", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "admin_events.html"));
});

// Student events route
app.get("/student_events", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "students_events.html"));
});

// Clubs page for students
app.get("/students_club", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "students_club.html"));
});

// Admin clubs page
app.get("/admin_clubs", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "admin_clubs.html"));
});

// Get student events data
app.get("/student_events_data", async (req, res) => {
    try {
        const events = await eventsCollection.find().toArray();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get all clubs
app.get("/clubs", async (req, res) => {
    try {
        const clubs = await clubsCollection.find({ approved: true }).toArray();
        res.json(clubs);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get pending clubs for admin
app.get("/pending_clubs", async (req, res) => {
    try {
        const clubs = await clubsCollection.find({ approved: false }).toArray();
        res.json(clubs);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Sign up route
app.post("/sign_up", async (req, res) => {
    const { name, email, phno, password, role } = req.body;
    
    if (!name || !email || !phno || !password || !role) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
    
    // Use provided role or default to 'user' not doing that anymore
    const data = { name, email, phno, password, role};
    console.log(data);
    try {
        await usersCollection.insertOne(data);
        console.log("Record Inserted Successfully");
        return res.status(200).json({ success: true, message: "Sign Up Successful" });
    } catch (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Sign-in route (JWT based)
app.post("/sign_in", async (req, res) => {
    const { email, password, role: selectedRole } = req.body;
  
    try {
      const user = await usersCollection.findOne({ email, password });
  
      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
  
      // Check if user role matches the selected role from frontend
      if (user.role !== selectedRole) {
        return res.status(403).json({
          success: false,
          message: `Role mismatch'.`
        });
      }
  
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        secretKey,
        { expiresIn: "1h" }
      );
      
      return res.status(200).json({
        success: true,
        token,
        role: user.role,
        message: "Login successful"
      });
    } catch (err) {
      console.error("Error during sign-in:", err);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });
  
// Admin event management route
app.post("/admin_events",  authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { title, host, desc, date, venue } = req.body;
        const event = { title, host, desc, date, venue, createdAt: new Date() };
        await eventsCollection.insertOne(event);
        res.status(201).send('<h3>Event added successfully!</h3><a href="/admin_events">Go Back</a>');
    } catch (err) {
        res.status(500).send('<h3>Internal server error</h3><a href="/admin_events">Go Back</a>');
    }
});

// Create club route (protected by JWT)
app.post("/create_club", authenticateToken, async (req, res) => {
    if (req.user.role === "admin") {
        return res.status(403).send("Admins cannot create clubs through this route.");
    }
    else{
        try {
            const { name, description } = req.body;
            const createdBy = req.user.email;
            const existingClub = await clubsCollection.findOne({ createdBy });

            if (existingClub) {
                return res.status(400).send('You have already created a club.');
            }

            const newClub = { name, createdBy, description, approved: false, members: [createdBy] };
            await clubsCollection.insertOne(newClub);
            res.status(201).send('Club created! Pending admin approval.');
        } catch (err) {
            console.error("Error creating club:", err);
            res.status(500).send('Internal server error.');
        }
    }
});

// Join club route (protected by JWT)
app.post("/join_club", authenticateToken, async (req, res) => {
    try {
        const { clubId } = req.body;
        const studentEmail = req.user.email;
        const club = await clubsCollection.findOne({ _id: new ObjectId(clubId), approved: true });

        if (!club) {
            return res.status(404).send('Club not found or not approved.');
        }
        if (club.members.includes(studentEmail)) {
            return res.status(400).send('You have already joined this club.');
        }

        await clubsCollection.updateOne({ _id: new ObjectId(clubId) }, { $addToSet: { members: studentEmail } });
        res.status(200).send('Joined the club successfully!');
    } catch (err) {
        res.status(500).send('Internal server error.');
    }
});

// Admin approve club route (unprotected; you might want to secure this further)
app.post("/admin/approve_club", authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { clubId } = req.body;
        await clubsCollection.updateOne({ _id: new ObjectId(clubId) }, { $set: { approved: true } });
        res.status(200).send('<h3>Club approved!</h3><a href="/admin_events">Go Back</a>');
    } catch (err) {
        res.status(500).send('<h3>Internal server error</h3><a href="/admin_events">Go Back</a>');
    }
});

// Admin delete club route
app.post("/admin/delete_club",  authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { clubId } = req.body;
        await clubsCollection.deleteOne({ _id: new ObjectId(clubId) });
        res.status(200).send('<h3>Club deleted!</h3><a href="/admin_events">Go Back</a>');
    } catch (err) {
        res.status(500).send('<h3>Internal server error</h3><a href="/admin_events">Go Back</a>');
    }
});

// Start the server on PORT 3000 (or environment port)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Listening on PORT ${PORT}`);
});
