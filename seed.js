const mongoose = require('mongoose');
require('dotenv').config();

// Validate environment variables
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env file');
    process.exit(1);
}

// Define Schemas
const propertySchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    type: { type: String, required: true, enum: ['sale', 'rent', 'shortlet'] },
    price: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, required: true },
    image: { type: String, required: true },
    alt: { type: String, required: true },
    description: { type: String, default: '' },
    features: { type: [String], default: [] },
    images: { type: [String], default: [] },
});

const testimonialSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    quote: { type: String, required: true },
    author: { type: String, required: true },
    image: { type: String, required: true },
    alt: { type: String, required: true },
});

const blogSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, required: true },
    alt: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

// Define Models
const Property = mongoose.model('Property', propertySchema);
const Testimonial = mongoose.model('Testimonial', testimonialSchema);
const Blog = mongoose.model('Blog', blogSchema);

// Sample Data
const properties = [
    {
        id: 1,
        type: 'sale',
        price: '₦85,000,000',
        title: '5 Bedroom Detached Duplex',
        location: 'Karsana, Abuja',
        image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        alt: '5 Bedroom Detached Duplex in Karsana, Abuja',
        description: 'A luxurious 5-bedroom detached duplex in the heart of Karsana, offering spacious living areas, modern amenities, and a serene environment. Perfect for families seeking comfort and elegance.',
        features: ['5 Bedrooms', '6 Bathrooms', 'Large Living Area', 'Modern Kitchen', 'Private Garden', '24/7 Security'],
        images: [
            'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        ],
    },
    {
        id: 2,
        type: 'rent',
        price: '₦600,000/yr',
        title: '3 Bedroom Flat',
        location: 'Wuse, Abuja',
        image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        alt: '3 Bedroom Flat in Wuse, Abuja',
        description: 'A cozy 3-bedroom flat in Wuse, ideal for professionals or small families. Features modern finishes, ample parking, and proximity to business districts.',
        features: ['3 Bedrooms', '2 Bathrooms', 'Spacious Balcony', 'Fitted Kitchen', '24/7 Power Supply'],
        images: [
            'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1572120361638-6b95c297a6d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        ],
    },
    {
        id: 3,
        type: 'shortlet',
        price: '₦45,000/day',
        title: 'Luxury Apartment',
        location: 'Asokoro, Abuja',
        image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        alt: 'Luxury Apartment in Asokoro, Abuja',
        description: 'A stylish luxury apartment in Asokoro, perfect for short-term stays. Equipped with premium furnishings, high-speed Wi-Fi, and access to exclusive amenities.',
        features: ['2 Bedrooms', '2 Bathrooms', 'High-Speed Wi-Fi', 'Swimming Pool', 'Gym Access', 'Concierge Service'],
        images: [
            'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1580216643062-cf460548a66a?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80',
        ],
    },
    {
        id: 4,
        type: 'sale',
        price: '₦70,000,000',
        title: '4 Bedroom Terrace',
        location: 'Maitama, Abuja',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        alt: '4 Bedroom Terrace in Maitama, Abuja',
        description: 'A modern 4-bedroom terrace house in the prestigious Maitama district, featuring contemporary design, spacious interiors, and top-notch security.',
        features: ['4 Bedrooms', '5 Bathrooms', 'Private Parking', 'Modern Appliances', 'Secure Estate', 'Balcony'],
        images: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        ],
    },
    {
        id: 5,
        type: 'rent',
        price: '₦400,000/yr',
        title: '2 Bedroom Apartment',
        location: 'Garki, Abuja',
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        alt: '2 Bedroom Apartment in Garki, Abuja',
        description: 'A comfortable 2-bedroom apartment in Garki, ideal for young professionals or small families. Offers modern amenities and easy access to city centers.',
        features: ['2 Bedrooms', '2 Bathrooms', 'Fitted Wardrobes', 'Air Conditioning', 'Parking Space'],
        images: [
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1572120361638-6b95c297a6d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        ],
    },
    {
        id: 6,
        type: 'shortlet',
        price: '₦60,000/day',
        title: 'Penthouse',
        location: 'Jabi, Abuja',
        image: 'https://images.unsplash.com/photo-1572120361638-6b95c297a6d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        alt: 'Penthouse in Jabi, Abuja',
        description: 'A luxurious penthouse in Jabi, perfect for short-term luxury stays. Features stunning views, premium furnishings, and access to exclusive facilities.',
        features: ['3 Bedrooms', '3 Bathrooms', 'Rooftop Terrace', 'High-Speed Wi-Fi', 'Concierge Service', 'Gym Access'],
        images: [
            'https://images.unsplash.com/photo-1572120361638-6b95c297a6d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        ],
    },
];

const testimonials = [
    {
        id: 1,
        quote: "INTO REALTORS made finding my dream home in Abuja seamless and stress-free. Their professionalism is unmatched!",
        author: "Sarah Johnson",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80",
        alt: "Client 1"
    },
    {
        id: 2,
        quote: "The team at INTO REALTORS was incredibly helpful in securing a shortlet apartment in Asokoro. Highly recommend!",
        author: "Ahmed Musa",
        image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80",
        alt: "Client 2"
    },
    {
        id: 3,
        quote: "Their expertise and dedication helped us invest in the perfect property. Thank you, INTO REALTORS!",
        author: "Chioma Okeke",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80",
        alt: "Client 3"
    }
];

const blogs = [
    {
        id: 1,
        title: "Top 5 Tips for Buying Property in Abuja",
        description: "Discover expert advice to navigate the Abuja real estate market and find your dream home.",
        content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
        alt: "Blog Post 1"
    },
    {
        id: 2,
        title: "Why Shortlets Are Perfect for Travelers",
        description: "Learn why shortlet apartments in Abuja offer convenience and luxury for short-term stays.",
        content: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
        alt: "Blog Post 2"
    },
    {
        id: 3,
        title: "Investing in Abuja’s Real Estate Market",
        description: "Explore the opportunities and benefits of investing in Abuja’s growing property market.",
        content: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        image: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
        alt: "Blog Post 3"
    }
];

// Seeding Function
async function seedDB() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Property.deleteMany({});
        console.log('🗑️ Cleared existing properties');
        await Testimonial.deleteMany({});
        console.log('🗑️ Cleared existing testimonials');
        await Blog.deleteMany({});
        console.log('🗑️ Cleared existing blogs');

        // Insert new data
        await Property.insertMany(properties);
        console.log('🌱 Seeded properties');
        await Testimonial.insertMany(testimonials);
        console.log('🌱 Seeded testimonials');
        await Blog.insertMany(blogs);
        console.log('🌱 Seeded blogs');

        console.log('🌟 Database seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding database:', error.message, error.stack);
        if (error.code === 11000) {
            console.error('Duplicate key error. Ensure unique IDs for properties, testimonials, and blogs.');
        }
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

// Run seeding
seedDB();