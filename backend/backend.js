const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Require and configure dotenv

const app = express();
const port = process.env.PORT || 5000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing to allow our React app to talk to this server
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

// --- MongoDB Connection ---
// The connection string is now securely loaded from the .env file
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connection established successfully'))
    .catch(err => console.error('MongoDB connection error:', err));


// --- Mongoose Schema & Model ---
// This defines the structure of the documents we'll store in our MongoDB collection.
const daySchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        unique: true // Each date should have only one entry
    },
    totalCalories: {
        type: Number,
        default: 0
    },
    totalProtein: {
        type: Number,
        default: 0
    }
});

const Day = mongoose.model('Day', daySchema);

// --- Helper Functions ---
/**
 * Get today's date in YYYY-MM-DD format using local time (not UTC)
 */
const getTodayLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- API Endpoints (Routes) ---

/**
 * @route   GET /api/days
 * @desc    Get all daily records
 * @access  Public
 */
app.get('/api/days', async (req, res) => {
    try {
        const days = await Day.find().sort({ date: -1 }); // Sort by date descending
        res.json(days);
    } catch (err) {
        res.status(500).json({ message: 'Server Error: Could not fetch data.' });
    }
});

/**
 * @route   POST /api/meals
 * @desc    Add a meal's calories and protein for a specific day
 * @access  Public
 */
app.post('/api/meals', async (req, res) => {
    const { calories, protein, date } = req.body;

    // Basic validation
    if (!calories || !protein || !date || isNaN(calories) || isNaN(protein) || isNaN(date)) {
        return res.status(400).json({ message: 'Invalid input. Please provide numeric values for calories and protein.' });
    }

    // Get today's date in YYYY-MM-DD format using local time
    const today = date;

    try {
        // Find the document for today. If it doesn't exist, create a new one.
        // If it exists, update it by adding the new meal's values.
        const dayEntry = await Day.findOneAndUpdate(
            { date: today },
            {
                $inc: { // Use $inc to increment the values
                    totalCalories: Number(calories),
                    totalProtein: Number(protein)
                }
            },
            {
                new: true,    // Return the updated document
                upsert: true, // If no document matches, create a new one
                setDefaultsOnInsert: true // Apply default values if creating
            }
        );
        res.status(200).json(dayEntry);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error: Could not save data.' });
    }
});

/**
 * @route   PUT /api/days/reset
 * @desc    Reset today's calories and protein to 0
 * @access  Public
 */
app.put('/api/days/reset', async (req, res) => {
    const {  date } = req.body;

    // Basic validation
    if (!date || isNaN(date)) {
        return res.status(400).json({ message: 'Invalid input. Please provide a valid date.' });
    }

    // Get today's date in YYYY-MM-DD format using local time
    const today = date;

    try {
        // Find the document for today and reset values to 0
        const dayEntry = await Day.findOneAndUpdate(
            { date: today },
            {
                totalCalories: 0,
                totalProtein: 0
            },
            {
                new: true,    // Return the updated document
                upsert: true, // If no document matches, create a new one with 0 values
                setDefaultsOnInsert: true // Apply default values if creating
            }
        );
        res.json(dayEntry);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error: Could not reset data.' });
    }
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

