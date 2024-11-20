const express = require("express")
const cors = require("cors");
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config()
const app = express()
const port = process.env.port || 4000;

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
  ]
}))
app.use(express.json())

// middlewares 
//verify token , token save localstorage
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

// use verify Seller after verifyToken
// const verifySeller = async (req, res, next) => {
//   const email = req.decoded.email;
//   const query = { email: email };
//   const user = await userCollection.findOne(query);
//   const isSeller = user?.role === 'seller';
//   if (!isSeller) {
//     return res.status(403).send({ message: 'forbidden access' });
//   }
//   next();
// }

//mongodeb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sy54hal.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);








//api
app.get("/", (req, res) => {
  res.send("server is running");


})

app.listen(port, () => {
  console.log(`server is running on port, ${port}`);
})