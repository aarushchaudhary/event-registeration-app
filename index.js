// index.js

const express = require('express');
const app = express();
const port = 3000;

// This is the new, important line:
// It tells Express to serve your HTML, CSS, and JS files from the 'public' folder.
app.use(express.static('public'));

// You no longer need the app.get('/') route because express.static handles it.

app.listen(port, () => {
  console.log(`Server is now listening at http://localhost:${port}`);
});