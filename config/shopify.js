const { shopifyApi } = require('@shopify/shopify-api');
const { ApiVersion } = require('@shopify/shopify-api');

// Check if Shopify credentials are configured
const isShopifyConfigured = () => {
  return process.env.SHOPIFY_API_KEY && 
         process.env.SHOPIFY_API_SECRET && 
         process.env.SHOPIFY_ACCESS_TOKEN &&
         process.env.SHOPIFY_STORE_URL;
};

// Lazy initialize Shopify API only when needed
let shopify = null;
const getShopifyInstance = () => {
  if (!shopify && isShopifyConfigured()) {
    shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: ['read_products', 'write_checkouts', 'read_orders'],
      hostName: process.env.SHOPIFY_APP_URL || 'localhost:3000',
      apiVersion: ApiVersion.July23,
      isEmbeddedApp: false,
    });
    console.log('✅ Shopify API initialized successfully');
  }
  return shopify;
};

// Create Shopify REST client
function createShopifyClient() {
  const shopifyInstance = getShopifyInstance();
  if (!shopifyInstance) {
    throw new Error('Shopify not configured. Please set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_ACCESS_TOKEN, and SHOPIFY_STORE_URL in config.env');
  }

  const session = {
    shop: process.env.SHOPIFY_STORE_URL,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  };

  return new shopifyInstance.clients.Rest({ session });
}

// Create checkout with custom attributes
async function createCheckout(bookingData) {
  try {
    const client = createShopifyClient();
    
    // Prepare custom attributes for checkout
    const customAttributes = [
      { key: 'booking_dates', value: JSON.stringify(bookingData.booking_dates) },
      { key: 'first_name', value: bookingData.first_name },
      { key: 'last_name', value: bookingData.last_name },
      { key: 'phone_number', value: bookingData.phone_number },
      { key: 'email', value: bookingData.email }
    ];

    // Create checkout payload
    const checkoutData = {
      checkout: {
        line_items: [
          {
            variant_id: bookingData.variant_id,
            quantity: bookingData.quantity || 1
          }
        ],
        custom_attributes: customAttributes,
        email: bookingData.email
      }
    };

    // Create checkout via Shopify API
    const response = await client.post({
      path: 'checkouts',
      data: checkoutData
    });

    return {
      success: true,
      checkout_id: response.body.checkout.id,
      checkout_url: response.body.checkout.web_url,
      checkout_token: response.body.checkout.token
    };

  } catch (error) {
    console.error('Shopify checkout creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get product details
async function getProduct(productId) {
  try {
    const client = createShopifyClient();
    
    const response = await client.get({
      path: `products/${productId}`
    });

    return {
      success: true,
      product: response.body.product
    };

  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get variant details
async function getVariant(variantId) {
  try {
    const client = createShopifyClient();
    
    const response = await client.get({
      path: `variants/${variantId}`
    });

    return {
      success: true,
      variant: response.body.variant
    };

  } catch (error) {
    console.error('Error fetching variant:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getShopifyInstance,
  createCheckout,
  getProduct,
  getVariant,
  isShopifyConfigured
};
