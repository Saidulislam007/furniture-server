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

// 🚀 গ্লোবাল কালেকশন এবং ডাটাবেজ টাইপ রেফারেন্স
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

    const usersCollection = database.collection("user");
    const reviewsCollection = database.collection("reviews");
    const deliveriesCollection = database.collection("deliveries");
    const cartCollection = database.collection("cart");
    const furnitureCollection = database.collection("furniture");

    // ========================================================
    // 🏢 Users GET API
    // ========================================================
    app.get('/api/v1/users', async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await usersCollection.find({}).sort({ _id: -1 }).toArray();
        res.status(200).json({
          success: true,
          count: result.length,
          data: result
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || "Failed to retrieve user nodes." });
      }
    });

    // ========================================================
    // 🚀 ইউজারের প্রোফাইল আইডেন্টিটি এবং অল সাব-ক্যাটালগ ক্যাসকেড PATCH API
    // ========================================================
    app.patch('/api/v1/users/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = req.params.id;
        const { name, email, image } = req.body;

        if (!name || !email) {
          res.status(400).json({ success: false, error: "Legal Name and Secure Email are required." });
          return;
        }

        const userQuery = {
          $or: [
            { _id: userId },
            { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : userId }
          ]
        };

        // 🔍 ক্যাসকেড প্রটেকশন: আপডেট করার এক মিলি-সেকেন্ড আগে ডাটাবেজের কারেন্ট ওল্ড স্ন্যাপশট নেওয়া
        const dbUserSnapshot = await usersCollection.findOne(userQuery as any);
        if (!dbUserSnapshot) {
          res.status(404).json({ success: false, error: "User profile identity not found." });
          return;
        }

        const dbOldEmail = dbUserSnapshot.email;
        const dbOldName = dbUserSnapshot.name;

        // মেইন প্রোফাইল সিঙ্ক
        const userUpdateResult = await usersCollection.updateOne(
          userQuery as any,
          {
            $set: {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              image: image || "",
              updatedAt: new Date()
            }
          }
        );

        // আলটিমেট লুজ-ফিল্টার (স্ট্রিং আইডি + অবজেক্ট আইডি + ডাটাবেজের ওল্ড ইমেল/ওল্ড নেম)
        const cleanStringId = String(userId);
        const nativeObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : null;

        const subCollectionFilter = {
          $or: [
            { userId: cleanStringId },
            { userId: userId },
            { userEmail: dbOldEmail },
            { userName: dbOldName },
            ...(nativeObjectId ? [{ userId: nativeObjectId }] : [])
          ]
        };

        const updatePayload = {
          $set: { 
            userName: name.trim(), 
            userEmail: email.trim().toLowerCase() 
          }
        };

        // আলাদা আলাদা ধাপে ক্যাসকেড আপডেট এক্সিকিউশন
        const reviewRes = await reviewsCollection.updateMany(subCollectionFilter, updatePayload);
        const deliveryRes = await deliveriesCollection.updateMany(subCollectionFilter, updatePayload);
        const cartRes = await cartCollection.updateMany(subCollectionFilter, updatePayload);

        console.log(`📊 Cascading Complete -> Reviews: ${reviewRes.modifiedCount} | Deliveries: ${deliveryRes.modifiedCount} | Cart: ${cartRes.modifiedCount}`);

        res.status(200).json({ 
          success: true, 
          message: "Profile and all linked sub-catalogs synchronized successfully." 
        });

      } catch (error: any) {
        console.error("❌ Critical failure during dynamic string-identity sync:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🛋️ Furniture POST API
    // ========================================================
    app.post('/api/v1/furniture', async (req: Request, res: Response): Promise<void> => {
      try {
        const payload = req.body;
        if (!payload.title || !payload.price || !payload.category) {
          res.status(400).json({ success: false, error: "Missing validated structural attributes." });
          return;
        }

        await furnitureCollection.insertOne({
          title: payload.title,
          price: Number(payload.price),
          oldPrice: payload.oldPrice ? Number(payload.oldPrice) : null,
          deliveryFee: Number(payload.deliveryFee || 0),
          category: payload.category,
          subCategory: payload.subCategory,
          stock: Number(payload.stock || 0),
          material: payload.material,
          warranty: payload.warranty,
          description: payload.description,
          image: payload.image,
          dimensions: payload.dimensions,
          colors: payload.colors || [],
          status: "Pending",
          managerId: payload.managerId,
          managerEmail: payload.managerEmail,
          createdAt: new Date()
        });

        res.status(201).json({ success: true, message: "Asset specification committed successfully." });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🛋️ Furniture GET API
    // ========================================================
    app.get('/api/v1/furniture', async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await furnitureCollection.find({}).sort({ _id: -1 }).toArray();
        res.status(200).json({ success: true, count: result.length, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🛋️ Furniture DELETE API
    // ========================================================
    app.delete('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const id = req.params.id;
        const result = await furnitureCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.status(200).json({ success: true, message: "Asset purged successfully." });
        } else {
          res.status(404).json({ success: false, error: "Asset node not found." });
        }
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🛋️ Furniture EDIT PATCH API
    // ========================================================
    app.patch('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        delete updatedData._id; 

        if (updatedData.price) updatedData.price = Number(updatedData.price);
        if (updatedData.deliveryFee) updatedData.deliveryFee = Number(updatedData.deliveryFee);
        if (updatedData.stock) updatedData.stock = Number(updatedData.stock);

        const result = await furnitureCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.matchedCount === 1) {
          res.status(200).json({ success: true, message: "Asset updated successfully." });
        } else {
          res.status(404).json({ success: false, error: "Asset specifications missing." });
        }
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🛒 Cart POST API
    // ========================================================
    app.post('/api/v1/cart', async (req: Request, res: Response): Promise<void> => {
      try {
        const cartItem = req.body;
        const query = { userId: String(cartItem.userId), productId: String(cartItem.productId) };
        const existingItem = await cartCollection.findOne(query);

        if (existingItem) {
          res.status(400).json({ success: false, error: "Product already exists in your cart. Duplication restricted." });
        } else {
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

    // ========================================================
    // 🛒 Cart GET API By User ID
    // ========================================================
    app.get('/api/v1/cart/:userId', async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await cartCollection.find({ userId: req.params.userId }).toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🚚 Deliveries POST API
    // ========================================================
    app.post('/api/v1/deliveries', async (req: Request, res: Response): Promise<void> => {
      try {
        const deliveryPayload = req.body;
        if (!deliveryPayload.userId || !deliveryPayload.productId) {
          res.status(400).json({ success: false, error: "Missing required booking nodes." });
          return;
        }

        await deliveriesCollection.insertOne({
          ...deliveryPayload,
          status: "Pending",
          createdAt: new Date()
        });
        res.status(201).json({ success: true, message: "Order processed successfully." });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🚚 Deliveries Global GET API (For Managers)
    // ========================================================
    app.get('/api/v1/deliveries', async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await deliveriesCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🚚 Deliveries GET API By User ID
    // ========================================================
    app.get('/api/v1/deliveries/:userId', async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await deliveriesCollection.find({ userId: req.params.userId }).toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 🚚 Deliveries Status PATCH API
    // ========================================================
    app.patch('/api/v1/deliveries/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const deliveryId = req.params.id;
        const { status } = req.body;

        if (!status) {
          res.status(400).json({ success: false, error: "Status specification missing." });
          return;
        }

        const query = { _id: new ObjectId(deliveryId) };
        const updateResult = await deliveriesCollection.updateOne(
          query,
          { $set: { status: status, updatedAt: new Date() } }
        );

        if (updateResult.modifiedCount === 0) {
          res.status(404).json({ success: false, error: "Delivery node not found or state unchanged." });
        } else {
          res.status(200).json({ success: true, message: "Logistics pipeline state committed successfully." });
        }
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 📝 Reviews POST API
    // ========================================================
    app.post('/api/v1/reviews', async (req: Request, res: Response): Promise<void> => {
      try {
        const reviewPayload = req.body;
        if (!reviewPayload.userId || !reviewPayload.productId || !reviewPayload.rating || !reviewPayload.comment?.trim()) {
          res.status(400).json({ success: false, error: "Missing required testimonial payload nodes." });
          return;
        }

        await reviewsCollection.insertOne({
          userId: reviewPayload.userId,
          userEmail: reviewPayload.userEmail || "N/A",
          userName: reviewPayload.userName || "Anonymous User",
          productId: reviewPayload.productId,
          productName: reviewPayload.productName || "Curated Asset Architecture",
          rating: Number(reviewPayload.rating),
          comment: reviewPayload.comment.trim(),
          createdAt: new Date()
        });

        res.status(201).json({ success: true, message: "Product testimonial record deployed successfully." });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
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