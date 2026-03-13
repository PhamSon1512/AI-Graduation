require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const AI_PROVIDER = process.env.AI_PROVIDER || 'groq';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let geminiClient = null;
let groqClient = null;

if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini client initialized');
}

if (GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here') {
  groqClient = new Groq({ apiKey: GROQ_API_KEY });
  console.log('✅ Groq client initialized');
} else {
  console.log('⚠️ GROQ_API_KEY:', GROQ_API_KEY ? 'Found but invalid' : 'Not found');
}

const PHYSICS_12_TOPICS = [
  'dao_dong_co',
  'song_co',
  'dien_xoay_chieu',
  'song_anh_sang',
  'luong_tu_anh_sang',
  'vat_ly_hat_nhan'
];

const BLOOM_LEVELS = ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];

const MODELS = {
  gemini: {
    vision: 'gemini-2.0-flash',
    text: 'gemini-2.0-flash'
  },
  groq: {
    vision: 'llama-3.2-90b-vision-preview',
    text: 'llama-3.3-70b-versatile'
  }
};

const getProvider = () => AI_PROVIDER;

const getGeminiModel = (type = 'vision') => {
  if (!geminiClient) {
    throw new Error('Gemini API Key chưa được cấu hình');
  }
  return geminiClient.getGenerativeModel({ model: MODELS.gemini[type] });
};

const getGroqClient = () => {
  if (!groqClient) {
    throw new Error('Groq API Key chưa được cấu hình');
  }
  return groqClient;
};

console.log(`🤖 AI Provider: ${AI_PROVIDER.toUpperCase()}`);

module.exports = {
  AI_PROVIDER,
  geminiClient,
  groqClient,
  getProvider,
  getGeminiModel,
  getGroqClient,
  MODELS,
  PHYSICS_12_TOPICS,
  BLOOM_LEVELS
};
