const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
require('dotenv').config()
const app = express()
const port = process.env.port || 4000;

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',

  ]
}))
app.use(express.json())

//middleware
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
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isSeller = user?.role === 'seller';
  if (!isSeller) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}



//mongodeb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.sy54hal.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//database & collection name
const db = client.db("MiniMart");
const userCollection = db.collection('users')
const productCollection = db.collection('Product')


async function run() {
  try {
    await client.connect();



    //jwt
    app.post("/jwt", async (req, res) => {
      const userEmail = req.body
      // console.log(userEmail)
      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN, {
        expiresIn: '10d'
      })
      res.send({ token })
    })


    //user 
    app.post('/users', async (req, res) => {
      const user = req.body
      const existingUser =await userCollection.findOne(user)
      // console.log("user:  ",user)
      if(existingUser){
        return ({message: 'forbidden access'})
        console.log("existing :  ",existingUser)
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      //   if (email !== req.decoded.email) {
      //     return res.status(403).send({ message: 'forbidden access' })
      // }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      // console.log("users by email :  ", user)
      res.send(user)
    })


    //product related api
    app.post('/products', verifyToken,verifySeller, async (req, res) => {
      const item = req.body
      // console.log("user:  ",user)
      const result = await productCollection.insertOne(item)
      res.send(result)
    })

    //

    app.get('/all-product', async (req, res) => {

      const { title, sort, category, brand, page = 1, limit = 9 } = req.query;
      const query = {};

      if (title) {
        query.title = { $regex: title, $options: "i" };
      }
      if (category) {
        query.category = { $regex: category, $options: "i" };
      }
      if (brand) {
        query.brand = brand;
      }

      const sortOption = sort === "asc" ? 1 : -1
      //all product number
      const totalProduct = await productCollection.countDocuments(query)

      // //dynamic: distruct brand & category from all product
      const productBrandCategory = await productCollection
        .find({}, { projection: { category: 1, brand: 1 } })
        .toArray();


      //typecast number
      const pageNumber = Number(page)
      const limitNumber = Number(limit)

      const allProductList = await productCollection
        .find(query)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .sort({ price: sortOption })
        .toArray();

      //  seperate initialize brand and category  
      const brands = [...new Set(productBrandCategory.map(product => product.brand))]   //run the map func over the allProduct
      const categorys = [...new Set(productBrandCategory.map(product => product.category))]

      res.json({ allProductList, brands, categorys, totalProduct })
    })


    app.get("/my-product/:email",verifyToken,verifySeller, async (req, res) => {
      const email = req.params.email;
      // console.log(email)
      // console.log("decoded mail :",req.decoded.email )
        if (email != req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { sellerEmail: email };
      const result = await productCollection.find(query).toArray();
      // console.log("result by email :  ", result)
      res.send(result)
    })


    //get data for update page
    app.get("/my-product",verifyToken,verifySeller, async (req, res) => {
      const { email,id } = req.query;
      if (email != req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
      const query = { _id: new ObjectId(String(id)) }
      const singleParcel = await productCollection.findOne(query)
      res.send(singleParcel)
  })

  //update
  app.patch('/my-product',verifyToken,verifySeller, async (req, res) => {
    const { email,id } = req.query;
    const product = req.body;
    //verify user
    if (email != req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
  }
    // console.log("update mail owner:: ",email)
    const filter = { _id: new ObjectId(String(id)) }
    const updatedDoc = {
        $set: {
          title: product?.title,
          category: product?.category,
          image: product?.image,
          price: product?.price,
          stock: product?.stock,
          brand: product?.brand,
          description: product?.description,
        }
    }
    const result = await productCollection.updateOne(filter, updatedDoc)
    res.send(result);
})
//delete product 
app.delete('/my-product', verifyToken,verifySeller, async (req, res) => {
  const { email,id } = req.query;
  //verify
  if (email != req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
}
  const query = { _id: new ObjectId(String(id)) }
  const result = await productCollection.deleteOne(query);
  res.send(result);
});





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);









//api
app.get("/", (req, res) => {
  res.send("server is ,,,,,,,,,,, running");
})

app.listen(port, () => {
  console.log(`server is running on port, ${port}`);
})