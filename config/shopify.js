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
    
    // Convert productId to string if it's a number (Shopify API expects string)
    const productIdStr = String(productId);
    
    const response = await client.get({
      path: `products/${productIdStr}`
    });

    return {
      success: true,
      product: response.body.product
    };

  } catch (error) {
    console.error('Error fetching product:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusCode: error.statusCode,
      response: error.response
    });
    
    // Extract more detailed error information
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = errorMessage;
    let statusCode = error.code || error.status || error.statusCode || 'Unknown';
    
    // Check if error has response body with more details
    if (error.response) {
      if (error.response.body) {
        const errorBody = error.response.body;
        if (errorBody.errors) {
          errorDetails = JSON.stringify(errorBody.errors);
        } else if (errorBody.error) {
          errorDetails = errorBody.error;
        } else if (typeof errorBody === 'string') {
          errorDetails = errorBody;
        }
      }
      if (error.response.status) {
        statusCode = error.response.status;
      }
    }
    
    // Check for 404 specifically
    if (statusCode === 404 || errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      errorDetails = `Product with ID "${productId}" not found in Shopify store. Please verify the product ID exists and is active in your Shopify admin.`;
    }
    
    return {
      success: false,
      error: `Received an error response (${statusCode} ${statusCode === 404 ? 'Not Found' : ''}) from Shopify:\n"${errorDetails}"`
    };
  }
}

// Get variant details
async function getVariant(variantId) {
  try {
    const client = createShopifyClient();
    
    // Convert variantId to string if it's a number (Shopify API expects string)
    const variantIdStr = String(variantId);
    
    const response = await client.get({
      path: `variants/${variantIdStr}`
    });

    return {
      success: true,
      variant: response.body.variant
    };

  } catch (error) {
    console.error('Error fetching variant:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusCode: error.statusCode,
      response: error.response
    });
    
    // Extract more detailed error information
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = errorMessage;
    let statusCode = error.code || error.status || error.statusCode || 'Unknown';
    
    // Check if error has response body with more details
    if (error.response) {
      if (error.response.body) {
        const errorBody = error.response.body;
        if (errorBody.errors) {
          errorDetails = JSON.stringify(errorBody.errors);
        } else if (errorBody.error) {
          errorDetails = errorBody.error;
        } else if (typeof errorBody === 'string') {
          errorDetails = errorBody;
        }
      }
      if (error.response.status) {
        statusCode = error.response.status;
      }
    }
    
    // Check for 404 specifically
    if (statusCode === 404 || errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      errorDetails = `Variant with ID "${variantId}" not found in Shopify store. Please verify the variant ID exists and is active in your Shopify admin.`;
    }
    
    return {
      success: false,
      error: `Received an error response (${statusCode} ${statusCode === 404 ? 'Not Found' : ''}) from Shopify:\n"${errorDetails}"`
    };
  }
}

// Get all products from Shopify store
async function getAllProducts() {
  try {
    const client = createShopifyClient();
    
    // Fetch products (Shopify REST API returns up to 250 products per request)
    // For stores with more products, we'd need pagination, but starting with first page
    const response = await client.get({
      path: 'products'
    });

    const products = response.body?.products || [];

    return {
      success: true,
      products: products
    };

  } catch (error) {
    console.error('Error fetching all products:', error);
    
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = errorMessage;
    let statusCode = error.code || error.status || error.statusCode || 'Unknown';
    
    if (error.response) {
      if (error.response.body) {
        const errorBody = error.response.body;
        if (errorBody.errors) {
          errorDetails = JSON.stringify(errorBody.errors);
        } else if (errorBody.error) {
          errorDetails = errorBody.error;
        } else if (typeof errorBody === 'string') {
          errorDetails = errorBody;
        }
      }
      if (error.response.status) {
        statusCode = error.response.status;
      }
    }
    
    return {
      success: false,
      error: `Received an error response (${statusCode}) from Shopify: "${errorDetails}"`
    };
  }
}

module.exports = {
  getShopifyInstance,
  createCheckout,
  getProduct,
  getVariant,
  getAllProducts,
  isShopifyConfigured
};
