import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, Collection, Db } from 'mongodb';
import { ObjectId } from 'mongodb';


// Environment variables configuration
dotenv.config();

const app = express();
const port: number = Number(process.env.PORT) || 5000;

// Middleware Setup
app.use(cors());
app.use(express.json());

// Base Health Check Route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World! Engine is operational.');
});

const uri: string | undefined = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ [Config Error]: MONGODB_URI is not defined in the environment.');
  process.exit(1);
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// 🚀 🟢 গ্লোবাল কালেকশন এবং ডাটাবেজ টাইপ রেফারেন্স
// (ভবিষ্যতে অন্য ফাইলে বা রাউটে এই কালেকশন ব্যবহার করতে পারবেন)
export let database: Db;
export let jobsCollection: Collection;
interface ManagerAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

async function run(): Promise<void> {
  try {
    // Connect the client to the server
    await client.connect();

    database = client.db("furniture-server");
    jobsCollection = database.collection("furniture");



    app.post('/api/v1/furniture/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const furnitureCollection = database.collection("furniture");
    
    // 🚀 🟢 বডি থেকে ডেলিভারি ফি অবজেক্ট রিড করা হলো
    const { 
      title, price, oldPrice, deliveryFee, category, subCategory, 
      stock, material, warranty, dimensions, description, colors, image,
      managerId, managerEmail 
    } = req.body;

    // 📦 ডেটাবেজ স্কিমা পেলোড জেনারেশন
    const furniturePayload = {
      title,
      price: Number(price),
      oldPrice: (oldPrice && oldPrice !== "") ? Number(oldPrice) : undefined,
      // 🚀 🟢 নতুন ফিক্সড: ডাটাবেজে ডেলিভারি ফি সেভ করার লজিক
      deliveryFee: deliveryFee ? Number(deliveryFee) : 0, 
      rating: 5.0,
      reviewsCount: "0 Reviews",
      image,
      description,
      category,
      subCategory,
      stock: Number(stock),
      material,
      warranty,
      dimensions,
      colors,
      managerId: managerId || "mgr_fallback_id", 
      managerEmail: managerEmail || "manager@fallback.com",
      status: "Pending Approval",
      createdAt: new Date()
    };

    const result = await furnitureCollection.insertOne(furniturePayload);

    res.status(201).json({
      success: true,
      message: "Luxury asset successfully pushed to validation queue.",
      insertedId: result.insertedId
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 🟢 ডাটাবেজ থেকে সমস্ত ফার্নিচার অ্যাসেট নোড নিয়ে আসার GET API
app.get('/api/v1/furniture', async (req: Request, res: Response): Promise<void> => {
  try {
    const furnitureCollection = database.collection("furniture");
    
    // ডাটাবেজের সব ফার্নিচার অ্যারে আকারে তুলে আনা (লেটেস্ট প্রোডাক্ট আগে দেখাবে)
    const result = await furnitureCollection.find({}).sort({ _id: -1 }).toArray();

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to retrieve catalog nodes." 
    });
  }
});

app.delete('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const furnitureCollection = database.collection("furniture");
    const id = req.params.id;

    const result = await furnitureCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
      res.status(200).json({ success: true, message: "Asset purged from database node successfully." });
    } else {
      res.status(404).json({ success: false, error: "Asset node not found." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 ২. ডাটাবেজে ফার্নিচার আপডেট (Edit) করার API
app.patch('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const furnitureCollection = database.collection("furniture");
    const id = req.params.id;
    const updatedData = req.body;

    // মঙ্গোডিবি স্কিমা ক্লিন রাখার জন্য আইডি রিমুভ করে আপডেট পুশ করা হচ্ছে
    delete updatedData._id; 
    if (updatedData.price) updatedData.price = Number(updatedData.price);
    if (updatedData.deliveryFee) updatedData.deliveryFee = Number(updatedData.deliveryFee);
    if (updatedData.stock) updatedData.stock = Number(updatedData.stock);

    const result = await furnitureCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 1) {
      res.status(200).json({ success: true, message: "Asset updated in pipeline successfully." });
    } else {
      res.status(404).json({ success: false, error: "Asset specifications missing." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 🚀 🟢 ডাটাবেজ থেকে সমস্ত প্ল্যাটফর্ম ইউজারদের নিয়ে আসার GET API
app.get('/api/v1/users', async (req: Request, res: Response): Promise<void> => {
  try {
    // Better-Auth এর তৈরি করা "user" কালেকশনটি সিলেক্ট করা হচ্ছে
    const userCollection = database.collection("user");
    
    // সব ইউজারদের ডাটাবেজ থেকে অ্যারে আকারে তুলে আনা (নতুন ইউজার আগে দেখাবে)
    const result = await userCollection.find({}).sort({ _id: -1 }).toArray();

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to retrieve user nodes." 
    });
  }
});

// 🚀 ১. কার্টে প্রোডাক্ট অ্যাড করার POST API

app.post('/api/v1/cart', async (req: Request, res: Response): Promise<void> => {
  try {
    const cartCollection = database.collection("cart");
    const cartItem = req.body;

    const query = { 
      userId: String(cartItem.userId), 
      productId: String(cartItem.productId) 
    };
    
    const existingItem = await cartCollection.findOne(query);

    if (existingItem) {
      // ⚡ হুবহু একই প্রোডাক্ট দ্বিতীয়বার আসলে ইনসার্ট ব্লক করে ৪০৪/৪০০ রেসপন্স পাঠানো হচ্ছে
      res.status(400).json({ 
        success: false, 
        error: "Product already exists in your cart node. Duplication restricted." 
      });
    } else {
      // ⚡ নতুন আলাদা প্রোডাক্ট হলে মঙ্গোডিবিতে ফ্রেশ ডকুমেন্ট ইনসার্ট হবে
      await cartCollection.insertOne({
        userId: String(cartItem.userId),
        userName: cartItem.userName,
        userEmail: cartItem.userEmail,
        productId: String(cartItem.productId),
        title: cartItem.title,
        price: Number(cartItem.price),
        image: cartItem.image,
        color: cartItem.color,
        quantity: 1,
        addedAt: new Date()
      });
      res.status(201).json({ success: true, message: "Successfully added to cart." });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 ২. স্পেসিফিক ইউজারের কার্ট ডাটা তুলে আনার GET API
app.get('/api/v1/cart/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const cartCollection = database.collection("cart");
    const userId = req.params.userId;

    const result = await cartCollection.find({ userId: userId }).toArray();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 ১. নতুন অর্ডার/ডেলিভারি বুকিং করার POST API
app.post('/api/v1/deliveries', async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveriesCollection = database.collection("deliveries");
    const deliveryPayload = req.body;

    // সিকিউরিটি গার্ড চেক
    if (!deliveryPayload.userId || !deliveryPayload.productId) {
      res.status(400).json({ success: false, error: "Missing required booking nodes." });
      return;
    }

    // ডাটাবেজে ইনসার্ট (ডেলিভারি স্ট্যাটাস বাই-ডিফল্ট 'Pending' সেট করা হচ্ছে)
    const result = await deliveriesCollection.insertOne({
      ...deliveryPayload,
      status: "Pending", // 👈 ডিফল্ট অপারেশনাল স্টেট
      createdAt: new Date()
    });

    res.status(201).json({ success: true, message: "Order processed and delivery node spawned." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 ২. সুনির্দিষ্ট ইউজারের অর্ডার হিস্ট্রি/ডেলিভারি ট্র্যাক করার GET API
app.get('/api/v1/deliveries/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const deliveriesCollection = database.collection("deliveries");
    const userId = req.params.userId;

    const result = await deliveriesCollection.find({ userId: userId }).toArray();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});




    // Send a ping to confirm a successful 
    await client.db("admin").command({ ping: 1 });
    console.log("⚡ [Database]: Pinged your deployment. You successfully connected to MongoDB!");
    
  } catch (error) {
    console.error("❌ [Database Error]: Failed to connect to MongoDB:", error);
  }
}

// Initialize database execution tunnel
run().catch(console.dir);

// Server Listening Node
app.listen(port, () => {
  console.log(`🚀 [Server]: Engine successfully running on port ${port}`);
});