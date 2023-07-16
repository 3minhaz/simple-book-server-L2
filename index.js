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

const pick = (obj, keys) => {
  const finalObj = {};
  //   console.log("pic", obj, keys);
  for (const key of keys) {
    // console.log("from pick", Object.hasOwnProperty.call(obj, key));
    // console.log("from pick", key);
    // if (obj && Object.hasOwnProperty.call(obj, key)) {
    if (obj && Object.hasOwnProperty.call(obj, key)) {
      //   console.log("inside if", finalObj[key]);
      finalObj[key] = obj[key];
    }
  }
  //   console.log(finalObj);
  return finalObj;
};

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
      const booksSearchableField = ["title", "author", "genre"];
      const booksFilterableField = ["publicationDate", "genre"];
      const filters = pick(req.query, booksSearchableField);
      //   console.log("filters", filters);
      const { searchTerm } = req.query;
      //   const { searchTerm, ...filtersData } = filters;
      //   console.log("req.query", req.query);
      console.log("filtersData", req.query);

      const andConditions = [];

      if (searchTerm) {
        andConditions.push({
          $or: booksSearchableField.map((field) => ({
            [field]: {
              $regex: searchTerm,
              $options: "i",
            },
          })),
        });
      }
      //   if (Object.keys(filtersData).length) {
      //     andConditions.push({
      //       $and: Object.entries(filtersData).map(([field, value]) => ({
      //         [field]: value,
      //       })),
      //     });
      //   }

      const whereConditions =
        andConditions.length > 0 ? { $and: andConditions } : {};

      const books = await booksCollection
        .find(whereConditions, { projection: { email: 0 } })
        .sort({ _id: -1 })
        .toArray();
      //   console.log(books);
      res.send(books);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/book-update/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = await booksCollection.findOne({ _id: new ObjectId(id) });
      const updateData = {
        $set: data,
      };
      const result = await booksCollection.updateOne(filter, updateData);
      res.send(result);
    });

    // comment

    app.post("/comment/:id", async (req, res) => {
      const id = req.params.id;

      const { comment, user } = req.body;
      const findBook = await booksCollection.findOne({ _id: new ObjectId(id) });
      const result = await booksCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $push: {
            comments: {
              comment: comment,
              email: user,
            },
          },
        }
      );

      if (result.modifiedCount !== 1) {
        // console.error("Product not found or comment not added");
        res.json({ error: "Product not found or comment not added" });
        return;
      }
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
