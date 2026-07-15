import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, Collection, Db } from 'mongodb';
import { ObjectId } from 'mongodb';

// Environment variables configuration
dotenv.config();

const app = express();
const port: number = Number(process.env.PORT) || 5000;

// 🛑 CRITICAL FIX: ফ্রন্টএন্ড থেকে পাঠানো JSON ডাটা পড়ার জন্য মিডলওয়্যার (এটিই মিসিং ছিল ভাই)
app.use(express.json());

// Middleware Setup
const allowedOrigins = [process.env.FRONTEND_URL]; 

app.use(cors({
  origin: "*", // সাময়িকভাবে সব ডোমেইন এলাউ করুন
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
    const contactMessagesCollection = database.collection('contact-messages');
    const deliveriesCollection = database.collection("deliveries");
    const cartCollection = database.collection("cart");
    const furnitureCollection = database.collection("furniture");
    const usersCollection = database.collection("users");
    const reviewsCollection = database.collection("reviews");

    // ========================================================
    // 🚀 ইউজারের প্রোফাইল আইডেন্টিটি এবং অল সাব-ক্যাটালগ ক্যাসকেড PATCH API
    // ========================================================
    app.patch('/api/v1/users/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const userId = String(req.params.id);
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

        const dbUserSnapshot = await usersCollection.findOne(userQuery as any);
        if (!dbUserSnapshot) {
          res.status(404).json({ success: false, error: "User profile identity not found." });
          return;
        }

        const dbOldEmail = dbUserSnapshot.email;
        const dbOldName = dbUserSnapshot.name;

        await usersCollection.updateOne(
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
    // 🛋️ Furniture GET API (সার্বজনীন ক্যাটালগ লিস্ট ভাই)
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
    // 🛋️ Furniture GET API (সিঙ্গেল প্রোডাক্ট আইডি দিয়ে ডাটা আনা ভাই)
    // ========================================================
app.get('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: "Invalid product specification node ID."
      });
      return;
    }

    const singleProduct = await furnitureCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!singleProduct) {
      res.status(404).json({
        success: false,
        error: "Target asset record not found."
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: singleProduct
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch single furniture node:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

    // ========================================================
    // 🛋️ Furniture DELETE API
    // ========================================================
    app.delete('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const id = String(req.params.id);
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
    // 🛋️ Furniture PATCH API
    // ========================================================
    app.patch('/api/v1/furniture/:id', async (req: Request, res: Response): Promise<void> => {
      try {
        const id = String(req.params.id);
        const updatedData = req.body;

        if (!id) {
          res.status(400).json({ success: false, error: "Product node ID is required." });
          return;
        }

        if (!updatedData || Object.keys(updatedData).length === 0) {
          res.status(400).json({ success: false, error: "Update payload matrix cannot be empty." });
          return;
        }

        delete updatedData._id; 
        if (updatedData.price !== undefined) updatedData.price = Number(updatedData.price);
        if (updatedData.deliveryFee !== undefined) updatedData.deliveryFee = Number(updatedData.deliveryFee);
        if (updatedData.stock !== undefined) updatedData.stock = Number(updatedData.stock);

        let queryTarget = {};
        if (ObjectId.isValid(id)) {
          queryTarget = { _id: new ObjectId(id) };
        } else {
          queryTarget = { _id: id }; 
        }

        const result = await furnitureCollection.updateOne(
          queryTarget,
          { $set: updatedData }
        );

        if (result.matchedCount === 0) {
          console.log(`⚠️ Database unmatched for ID: ${id}`); 
          res.status(404).json({ 
            success: false, 
            error: "Target asset record not found in central registry." 
          });
          return;
        }

        res.status(200).json({ 
          success: true, 
          message: "Asset updated successfully." 
        });

      } catch (error: any) {
        console.error("❌ Critical failure in furniture TS PATCH pipeline:", error);
        res.status(500).json({ 
          success: false, 
          error: error.message || "Internal Server Error" 
        });
      }
    });

    // ========================================================
    // 🛒 Cart POST API
    // ========================================================
   app.post("/api/v1/deliveries", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("========== NEW VERSION ==========");
    console.log("Headers:", req.headers["content-type"]);
    console.log("Body:", req.body);

    // req.body আছে কিনা চেক
    if (!req.body) {
      res.status(400).json({
        success: false,
        error: "Request body is missing",
      });
      return;
    }

    const {
      userId,
      userName,
      userEmail,
      productId,
      title,
      price,
      deliveryFee,
      image,
      color,
    } = req.body;

    // Required field validation
    if (!userId || !productId) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: userId or productId",
      });
      return;
    }

    const deliveryData = {
      userId: String(userId),
      userName: userName || "Guest",
      userEmail: userEmail || "No Email",
      productId: String(productId),
      title,
      price: Number(price) || 0,
      deliveryFee: Number(deliveryFee) || 0,
      image,
      color: color || "Default",
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await deliveriesCollection.insertOne(deliveryData);

    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
      message: "Delivery created successfully",
    });
  } catch (error: any) {
    console.error("❌ DELIVERY API ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/v1/cart', async (req: Request, res: Response) => {
    try {
        const { userId, productId, title, price, image, color, userName, userEmail } = req.body;

        // ১. ভ্যালিডেশন চেক
        if (!userId || !productId) {
            return res.status(400).json({ success: false, error: "Missing required fields (userId, productId)" });
        }

        // ২. কার্ট কালেকশন চেক করুন
        if (!cartCollection) {
            return res.status(500).json({ success: false, error: "Cart database collection not initialized" });
        }

        // ৩. ডুপ্লিকেট চেক (ইউজার এবং প্রোডাক্ট আইডি দিয়ে চেক করা)
        const existingItem = await cartCollection.findOne({ userId, productId });
        if (existingItem) {
            return res.status(409).json({ success: false, error: "This product is already in your cart matrix." });
        }

        // ৪. কার্টে ইনসার্ট করা
        const cartItem = {
            userId,
            userName,
            userEmail,
            productId,
            title,
            price: Number(price),
            image,
            color,
            addedAt: new Date()
        };

        const result = await cartCollection.insertOne(cartItem);

        res.status(201).json({ 
            success: true, 
            message: "Asset committed to cart node successfully.", 
            insertedId: result.insertedId 
        });

    } catch (error: any) {
        console.error("❌ Cart POST Error:", error);
        res.status(500).json({ success: false, error: "Internal server error during cart synchronization." });
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
    // 🚚 Deliveries POST API (ডুপ্লিকেট ক্লিন করে পারফেক্ট করা হলো ভাই)
    // ========================================================
// সার্ভারের এই POST রাউটটি ব্যবহার করুন (এটি সব এরর ধরবে)
app.post('/api/v1/deliveries', async (req: Request, res: Response) => {
    try {
        console.log("Raw Body Received:", req.body);

        // ভ্যালিডেশন চেক করুন
        if (!req.body.userId || !req.body.productId) {
            return res.status(400).json({ error: "Missing required fields: userId or productId" });
        }

        const deliveryData = {
            // যদি MongoDB তে আইডিObjectId হিসেবে লাগে, তবে new ObjectId(req.body.userId) ব্যবহার করুন
            userId: req.body.userId, 
            userName: req.body.userName || "Guest",
            userEmail: req.body.userEmail || "No Email",
            productId: req.body.productId,
            title: req.body.title,
            price: Number(req.body.price) || 0,
            deliveryFee: Number(req.body.deliveryFee || 0),
            image: req.body.image,
            color: req.body.color || "Default",
            status: "Pending",
            createdAt: new Date()
        };

        const result = await deliveriesCollection.insertOne(deliveryData);
        res.status(201).json({ success: true, insertedId: result.insertedId });

    } catch (error: any) {
        console.error("SERVER CRASH:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

    // ========================================================
    // 🚚 Deliveries GET API By User ID
    // ========================================================
    // deliveries GET API - এটি থাকলে ব্রাউজারে ডাটা দেখতে পাবেন
app.get('/api/v1/deliveries', async (req: Request, res: Response) => {
    try {
        const result = await deliveriesCollection.find({}).toArray();
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
        const deliveryId = String(req.params.id);
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
    // 📝 Reviews Universal GET API
    // ========================================================
    app.get('/api/v1/reviews', async (req: Request, res: Response): Promise<void> => {
      try {
        const allReviews = await reviewsCollection.find({}).sort({ createdAt: -1 }).toArray();
        res.status(200).json({ success: true, data: allReviews });
      } catch (error: any) {
        console.error("❌ Failed to pull universal review archives:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 📝 Reviews POST API
    // ========================================================
    app.post('/api/v1/reviews', async (req: Request, res: Response): Promise<void> => {
      try {
        const reviewPayload = req.body;
        console.log("সাবমিট করা আইডি:", reviewPayload.productId);

        const finalProductId = typeof reviewPayload.productId === 'object' 
                               ? reviewPayload.productId.$oid || reviewPayload.productId.toString() 
                               : reviewPayload.productId;

        await reviewsCollection.insertOne({
          userId: reviewPayload.userId,
          userEmail: reviewPayload.userEmail || "N/A",
          userName: reviewPayload.userName || "Anonymous User",
          productId: finalProductId, 
          productName: reviewPayload.productName || "Curated Asset Architecture",
          rating: Number(reviewPayload.rating),
          comment: reviewPayload.comment.trim(),
          createdAt: new Date()
        });

        res.status(201).json({ success: true, message: "Review deployed successfully." });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 📝 Reviews GET API By Product ID
    // ========================================================
    app.get('/api/v1/reviews/:productId', async (req: Request, res: Response): Promise<void> => {
      try {
        const { productId } = req.params;
        const productReviews = await reviewsCollection
          .find({ productId: productId }) 
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json({ success: true, data: productReviews });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========================================================
    // 📧 Contact Message POST API
    // ========================================================
    app.post('/api/v1/contact', async (req: Request, res: Response): Promise<void> => {
      try {
        const contactPayload = req.body;

        if (!contactPayload.name || !contactPayload.email || !contactPayload.subject || !contactPayload.message) {
          res.status(400).json({ 
            success: false, 
            error: "Missing required contact specification fields." 
          });
          return;
        }

        await contactMessagesCollection.insertOne({
          name: contactPayload.name,
          email: contactPayload.email,
          phone: contactPayload.phone,
          subject: contactPayload.subject,
          message: contactPayload.message,
          status: "Unread",
          createdAt: new Date()
        });

        res.status(201).json({ 
          success: true, 
          message: "Message transmitted and ledger record deployed successfully." 
        });
      } catch (error: any) {
        console.error("❌ Critical failure in contact post pipeline:", error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // ========================================================
    // 📧 Contact Message GET API
    // ========================================================
    app.get('/api/v1/contact', async (req: Request, res: Response): Promise<void> => {
      try {
        const messages = await contactMessagesCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.status(200).json({ 
          success: true, 
          data: messages 
        });
      } catch (error: any) {
        console.error("❌ Failed to pull contact ledger logs:", error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
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