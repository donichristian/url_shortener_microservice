// Load environment variables from .env file
require("dotenv").config();

// Import required modules
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const dns = require("dns");
const urlparser = require("url");

// Create an express application
const app = express();

// Create a new MongoDB connection pool using the connection URI from environment variables
const uri = process.env.MONGO_URI;
const options = { useNewUrlParser: true, useUnifiedTopology: true };
const client = new MongoClient(uri, options);

let db, urls;

// Connect to the MongoDB server and start the server
async function startServer() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected to MongoDB.");

    // Get a reference to the "shorturl" database and the "urls" collection
    db = client.db("shorturl");
    urls = db.collection("urls");

    // Set the port number for the server
    const port = process.env.PORT || 3000;

    // Start the server and listen on the specified port
    app.listen(port, function () {
      console.log(`Listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: false }));

// Serve static files from the "public" directory
app.use("/public", express.static(`${process.cwd()}/public`));

// Handle requests to the root URL ("/") by sending the index.html file
app.get("/", function (req, res) {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

// Handle POST requests to the "/api/shorturl" URL
app.post("/api/shorturl", async (req, res) => {
  const url = req.body.url;

  try {
    const parsedUrl = urlparser.parse(url);
    dns.lookup(parsedUrl.hostname, async (err, address) => {
      if (err || !address) {
        res.json({ error: "Invalid URL" });
      } else {
        const urlCount = await urls.countDocuments({});
        const urlDoc = { url, short_url: urlCount };
        await urls.insertOne(urlDoc);
        res.json({ original_url: url, short_url: urlCount });
      }
    });
  } catch (error) {
    res.json({ error: "Invalid URL" });
  }
});

// Handle GET requests to "/api/shorturl/:short_url"
app.get("/api/shorturl/:short_url", async (req, res) => {
  const shorturl = req.params.short_url;
  try {
    const urlDoc = await urls.findOne({ short_url: parseInt(shorturl) });
    if (urlDoc) {
      res.redirect(urlDoc.url);
    } else {
      res.status(404).json({ error: "No short URL found for the given input" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Run the startServer function to connect to MongoDB and start the express server
startServer();