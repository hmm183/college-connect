// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
//const session = require("express-session"); // Add this line
require('dotenv').config();

const app = express();

// Middleware for parsing incoming requests
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Use express-session middleware

const session = require("express-session");
const RedisStore = require("connect-redis").RedisStore; // ✅ Try this
const { createClient } = require("redis");

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  legacyMode: true, // Required for some versions
});

redisClient.connect().catch(console.error);

app.use(
  session({
    store: new RedisStore({ client: redisClient }), // ✅ Proper usage
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Change to `true` for HTTPS
  })
);


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch(err => console.error("MongoDB connection error:", err));
// Get database connection
const db = mongoose.connection;
const usersCollection = db.collection("users");
const eventsCollection = db.collection("events");


// Sign-up Route
app.post("/sign_up", async (req, res) => {
    console.log("Received data:", req.body);

    const { name, email, phno, password, role } = req.body;

    if (!name || !email || !phno || !password || !role) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    //const hashedPassword = await bcrypt.hash(password, 10);

    usersCollection.insertOne({ name, email, phno, password, role })
        .then(() => {
            console.log("User Registered Successfully");
            res.status(200).json({ success: true, message: "Sign Up Successful" });
        })
        .catch(err => {
            console.error("Error inserting data:", err);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        });
});

// Sign-in Route
app.post("/sign_in", async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const user = await usersCollection.findOne({ email });

        if (!user) {
            console.log("User not found");
            return res.redirect("signin_failure.html");
        }

        const isPasswordValid = password === user.password;

        if (!isPasswordValid) {
            console.error("Incorrect details");
            return res.status(500).json({ success: false, message: "INCORRECT DETAILS!! TRY AGAIN" });
        }

        if (user.role === role) {
            console.log("Sign-in Successful");
            req.session.user = user; // Save user in session
            res.set({
                "Access-Control-Allow-Origin": "*",
            });

            if (role === "user") {
                return res.redirect("/student_events");
            } else if (role === "admin") {
                return res.redirect("/admin_events");
            } else {
                console.log("Access Denied: Role mismatch");
                return res.status(500).json({ success: false, message: "INCORRECT DETAILS!! TRY AGAIN" });
            }
        } else {
            console.log("Access Denied: Role mismatch");
            return res.status(500).json({ success: false, message: "INCORRECT DETAILS!! TRY AGAIN" });
        }
    } catch (err) {
        console.error("Error during sign-in:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/", (req, res) => {
    res.set({
        "Access-Control-Allow-Origin": "*", // Corrected header name
    });
    res.sendFile(path.join(__dirname, "pages", "home.html"));
});

// Default route for serving the home page
app.get("/register", (req, res) => {
    res.set({
        "Access-Control-Allow-Origin": "*", // Corrected header name
    });
    res.sendFile(path.join(__dirname, "pages", "register.html"));
});

app.post("/admin_events", async (req, res) => {
    try {
        const { title, host, desc, date, venue } = req.body;
        const event = { title, host, desc, date, venue, createdAt: new Date() };
        await eventsCollection.insertOne(event);
        res.status(201).send('<h3>Event added successfully!</h3><a href="/admin_events">Go Back</a>');
    } catch (err) {
        res.status(500).send('<h3>Internal server error</h3><a href="/admin_events">Go Back</a>');
    }
});

app.get("/admin_events", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "admin_events.html"));
});

app.get("/student_events_data", async (req, res) => {
    try {
        const events = await eventsCollection.find().toArray();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/student_events", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "students_events.html"));
});

// Clubs related routes
const clubsCollection = db.collection("clubs");
const { ObjectId } = require("mongodb");



app.post("/admin/approve_club", async (req, res) => {
    try {
        const { clubId } = req.body;
        await clubsCollection.updateOne({ _id: new ObjectId(clubId) }, { $set: { approved: true } });
        res.status(200).send('<h3>Club approved!</h3><a href="/admin_events">Go Back</a>');
    } catch (err) {
        res.status(500).send('<h3>Internal server error</h3><a href="/admin_events">Go Back</a>');
    }
});

app.post("/admin/delete_club", async (req, res) => {
    try {
        const { clubId } = req.body;
        await clubsCollection.deleteOne({ _id: new ObjectId(clubId) });
        res.status(200).send('<h3>Club deleted!</h3><a href="/admin_events">Go Back</a>');
    } catch (err) {
        res.status(500).send('<h3>Internal server error</h3><a href="/admin_events">Go Back</a>');
    }
});

app.post("/create_club", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Please sign in to create a club.');
    }

    try {
        const { name, description } = req.body;
        const createdBy = req.session.user.email; // Use session user email
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
});

app.post("/join_club", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Please sign in to join a club.');
    }

    try {
        const { clubId } = req.body;
        const studentEmail = req.session.user.email; // Use session user email
        const club = await clubsCollection.findOne({ _id: new ObjectId(clubId), approved: true });

        if (club.members.includes(studentEmail)) {
            return res.status(400).send('You have already joined this club.');
        }

        await clubsCollection.updateOne({ _id: new ObjectId(clubId) }, { $addToSet: { members: studentEmail } });
        res.status(200).send('Joined the club successfully!');
    } catch (err) {
        res.status(500).send('Internal server error.');
    }
});

app.get("/clubs", async (req, res) => {
    try {
        const clubs = await clubsCollection.find({ approved: true }).toArray();
        res.json(clubs);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/pending_clubs", async (req, res) => {
    try {
        const clubs = await clubsCollection.find({ approved: false }).toArray();
        res.json(clubs);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Serve HTML files
app.get("/admin_clubs", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "admin_clubs.html"));
});

app.get("/students_club", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "students_club.html"));
});

app.get("/payment", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "payment.html"));
});

// Start the server on PORT 3000
const PORT = 5000;
app.listen(PORT, () => {
    console.log("Listening on PORT 5000");
});