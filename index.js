const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      // "http://localhost:5173"
      'https://skillful-skill-400406.web.app',
      'https://skillful-skill-400406.firebaseapp.com'
    
    
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.082e3cj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middlewares
const logger = (req, res, next) => {
  console.log("log info", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log("token in the middleWare", token);
  // no token available
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

// const logger = async (req, res, next) => {
//   console.log("called:", req.host, req.originalUrl);
//   next();
// };

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log("value of token in middleware", token);
//   if (!token) {
//     return res.status(401).send({ message: "not authorized" });
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     // error
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: "unauthorized" });
//     }
//     // if token is valid then it would be decoded
//     console.log("value in the token", decoded);
//     req.user = decoded;
//     next();
//   });
// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");

    // auth related api
    // app.post("/jwt", logger, async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "1h",
    //   });
    //   res
    //     .cookie("token", token, {
    //       httpOnly: true,
    //       secure: false,
    //     })
    //     .send({ success: true });
    // });

    //auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    // user logged Out
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging Out User", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // services related api
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const results = await cursor.toArray();
      res.send(results);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const results = await serviceCollection.findOne(query, options);
      res.send(results);
    });

    //bookings
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // bookings ar data paowar jonno
    app.get("/booking", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('token owner info',req.user);
      // console.log("tok tok token", req.cookies);
      // console.log("user in the valid token", req.user);
      // if (req.query.email !== req.user.email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      if (req.user.email !== req.user.email) {
        return res.status(403).send({message:'forbidden access'})
      }
      let query = {};
      if (res.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    //booking deleted
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    // booking Update
    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
        $set: {
          status: updateBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car Doctor Server is Running");
});

app.listen(port, () => {
  console.log(`Car Doctor server PORT: ${port}`);
});
