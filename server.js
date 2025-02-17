const express = require('express');
const path = require('path');
const app = express();

// Use index.js from the public folder
const index = require(path.join(__dirname, 'public', 'index.js'));

// Middleware to serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Use index.js as the route handler
app.use(index);

// Set the port dynamically for Vercel
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
