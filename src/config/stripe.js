// Stripe Payment Links Configuration
// Replace these with your actual Stripe Payment Links after creating them

export const STRIPE_LINKS = {
    // Subscription Products
    bluesky: 'https://naofumi3.gumroad.com/l/bluesky-marketer', // Replace with Stripe link
    instagram: 'https://naofumi3.gumroad.com/l/instagram-marketer', // Replace with Stripe link
    bundle: 'https://naofumi3.gumroad.com/l/sns-bundle', // Replace with Stripe link

    // One-time Products
    fortress: 'https://naofumi3.gumroad.com/l/sage-professional', // Replace with Stripe link
    developer: 'https://naofumi3.gumroad.com/l/sage-developer', // Replace with Stripe link
};

// UTM Parameters for tracking
export const addUTM = (url, source = 'website', medium = 'cta') => {
    const utm = `?utm_source=${source}&utm_medium=${medium}&utm_campaign=sage_direct`;
    return url.includes('?') ? `${url}&${utm.slice(1)}` : `${url}${utm}`;
};
