// Using direct REST API calls instead of Shopify API library to avoid adapter issues
const https = require('https');
const http = require('http');

// Check if Shopify credentials are configured
const isShopifyConfigured = () => {
  // Static fallback values (use these if env vars are not set)
  const staticStoreUrl = 'shumailstravel.myshopify.com';
  const staticAccessToken = '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';
  
  // Use environment variables if available, otherwise use static values
  const storeUrl = process.env.SHOPIFY_STORE_URL || staticStoreUrl;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || staticAccessToken;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  
  // For REST API, we only need access token and store URL
  // API key and secret are optional for REST API calls
  return storeUrl && accessToken;
};

// Get Shopify configuration values
const getShopifyConfig = () => {
  // Static fallback values
  const staticStoreUrl = 'shumailstravel.myshopify.com';
  const staticAccessToken = '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';
  
  const storeUrl = (process.env.SHOPIFY_STORE_URL || staticStoreUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || staticAccessToken;
  
  return {
    storeUrl: storeUrl,
    accessToken: accessToken,
    apiVersion: '2024-01' // Using stable API version
  };
};

// Make direct REST API call to Shopify
async function shopifyApiRequest(method, endpoint, data = null) {
  const config = getShopifyConfig();
  
  // Ensure endpoint ends with .json for Shopify REST API
  const endpointWithJson = endpoint.endsWith('.json') ? endpoint : `${endpoint}.json`;
  const url = `https://${config.storeUrl}/admin/api/${config.apiVersion}/${endpointWithJson}`;
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      // Handle redirects (3xx status codes)
      if (res.statusCode >= 300 && res.statusCode < 400) {
        const location = res.headers.location;
        console.log(`[Shopify API] Redirect ${res.statusCode} to: ${location}`);
        if (location) {
          // Follow redirect - handle both absolute and relative URLs
          let redirectUrl;
          if (location.startsWith('http://') || location.startsWith('https://')) {
            redirectUrl = new URL(location);
          } else {
            redirectUrl = new URL(location, `https://${config.storeUrl}`);
          }
          const redirectOptions = {
            hostname: redirectUrl.hostname,
            port: 443,
            path: redirectUrl.pathname + redirectUrl.search,
            method: method,
            headers: {
              'X-Shopify-Access-Token': config.accessToken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          };
          
          if (data && (method === 'POST' || method === 'PUT')) {
            const postData = JSON.stringify(data);
            redirectOptions.headers['Content-Length'] = Buffer.byteLength(postData);
          }
          
          const redirectReq = https.request(redirectOptions, (redirectRes) => {
            let redirectData = '';
            redirectRes.on('data', (chunk) => {
              redirectData += chunk;
            });
            redirectRes.on('end', () => {
              try {
                const parsed = JSON.parse(redirectData);
                if (redirectRes.statusCode >= 200 && redirectRes.statusCode < 300) {
                  resolve({
                    body: parsed,
                    status: redirectRes.statusCode,
                    headers: redirectRes.headers
                  });
                } else {
                  reject({
                    code: redirectRes.statusCode,
                    message: parsed.errors || parsed.error || 'Request failed',
                    response: {
                      status: redirectRes.statusCode,
                      body: parsed
                    }
                  });
                }
              } catch (e) {
                reject({
                  code: redirectRes.statusCode,
                  message: 'Invalid JSON response',
                  response: {
                    status: redirectRes.statusCode,
                    body: redirectData
                  }
                });
              }
            });
          });
          
          redirectReq.on('error', (error) => {
            reject({
              code: 'NETWORK_ERROR',
              message: error.message
            });
          });
          
          if (data && (method === 'POST' || method === 'PUT')) {
            redirectReq.write(JSON.stringify(data));
          }
          
          redirectReq.end();
          return;
        }
      }

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (responseData.trim() === '') {
            // Empty response
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                body: {},
                status: res.statusCode,
                headers: res.headers
              });
            } else {
              reject({
                code: res.statusCode,
                message: 'Empty response',
                response: {
                  status: res.statusCode,
                  body: {}
                }
              });
            }
            return;
          }
          
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              body: parsed,
              status: res.statusCode,
              headers: res.headers
            });
          } else {
            reject({
              code: res.statusCode,
              message: parsed.errors || parsed.error || 'Request failed',
              response: {
                status: res.statusCode,
                body: parsed
              }
            });
          }
        } catch (e) {
          reject({
            code: res.statusCode,
            message: `Invalid JSON response: ${e.message}`,
            response: {
              status: res.statusCode,
              body: responseData.substring(0, 500) // First 500 chars for debugging
            }
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        code: 'NETWORK_ERROR',
        message: error.message
      });
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Simple REST client wrapper for Shopify API
function createShopifyClient() {
  const config = getShopifyConfig();
  
  if (!config.storeUrl || !config.accessToken) {
    throw new Error('Shopify not configured. Please set SHOPIFY_ACCESS_TOKEN and SHOPIFY_STORE_URL in config.env');
  }

  return {
    get: async ({ path }) => {
      return await shopifyApiRequest('GET', path);
    },
    post: async ({ path, data }) => {
      return await shopifyApiRequest('POST', path, data);
    },
    put: async ({ path, data }) => {
      return await shopifyApiRequest('PUT', path, data);
    },
    delete: async ({ path }) => {
      return await shopifyApiRequest('DELETE', path);
    }
  };
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
    
    // Fetch only active products (Shopify REST API returns up to 250 products per request)
    // For stores with more products, we'd need pagination, but starting with first page
    const response = await client.get({
      path: 'products?status=active'
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
  createCheckout,
  getProduct,
  getVariant,
  getAllProducts,
  isShopifyConfigured
};
