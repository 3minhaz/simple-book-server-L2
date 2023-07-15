const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.izerapb.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("simple-book").command({ ping: 1 });
    const db = client.db("simple-book");
    console.log("Successfully connected to MongoDB");

    const booksCollection = db.collection("books");

    app.get("/landing-page-books", async (req, res) => {
      //   const books = await booksCollection
      //     .find({}, { projection: { email: 0 } })
      //     .toArray();
      const books = await booksCollection
        .find({}, { projection: { email: 0 } })
        .sort({ _id: -1 })
        .limit(10)
        .toArray();
      res.send(books);
    });

    app.get("/books", async (req, res) => {
      const books = await booksCollection
        .find({}, { projection: { email: 0 } })
        .sort({ _id: -1 })
        .toArray();
      res.send(books);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
