const axios = require('axios');

require('dotenv').config();

// Nutritionix API credentials - replace with your own or store in .env file
const API_ID = process.env.NUTRITIONIX_API_ID;
const API_KEY = process.env.NUTRITIONIX_API_KEY;

async function calculateCarbs(foodItem, weightInGrams) {
    try {
        // Validate input
        if (!foodItem || !weightInGrams) {
            throw new Error("Please provide both a food item and weight in grams");
        }
        
        // Convert weight to number if it's a string
        const weight = Number(weightInGrams);
        if (isNaN(weight)) {
            throw new Error("Weight must be a valid number");
        }

        // Search for the food item
        const response = await axios({
            method: 'POST',
            url: 'https://trackapi.nutritionix.com/v2/search/instant',
            headers: {
                'x-app-id': API_ID,
                'x-app-key': API_KEY,
                'x-remote-user-id': '0', // 0 for development
                'Content-Type': 'application/json'
            },
            data: {
                query: foodItem,
                detailed: true
            }
        });

        // Extract the top 3 common foods
        const topResults = response.data.common.slice(0, 3);
        
        // Get detailed nutrition information for each food
        const detailedResults = await Promise.all(
            topResults.map(async (item) => {
                const detailedResponse = await axios({
                    method: 'POST',
                    url: 'https://trackapi.nutritionix.com/v2/natural/nutrients',
                    headers: {
                        'x-app-id': API_ID,
                        'x-app-key': API_KEY,
                        'x-remote-user-id': '0',
                        'Content-Type': 'application/json'
                    },
                    data: {
                        query: item.food_name
                    }
                });
                
                const food = detailedResponse.data.foods[0];
                
                // Calculate carbs per 100g
                const servingWeightGrams = food.serving_weight_grams;
                const carbsPer100g = servingWeightGrams > 0 
                    ? (food.nf_total_carbohydrate * 100) / servingWeightGrams 
                    : null;
                
                // Calculate carbs for the specified weight
                const carbsForRequestedWeight = carbsPer100g !== null 
                    ? (carbsPer100g * weight) / 100 
                    : null;
                
                return {
                    food_name: item.food_name,
                    carbs_in_provided_weight: carbsForRequestedWeight !== null 
                        ? carbsForRequestedWeight.toFixed(2) + 'g' 
                        : "Cannot calculate",
                    requested_weight: weight + 'g',
                    carbs_per_100g: carbsPer100g !== null 
                        ? carbsPer100g.toFixed(2) + 'g' 
                        : "Unknown",
                    original_serving: `${food.nf_total_carbohydrate}g per ${food.serving_qty} ${food.serving_unit} (${servingWeightGrams}g)`
                };
            })
        );

        // Display the results
        console.log(`Carbohydrate information for ${weight}g of "${foodItem}":`);
        console.table(detailedResults);

        return detailedResults;

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Example usage:
// calculateCarbs('apple', 200);
// This will calculate carbs in 200g of apple

// For testing in the terminal
const args = process.argv.slice(2);
if (args.length >= 2) {
    const food = args[0];
    const weight = args[1];
    calculateCarbs(food, weight)
        .catch(err => console.error('Error in execution:', err.message));
} else {
    console.log('Usage: node index.js "food name" weightInGrams');
    console.log('Example: node index.js "apple" 200')}