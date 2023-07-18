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
    const wishlistCollection = db.collection("wishlist");
    const readingCollection = db.collection("reading");

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
      // console.log("filtersData", req.query);

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

    app.post("/create-book", async (req, res) => {
      const body = req.body;
      const result = await booksCollection.insertOne(body);
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

    app.delete("/book-delete/:id", async (req, res) => {
      const id = req.params.id;
      const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 1) {
        res.send(result);
      } else {
        res.send({
          error: "No documents matched the query. Deleted 0 documents.",
        });
      }
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

    // wishlist

    // get wishlist
    app.get("/wishlist-get/:email", async (req, res) => {
      const email = req.params.email;
      const findBook = await wishlistCollection.findOne(
        { email },
        { bookId: 1 }
      );
      const bookIds = findBook?.bookId?.map((id) => new ObjectId(id));
      if (findBook) {
        const result = await booksCollection
          .find({ _id: { $in: bookIds } })
          .toArray();
        res.send(result);
      }
    });

    app.post("/wishlist", async (req, res) => {
      const data = req.body;
      const exist = await wishlistCollection.findOne({
        email: data.email,
        bookId: { $in: [data.bookId] },
      });
      if (exist) {
        res.send({ message: "Book already exist" });
      } else {
        const result = await wishlistCollection.updateOne(
          { email: data.email },
          {
            $push: {
              bookId: data.bookId,
            },
          },
          { upsert: true }
        );
        res.send(result);
      }
    });

    app.delete("/wishlist", async (req, res) => {
      const { email, id } = req.query;
      // const id = req.body;
      const filter = { email };
      const update = { $pull: { bookId: id } };
      // const result = await wishlistCollection.updateOne({
      //   email,
      //   $pull: { bookId: id },
      // });
      const result = await wishlistCollection.updateOne(filter, update);
      res.send(result);
    });

    // reading books

    app.post("/reading-list", async (req, res) => {
      const body = req.body;
      const filter = req.body.email;
      const exist = await readingCollection.findOne({
        email: filter,
        "bookInfo.bookId": body.bookInfo.bookId,
      });
      console.log(exist);
      if (exist) {
        res.send({ message: "Already added to read soon" });
      } else {
        const result = await readingCollection.updateOne(
          {
            email: body.email,
          },
          { $push: { bookInfo: body.bookInfo } },
          { upsert: true }
        );
        // console.log(body);
        res.send(result);
      }
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
