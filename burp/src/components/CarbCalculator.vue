<script setup>
import { ref } from "vue";
import axios from "axios";

const foodItem = ref("");
const weightInGrams = ref("");
const results = ref([]);
const loading = ref(false);
const error = ref("");

const API_ID = "de36fa6d";
const API_KEY = "d211c17061078477be49a6bba77e43b9";

async function calculateCarbs() {
  if (!foodItem.value || !weightInGrams.value) {
    error.value = "Please provide both a food item and weight in grams";
    return;
  }

  const weight = Number(weightInGrams.value);
  if (isNaN(weight)) {
    error.value = "Weight must be a valid number";
    return;
  }

  error.value = "";
  loading.value = true;

  try {
    // Search for the food item
    const response = await axios({
      method: "POST",
      url: "https://trackapi.nutritionix.com/v2/search/instant",
      headers: {
        "x-app-id": API_ID,
        "x-app-key": API_KEY,
        "x-remote-user-id": "0",
        "Content-Type": "application/json",
      },
      data: {
        query: foodItem.value,
        detailed: true,
      },
    });

    // Extract the top 3 common foods
    const topResults = response.data.common.slice(0, 3);

    // Get detailed nutrition information for each food
    const detailedResults = await Promise.all(
      topResults.map(async (item) => {
        const detailedResponse = await axios({
          method: "POST",
          url: "https://trackapi.nutritionix.com/v2/natural/nutrients",
          headers: {
            "x-app-id": API_ID,
            "x-app-key": API_KEY,
            "x-remote-user-id": "0",
            "Content-Type": "application/json",
          },
          data: {
            query: item.food_name,
          },
        });

        const food = detailedResponse.data.foods[0];
        console.log(food);

        // Extract food image URL and brand name
        const foodImage =
          food.photo && food.photo.thumb ? food.photo.thumb : null;
        const brandName = food.brand_name || null;

        // Calculate carbs per 100g
        const servingWeightGrams = food.serving_weight_grams;
        const carbsPer100g =
          servingWeightGrams > 0
            ? (food.nf_total_carbohydrate * 100) / servingWeightGrams
            : null;

        // Calculate carbs for the specified weight
        const carbsForRequestedWeight =
          carbsPer100g !== null ? (carbsPer100g * weight) / 100 : null;

        // Calculate insulin units required (1 unit per 5g of carbs)
        const insulinUnits =
          carbsForRequestedWeight !== null
            ? Math.round((carbsForRequestedWeight / 5) * 10) / 10
            : null;

        return {
          food_name: item.food_name,
          brand_name: brandName,
          food_image: foodImage,
          carbs_in_provided_weight:
            carbsForRequestedWeight !== null
              ? carbsForRequestedWeight.toFixed(2) + "g"
              : "Cannot calculate",
          requested_weight: weight + "g",
          carbs_per_100g:
            carbsPer100g !== null ? carbsPer100g.toFixed(2) + "g" : "Unknown",
          insulin_units:
            insulinUnits !== null
              ? insulinUnits.toFixed(1)
              : "Cannot calculate",
        };
      })
    );

    results.value = detailedResults;
  } catch (err) {
    error.value = err.response ? err.response.data : err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="text-center mb-8">
      <img
        src="https://raw.githubusercontent.com/PaddyCooper08/diatracker/ca9710f2da38c2d9bdcb75671d002a7f169425f6/burp/src/assets/burp.png"
        alt="burp logo"
        class="h-30 mx-auto mb-4"
      />
      <h1 class="text-3xl font-bold text-gray-800">burp</h1>
    </div>

    <div class="bg-white shadow-lg rounded-xl p-6 mb-8 border border-gray-100">
      <form
        @submit.prevent="calculateCarbs"
        class="space-y-5"
        autocomplete="off"
      >
        <div>
          <label
            for="foodItem"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Food Item</label
          >
          <input
            id="foodItem"
            v-model="foodItem"
            type="text"
            placeholder="e.g. apple, banana, rice"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            autocomplete="off"
            required
          />
        </div>

        <div>
          <label
            for="weightInGrams"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Weight (grams)</label
          >
          <input
            id="weightInGrams"
            v-model="weightInGrams"
            type="number"
            placeholder="e.g. 100"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            autocomplete="off"
            required
          />
        </div>

        <button
          type="submit"
          class="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all transform hover:scale-[1.02]"
          :disabled="loading"
        >
          <span v-if="loading" class="flex items-center justify-center">
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Calculating...
          </span>
          <span v-else>Calculate Carbs</span>
        </button>
      </form>
    </div>

    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-8"
    >
      {{ error }}
    </div>

    <div
      v-if="results.length"
      class="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100"
    >
      <h2 class="text-xl font-semibold p-5 bg-gray-50 border-b">
        Results for {{ foodItem }} ({{ weightInGrams }}g)
      </h2>

      <div class="divide-y divide-gray-100">
        <div
          v-for="(result, index) in results"
          :key="index"
          class="p-5 hover:bg-blue-50 transition-colors"
        >
          <div class="flex items-start gap-4 mb-3">
            <img
              v-if="result.food_image"
              :src="result.food_image"
              :alt="result.food_name"
              class="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
            />
            <div
              v-else
              class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-medium text-blue-600">
                {{ result.food_name }}
              </h3>
              <p v-if="result.brand_name" class="text-sm text-gray-600 mt-1">
                Brand: <span class="font-medium">{{ result.brand_name }}</span>
              </p>
            </div>
          </div>

          <ul class="space-y-2 text-gray-700">
            <li class="flex items-center">
              <span class="font-medium mr-2 text-gray-800"
                >Carbs in {{ result.requested_weight }}:</span
              >
              <span
                class="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-medium"
                >{{ result.carbs_in_provided_weight }}</span
              >
            </li>
            <li class="flex items-center">
              <span class="font-medium mr-2 text-gray-800"
                >Carbs per 100g:</span
              >
              <span
                class="bg-gray-100 text-gray-800 px-2 py-1 rounded-lg font-medium"
                >{{ result.carbs_per_100g }}</span
              >
            </li>
            <li class="flex items-center">
              <span class="font-medium mr-2 text-gray-800"
                >Insulin required:</span
              >
              <span
                class="bg-purple-100 text-purple-800 px-2 py-1 rounded-lg font-medium"
                >{{ result.insulin_units }} units</span
              >
              <span class="ml-2 text-xs text-gray-500"
                >(1 unit per 5g of carbs)</span
              >
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
