/**
 * Supabase Configuration
 * Replace these values with your Supabase project credentials
 */

// Configuration object
window.SUPABASE_CONFIG = {
    // Get from: Supabase Dashboard → Settings → API → Project URL
    url: "https://kiaddxgvhkclqogfuwzh.supabase.co",

    // Get from: Supabase Dashboard → Settings → API → anon/public key
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpYWRkeGd2aGtjbHFvZ2Z1d3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjA5OTMsImV4cCI6MjA4NDQ5Njk5M30.zkrilaKHicGwciQrYNwbbFA0XP5VAYz16mpFab-T7aQ"
};

// Initialize Supabase client
window.supabaseClient = null;

// Initialize Supabase function
window.initSupabase = function () {
    if (window.SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        console.warn('⚠️ Supabase not configured! Using LocalStorage fallback.');
        return null;
    }

    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            window.supabaseClient = window.supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey
            );
            console.log('✅ Supabase connected successfully!');
            return window.supabaseClient;
        } else {
            console.warn('⚠️ Supabase library not loaded. Using LocalStorage fallback.');
            return null;
        }
    } catch (error) {
        console.error('❌ Supabase connection failed:', error);
        return null;
    }
};

// Check if Supabase is configured
window.isSupabaseConfigured = function () {
    return window.SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && window.supabaseClient !== null;
};

// Expose to global scope for compatibility
var SUPABASE_CONFIG = window.SUPABASE_CONFIG;
var supabaseClient = window.supabaseClient;
var initSupabase = window.initSupabase;
var isSupabaseConfigured = window.isSupabaseConfigured;
