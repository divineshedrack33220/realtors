const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Render's load balancer
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: isProduction ? ['https://intorealtors.onrender.com', 'http://localhost:3000'] : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Check for required environment variables
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env file');
    process.exit(1);
}
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not defined in .env file');
    process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection
let upload; // Declare multer upload variable
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 10,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
}).then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('Database readyState:', mongoose.connection.readyState);

    // Multer Configuration for in-memory storage
    const storage = multer.memoryStorage();
    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            console.log('Accepted file:', { filename: file.originalname, mimetype: file.mimetype, fieldname: file.fieldname });
            cb(null, true);
        } else {
            console.log('Rejected file:', { filename: file.originalname, mimetype: file.mimetype, fieldname: file.fieldname });
            cb(new Error(`Only image files are allowed. Got ${file.mimetype}`), false);
        }
    };

    upload = multer({
        storage,
        fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit per file
            files: 10, // Max 10 images
        },
    });

    // Rate Limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: { error: 'Too many requests, please try again later.' },
    });
    app.use('/api/', limiter);

    // Schemas
    const propertySchema = new mongoose.Schema({
        id: { type: String, default: uuidv4, unique: true },
        type: { type: String, required: true, enum: ['sale', 'rent', 'shortlet'] },
        price: { type: String, required: true },
        title: { type: String, required: true },
        location: { type: String, required: true },
        image: { type: String, required: true }, // Cloudinary URL
        alt: { type: String, required: true },
        description: { type: String, default: '' },
        features: { type: [String], default: [] },
        images: { type: [String], default: [] }, // Cloudinary URLs
        createdAt: { type: Date, default: Date.now },
    });

    const testimonialSchema = new mongoose.Schema({
        id: { type: String, default: uuidv4, unique: true },
        quote: { type: String, required: true },
        author: { type: String, required: true },
        image: { type: String, required: true }, // Cloudinary URL
        alt: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    });

    const blogSchema = new mongoose.Schema({
        id: { type: String, default: uuidv4, unique: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        content: { type: String, required: true },
        image: { type: String, required: true }, // Cloudinary URL
        alt: { type: String, required: true },
        date: { type: Date, default: Date.now },
    });

    const contactSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
    });

    const userSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    });

    const visitorSchema = new mongoose.Schema({
        id: { type: String, default: uuidv4, unique: true },
        ip: { type: String, required: true },
        date: { type: Date, required: true, index: true },
        count: { type: Number, default: 1 },
        createdAt: { type: Date, default: Date.now },
    });

    const Property = mongoose.model('Property', propertySchema);
    const Testimonial = mongoose.model('Testimonial', testimonialSchema);
    const Blog = mongoose.model('Blog', blogSchema);
    const Contact = mongoose.model('Contact', contactSchema);
    const User = mongoose.model('User', userSchema);
    const Visitor = mongoose.model('Visitor', visitorSchema);

    // Validation Middleware
    const validateProperty = [
        body('type').isIn(['sale', 'rent', 'shortlet']).withMessage('Type must be sale, rent, or shortlet'),
        body('price').notEmpty().withMessage('Price is required'),
        body('title').notEmpty().withMessage('Title is required'),
        body('location').notEmpty().withMessage('Location is required'),
        body('alt').notEmpty().withMessage('Alt text is required'),
    ];

    const validateSearch = [
        query('location').optional().isString().isLength({ min: 3 }).withMessage('Location must be at least 3 characters long'),
        query('type').optional().isIn(['sale', 'rent', 'shortlet']).withMessage('Type must be sale, rent, or shortlet'),
    ];

    const validateTestimonial = [
        body('quote').notEmpty().withMessage('Quote is required'),
        body('author').notEmpty().withMessage('Author is required'),
        body('alt').notEmpty().withMessage('Alt text is required'),
    ];

    const validateBlog = [
        body('title').notEmpty().withMessage('Title is required'),
        body('description').notEmpty().withMessage('Description is required'),
        body('content').notEmpty().withMessage('Content is required'),
        body('alt').notEmpty().withMessage('Alt text is required'),
    ];

    const validateContact = [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please enter a valid email address'),
        body('phone').optional().isMobilePhone('any').withMessage('Please enter a valid phone number'),
        body('message').notEmpty().withMessage('Message is required'),
    ];

    const validateUser = [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Please enter a valid email address'),
    ];

    const validateLogin = [
        body('username').notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ];

    // Helper Function to Upload to Cloudinary
    const uploadToCloudinary = (file) => {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'intorealtors',
                    public_id: `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`,
                    quality: 80, // High quality
                    fetch_format: 'auto', // Optimize format (e.g., WebP)
                    width: 1920, // Max width
                    crop: 'limit', // Prevent upscaling
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve({ url: result.secure_url, public_id: result.public_id });
                }
            );
            stream.end(file.buffer);
        });
    };

    // Helper Function to Delete from Cloudinary
    const deleteFromCloudinary = async (publicIds) => {
        try {
            await Promise.all(
                publicIds.map(async (publicId) => {
                    if (!publicId) {
                        console.log('Skipping deletion of empty public ID');
                        return;
                    }
                    await cloudinary.uploader.destroy(publicId).catch(err => {
                        if (err.http_code === 404) {
                            console.log(`Cloudinary file not found: ${publicId}`);
                        } else {
                            console.error(`Error deleting Cloudinary file ${publicId}:`, err.message);
                        }
                    });
                })
            );
        } catch (error) {
            console.error('Error in deleteFromCloudinary:', error.message);
        }
    };

    // Debug Routes
    app.get('/api/debug/mongodb', async (req, res) => {
        try {
            await mongoose.connection.db.admin().ping();
            res.json({ message: 'MongoDB connection successful', status: mongoose.connection.readyState });
        } catch (error) {
            console.error('MongoDB debug error:', error.message, error.stack);
            res.status(500).json({ error: 'MongoDB connection failed', details: error.message });
        }
    });

    // Property Routes
    app.get('/api/properties/search', validateSearch, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { location, type } = req.query;
            const query = {};
            if (location) query.location = new RegExp(location, 'i');
            if (type) query.type = type;
            const properties = await Property.find(query);
            properties.forEach(property => {
                property.image = property.image.replace('/upload/', '/upload/q_80,f_auto/');
                property.images = property.images.map(img => img.replace('/upload/', '/upload/q_80,f_auto/'));
            });
            console.log(`📡 /api/properties/search: Fetched ${properties.length} properties (location: ${location || 'all'}, type: ${type || 'all'})`);
            res.json(properties);
        } catch (error) {
            console.error('Error searching properties:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to search properties' });
        }
    });

    app.get('/api/properties', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const properties = await Property.find().skip(skip).limit(limit).sort({ createdAt: -1 });
            const total = await Property.countDocuments();
            properties.forEach(property => {
                property.image = property.image.replace('/upload/', '/upload/q_80,f_auto/');
                property.images = property.images.map(img => img.replace('/upload/', '/upload/q_80,f_auto/'));
            });
            console.log(`📡 /api/properties: Fetched ${properties.length} properties (page: ${page}, limit: ${limit}, total: ${total})`);
            res.json({ properties, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('Error fetching properties:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch properties' });
        }
    });

    app.get('/api/properties/locations', async (req, res) => {
        try {
            const locations = await Property.aggregate([
                { $group: { _id: '$location', count: { $sum: 1 }, minPrice: { $min: '$price' }, image: { $first: '$image' } } },
                { $project: { location: '$_id', count: 1, minPrice: 1, image: 1, _id: 0 } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]);
            locations.forEach(location => {
                location.image = location.image.replace('/upload/', '/upload/q_80,f_auto/');
            });
            console.log(`📡 /api/properties/locations: Fetched ${locations.length} locations`);
            res.json(locations);
        } catch (error) {
            console.error('Error fetching locations:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch locations' });
        }
    });

    app.get('/api/properties/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid property ID format' });
            }
            const property = await Property.findById(req.params.id);
            if (!property) return res.status(404).json({ error: 'Property not found' });
            property.image = property.image.replace('/upload/', '/upload/q_80,f_auto/');
            property.images = property.images.map(img => img.replace('/upload/', '/upload/q_80,f_auto/'));
            console.log(`📡 /api/properties/${req.params.id}: Fetched property ID ${req.params.id}`);
            res.json(property);
        } catch (error) {
            console.error('Error fetching property:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch property' });
        }
    });

    app.post('/api/properties', upload.array('files', 10), validateProperty, async (req, res) => {
        try {
            console.log('POST /api/properties - Request body:', req.body);
            console.log('POST /api/properties - Uploaded files:', req.files?.map(f => ({ filename: f.originalname })) || 'No files');
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.files && req.files.length) {
                    await deleteFromCloudinary(req.files.map(file => file.originalname));
                }
                return res.status(400).json({ errors: errors.array() });
            }
            const { type, price, title, location, alt, description, features } = req.body;
            let imageUrls = [];
            let publicIds = [];
            if (req.files && req.files.length) {
                const uploadPromises = req.files.map(file => uploadToCloudinary(file));
                const results = await Promise.all(uploadPromises);
                imageUrls = results.map(result => result.url);
                publicIds = results.map(result => result.public_id);
            } else {
                return res.status(400).json({ error: 'At least one image is required for new properties' });
            }
            const propertyData = {
                id: uuidv4(),
                type,
                price,
                title,
                location,
                image: imageUrls[0],
                alt,
                description: description || '',
                features: features ? features.split(',').map(f => f.trim()).filter(f => f) : [],
                images: imageUrls.slice(1),
            };
            const property = new Property(propertyData);
            await property.save();
            console.log(`📡 /api/properties: Created property ${title} with ${imageUrls.length} images`);
            res.status(201).json(property);
        } catch (error) {
            if (req.files && req.files.length) {
                const publicIds = req.files.map(file => file.originalname);
                await deleteFromCloudinary(publicIds);
            }
            console.error('Error creating property:', error.message, error.stack);
            res.status(500).json({ error: `Failed to create property: ${error.message}` });
        }
    });

    app.put('/api/properties/:id', upload.array('files', 10), validateProperty, async (req, res) => {
        try {
            console.log('PUT /api/properties/:id - Request body:', req.body);
            console.log('PUT /api/properties/:id - Uploaded files:', req.files?.map(f => ({ filename: f.originalname })) || 'No files');
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.files && req.files.length) {
                    const publicIds = req.files.map(file => file.originalname);
                    await deleteFromCloudinary(publicIds);
                }
                return res.status(400).json({ errors: errors.array() });
            }
            if (!mongoose.isValidObjectId(req.params.id)) {
                if (req.files && req.files.length) {
                    const publicIds = req.files.map(file => file.originalname);
                    await deleteFromCloudinary(publicIds);
                }
                return res.status(400).json({ error: 'Invalid property ID format' });
            }
            const existingProperty = await Property.findById(req.params.id);
            if (!existingProperty) {
                if (req.files && req.files.length) {
                    const publicIds = req.files.map(file => file.originalname);
                    await deleteFromCloudinary(publicIds);
                }
                return res.status(404).json({ error: 'Property not found' });
            }
            const { type, price, title, location, alt, description, features } = req.body;
            let imageUrls = [];
            let publicIds = [];
            if (req.files && req.files.length) {
                const uploadPromises = req.files.map(file => uploadToCloudinary(file));
                const results = await Promise.all(uploadPromises);
                imageUrls = results.map(result => result.url);
                publicIds = results.map(result => result.public_id);
                // Delete old images from Cloudinary
                const oldPublicIds = [existingProperty.image, ...existingProperty.images]
                    .map(url => url.split('/').pop().split('.')[0]); // Extract public_id from URL
                await deleteFromCloudinary(oldPublicIds);
            } else {
                imageUrls = [existingProperty.image, ...existingProperty.images];
            }
            const propertyData = {
                type,
                price,
                title,
                location,
                image: imageUrls[0],
                alt,
                description: description || '',
                features: features ? features.split(',').map(f => f.trim()).filter(f => f) : existingProperty.features,
                images: imageUrls.slice(1),
            };
            const property = await Property.findByIdAndUpdate(
                req.params.id,
                { $set: propertyData },
                { new: true, runValidators: true }
            );
            console.log(`📡 /api/properties/${req.params.id}: Updated property ID ${req.params.id} with ${imageUrls.length} images`);
            res.json(property);
        } catch (error) {
            if (req.files && req.files.length) {
                const publicIds = req.files.map(file => file.originalname);
                await deleteFromCloudinary(publicIds);
            }
            console.error('Error updating property:', error.message, error.stack);
            res.status(500).json({ error: `Failed to update property: ${error.message}` });
        }
    });

    app.delete('/api/properties/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid property ID format' });
            }
            const property = await Property.findById(req.params.id);
            if (!property) return res.status(404).json({ error: 'Property not found' });
            const publicIds = [property.image, ...property.images]
                .map(url => url.split('/').pop().split('.')[0]);
            await deleteFromCloudinary(publicIds);
            await Property.findByIdAndDelete(req.params.id);
            console.log(`📡 /api/properties/${req.params.id}: Deleted property ID ${req.params.id}`);
            res.json({ message: 'Property deleted successfully' });
        } catch (error) {
            console.error('Error deleting property:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete property' });
        }
    });

    // Testimonial Routes
    app.get('/api/testimonials', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const testimonials = await Testimonial.find().skip(skip).limit(limit).sort({ createdAt: -1 });
            const total = await Testimonial.countDocuments();
            testimonials.forEach(testimonial => {
                testimonial.image = testimonial.image.replace('/upload/', '/upload/q_80,f_auto/');
            });
            console.log(`📡 /api/testimonials: Fetched ${testimonials.length} testimonials (page: ${page}, limit: ${limit}, total: ${total})`);
            res.json({ testimonials, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('Error fetching testimonials:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch testimonials' });
        }
    });

    app.get('/api/testimonials/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid testimonial ID format' });
            }
            const testimonial = await Testimonial.findById(req.params.id);
            if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });
            testimonial.image = testimonial.image.replace('/upload/', '/upload/q_80,f_auto/');
            console.log(`📡 /api/testimonials/${req.params.id}: Fetched testimonial ID ${req.params.id}`);
            res.json(testimonial);
        } catch (error) {
            console.error('Error fetching testimonial:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch testimonial' });
        }
    });

    app.post('/api/testimonials', upload.single('image'), validateTestimonial, async (req, res) => {
        try {
            console.log('POST /api/testimonials - Request body:', req.body);
            console.log('POST /api/testimonials - Uploaded file:', req.file ? { filename: req.file.originalname } : 'No file');
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(400).json({ errors: errors.array() });
            }
            const { quote, author, alt } = req.body;
            if (!req.file) {
                return res.status(400).json({ error: 'Image file is required for new testimonials' });
            }
            const { url, public_id } = await uploadToCloudinary(req.file);
            const testimonialData = {
                id: uuidv4(),
                quote,
                author,
                image: url,
                alt,
            };
            const testimonial = new Testimonial(testimonialData);
            await testimonial.save();
            console.log(`📡 /api/testimonials: Created testimonial ${author} with image ${url}`);
            res.status(201).json(testimonial);
        } catch (error) {
            if (req.file) {
                await deleteFromCloudinary([req.file.originalname]);
            }
            console.error('Error creating testimonial:', error.message, error.stack);
            res.status(500).json({ error: `Failed to create testimonial: ${error.message}` });
        }
    });

    app.put('/api/testimonials/:id', upload.single('image'), validateTestimonial, async (req, res) => {
        try {
            console.log('PUT /api/testimonials/:id - Request body:', req.body);
            console.log('PUT /api/testimonials/:id - Uploaded file:', req.file ? { filename: req.file.originalname } : 'No file');
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(400).json({ errors: errors.array() });
            }
            if (!mongoose.isValidObjectId(req.params.id)) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(400).json({ error: 'Invalid testimonial ID format' });
            }
            const existingTestimonial = await Testimonial.findById(req.params.id);
            if (!existingTestimonial) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(404).json({ error: 'Testimonial not found' });
            }
            const { quote, author, alt } = req.body;
            let imageUrl = existingTestimonial.image;
            if (req.file) {
                const { url, public_id } = await uploadToCloudinary(req.file);
                imageUrl = url;
                const oldPublicId = existingTestimonial.image.split('/').pop().split('.')[0];
                await deleteFromCloudinary([oldPublicId]);
            }
            const testimonialData = {
                quote,
                author,
                image: imageUrl,
                alt,
            };
            const testimonial = await Testimonial.findByIdAndUpdate(
                req.params.id,
                { $set: testimonialData },
                { new: true, runValidators: true }
            );
            console.log(`📡 /api/testimonials/${req.params.id}: Updated testimonial ID ${req.params.id} with image ${imageUrl}`);
            res.json(testimonial);
        } catch (error) {
            if (req.file) {
                await deleteFromCloudinary([req.file.originalname]);
            }
            console.error('Error updating testimonial:', error.message, error.stack);
            res.status(500).json({ error: `Failed to update testimonial: ${error.message}` });
        }
    });

    app.delete('/api/testimonials/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid testimonial ID format' });
            }
            const testimonial = await Testimonial.findById(req.params.id);
            if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });
            const publicId = testimonial.image.split('/').pop().split('.')[0];
            await deleteFromCloudinary([publicId]);
            await Testimonial.findByIdAndDelete(req.params.id);
            console.log(`📡 /api/testimonials/${req.params.id}: Deleted testimonial ID ${req.params.id}`);
            res.json({ message: 'Testimonial deleted successfully' });
        } catch (error) {
            console.error('Error deleting testimonial:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete testimonial' });
        }
    });

    // Blog Routes
    app.get('/api/blogs', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const blogs = await Blog.find().sort({ date: -1 }).skip(skip).limit(limit);
            const total = await Blog.countDocuments();
            blogs.forEach(blog => {
                blog.image = blog.image.replace('/upload/', '/upload/q_80,f_auto/');
            });
            console.log(`📡 /api/blogs: Fetched ${blogs.length} blogs (page: ${page}, limit: ${limit}, total: ${total})`);
            res.json({ blogs, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('Error fetching blogs:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch blogs' });
        }
    });

    app.get('/api/blogs/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid blog ID format' });
            }
            const blog = await Blog.findById(req.params.id);
            if (!blog) return res.status(404).json({ error: 'Blog not found' });
            blog.image = blog.image.replace('/upload/', '/upload/q_80,f_auto/');
            console.log(`📡 /api/blogs/${req.params.id}: Fetched blog ID ${req.params.id}`);
            res.json(blog);
        } catch (error) {
            console.error('Error fetching blog:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch blog' });
        }
    });

    app.post('/api/blogs', upload.single('image'), validateBlog, async (req, res) => {
        try {
            console.log('POST /api/blogs - Request body:', req.body);
            console.log('POST /api/blogs - Uploaded file:', req.file ? { filename: req.file.originalname } : 'No file');
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(400).json({ errors: errors.array() });
            }
            const { title, description, content, alt } = req.body;
            if (!req.file) {
                return res.status(400).json({ error: 'Image file is required for new blogs' });
            }
            const { url, public_id } = await uploadToCloudinary(req.file);
            const blogData = {
                id: uuidv4(),
                title,
                description,
                content,
                image: url,
                alt,
                date: Date.now(),
            };
            const blog = new Blog(blogData);
            await blog.save();
            console.log(`📡 /api/blogs: Created blog ${title} with image ${url}`);
            res.status(201).json(blog);
        } catch (error) {
            if (req.file) {
                await deleteFromCloudinary([req.file.originalname]);
            }
            console.error('Error creating blog:', error.message, error.stack);
            res.status(500).json({ error: `Failed to create blog: ${error.message}` });
        }
    });

    app.put('/api/blogs/:id', upload.single('image'), validateBlog, async (req, res) => {
        try {
            console.log('PUT /api/blogs/:id - Request body:', req.body);
            console.log('PUT /api/blogs/:id - Uploaded file:', req.file ? { filename: req.file.originalname } : 'No file');
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(400).json({ errors: errors.array() });
            }
            if (!mongoose.isValidObjectId(req.params.id)) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(400).json({ error: 'Invalid blog ID format' });
            }
            const existingBlog = await Blog.findById(req.params.id);
            if (!existingBlog) {
                if (req.file) {
                    await deleteFromCloudinary([req.file.originalname]);
                }
                return res.status(404).json({ error: 'Blog not found' });
            }
            const { title, description, content, alt } = req.body;
            let imageUrl = existingBlog.image;
            if (req.file) {
                const { url, public_id } = await uploadToCloudinary(req.file);
                imageUrl = url;
                const oldPublicId = existingBlog.image.split('/').pop().split('.')[0];
                await deleteFromCloudinary([oldPublicId]);
            }
            const blogData = {
                title,
                description,
                content,
                image: imageUrl,
                alt,
                date: Date.now(),
            };
            const blog = await Blog.findByIdAndUpdate(
                req.params.id,
                { $set: blogData },
                { new: true, runValidators: true }
            );
            console.log(`📡 /api/blogs/${req.params.id}: Updated blog ID ${req.params.id} with image ${imageUrl}`);
            res.json(blog);
        } catch (error) {
            if (req.file) {
                await deleteFromCloudinary([req.file.originalname]);
            }
            console.error('Error updating blog:', error.message, error.stack);
            res.status(500).json({ error: `Failed to update blog: ${error.message}` });
        }
    });

    app.delete('/api/blogs/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid blog ID format' });
            }
            const blog = await Blog.findById(req.params.id);
            if (!blog) return res.status(404).json({ error: 'Blog not found' });
            const publicId = blog.image.split('/').pop().split('.')[0];
            await deleteFromCloudinary([publicId]);
            await Blog.findByIdAndDelete(req.params.id);
            console.log(`📡 /api/blogs/${req.params.id}: Deleted blog ID ${req.params.id}`);
            res.json({ message: 'Blog deleted successfully' });
        } catch (error) {
            console.error('Error deleting blog:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete blog' });
        }
    });

    // Contact Routes
    app.get('/api/contact', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const contacts = await Contact.find().skip(skip).limit(limit).sort({ createdAt: -1 });
            const total = await Contact.countDocuments();
            console.log(`📡 /api/contact: Fetched ${contacts.length} contact messages (page: ${page}, limit: ${limit}, total: ${total})`);
            res.json({ contacts, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('Error fetching contact messages:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch contact messages' });
        }
    });

    app.get('/api/contact/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid contact ID format' });
            }
            const contact = await Contact.findById(req.params.id);
            if (!contact) return res.status(404).json({ error: 'Contact message not found' });
            console.log(`📡 /api/contact/${req.params.id}: Fetched contact message ID ${req.params.id}`);
            res.json(contact);
        } catch (error) {
            console.error('Error fetching contact message:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch contact message' });
        }
    });

    app.post('/api/contact', validateContact, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            const contact = new Contact(req.body);
            await contact.save();
            console.log(`📡 /api/contact: Saved contact message from ${req.body.email}`);
            res.status(201).json({ message: 'Contact message saved successfully' });
        } catch (error) {
            console.error('Error saving contact message:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to save contact message' });
        }
    });

    app.put('/api/contact/:id', validateContact, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid contact ID format' });
            }
            const contact = await Contact.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { new: true, runValidators: true }
            );
            if (!contact) return res.status(404).json({ error: 'Contact message not found' });
            console.log(`📡 /api/contact/${req.params.id}: Updated contact message ID ${req.params.id}`);
            res.json(contact);
        } catch (error) {
            console.error('Error updating contact message:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to update contact message' });
        }
    });

    app.delete('/api/contact/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid contact ID format' });
            }
            const contact = await Contact.findByIdAndDelete(req.params.id);
            if (!contact) return res.status(404).json({ error: 'Contact message not found' });
            console.log(`📡 /api/contact/${req.params.id}: Deleted contact message ID ${req.params.id}`);
            res.json({ message: 'Contact message deleted successfully' });
        } catch (error) {
            console.error('Error deleting contact message:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete contact message' });
        }
    });

    // User Routes
    app.get('/api/users', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const users = await User.find().skip(skip).limit(limit).sort({ createdAt: -1 });
            const total = await User.countDocuments();
            console.log(`📡 /api/users: Fetched ${users.length} users (page: ${page}, limit: ${limit}, total: ${total})`);
            res.json({ users, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('Error fetching users:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });

    app.get('/api/users/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            console.log(`📡 /api/users/${req.params.id}: Fetched user ID ${req.params.id}`);
            res.json(user);
        } catch (error) {
            console.error('Error fetching user:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    });

    app.post('/api/users', validateUser, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            const user = new User(req.body);
            await user.save();
            console.log(`📡 /api/users: Created user ${req.body.email}`);
            res.status(201).json(user);
        } catch (error) {
            console.error('Error creating user:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to create user' });
        }
    });

    app.put('/api/users/:id', validateUser, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
            const user = await User.findByIdAndUpdate(
                req.params.id,
                { $set: { ...req.body, updatedAt: Date.now() } },
                { new: true, runValidators: true }
            );
            if (!user) return res.status(404).json({ error: 'User not found' });
            console.log(`📡 /api/users/${req.params.id}: Updated user ID ${req.params.id}`);
            res.json(user);
        } catch (error) {
            console.error('Error updating user:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to update user' });
        }
    });

    app.post('/api/users/approve/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
            const user = await User.findByIdAndUpdate(
                req.params.id,
                { $set: { status: 'approved', updatedAt: Date.now() } },
                { new: true, runValidators: true }
            );
            if (!user) return res.status(404).json({ error: 'User not found' });
            console.log(`📡 /api/users/approve/${req.params.id}: Approved user ID ${req.params.id}`);
            res.json(user);
        } catch (error) {
            console.error('Error approving user:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to approve user' });
        }
    });

    app.post('/api/users/reject/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
            const user = await User.findByIdAndUpdate(
                req.params.id,
                { $set: { status: 'rejected', updatedAt: Date.now() } },
                { new: true, runValidators: true }
            );
            if (!user) return res.status(404).json({ error: 'User not found' });
            console.log(`📡 /api/users/reject/${req.params.id}: Rejected user ID ${req.params.id}`);
            res.json(user);
        } catch (error) {
            console.error('Error rejecting user:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to reject user' });
        }
    });

    app.delete('/api/users/:id', async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) return res.status(404).json({ error: 'User not found' });
            console.log(`📡 /api/users/${req.params.id}: Deleted user ID ${req.params.id}`);
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    });

    app.get('/api/testimonials/search', async (req, res) => {
        try {
            const { search } = req.query;
            const query = search ? { $or: [{ quote: new RegExp(search, 'i') }, { author: new RegExp(search, 'i') }] } : {};
            const testimonials = await Testimonial.find(query);
            testimonials.forEach(testimonial => {
                testimonial.image = testimonial.image.replace('/upload/', '/upload/q_80,f_auto/');
            });
            console.log(`📡 /api/testimonials/search: Fetched ${testimonials.length} testimonials (search: ${search || 'all'})`);
            res.json(testimonials);
        } catch (error) {
            console.error('Error searching testimonials:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to search testimonials' });
        }
    });

    // Visitor Tracking Routes
    app.post('/api/visitors', async (req, res) => {
        try {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let visitor = await Visitor.findOne({ ip, date: { $gte: today, $lt: tomorrow } });
            if (!visitor) {
                visitor = new Visitor({ id: uuidv4(), ip, date: today });
                await visitor.save();
            }

            const total = await Visitor.countDocuments({ date: { $gte: today, $lt: tomorrow } });
            console.log(`📡 /api/visitors: Tracked visitor IP ${ip}, today's count: ${total}`);
            res.json({ dailyVisitors: total });
        } catch (error) {
            console.error('Error tracking visitor:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to track visitor' });
        }
    });

    app.get('/api/visitors', async (req, res) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const total = await Visitor.countDocuments({ date: { $gte: today, $lt: tomorrow } });
            console.log(`📡 /api/visitors: Fetched daily visitor count: ${total}`);
            res.json({ dailyVisitors: total });
        } catch (error) {
            console.error('Error fetching visitor count:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to fetch visitor count' });
        }
    });

    // Login Route
    app.post('/api/login', validateLogin, async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { username, password } = req.body;
            const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
            const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
            if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
                console.log(`📡 /api/login: Failed login attempt for username ${username}`);
                return res.status(401).json({ error: 'Invalid username or password' });
            }
            console.log(`📡 /api/login: Successful login for username ${username}`);
            res.status(200).json({ message: 'Login successful' });
        } catch (error) {
            console.error('Error during login:', error.message, error.stack);
            res.status(500).json({ error: 'Failed to process login' });
        }
    });

    // Fallback for SPA
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error Handling
    app.use((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                console.log('Multer error: File size limit exceeded', { field: err.field, body: req.body, files: req.files });
                return res.status(400).json({ error: 'File size exceeds 5MB limit' });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                console.log('Multer error: File count limit exceeded', { field: err.field, body: req.body, files: req.files });
                return res.status(400).json({ error: 'Maximum 10 images allowed' });
            }
            console.log('Multer error:', { message: err.message, field: err.field, body: req.body, files: req.files });
            return res.status(400).json({ error: err.message });
        }
        console.error('❌ Server error:', err.message, err.stack);
        res.status(500).json({ error: 'Something broke!' });
    });

    // Start the server
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ MongoDB connection error:', err.message, err.stack);
    process.exit(1);
});