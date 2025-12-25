import React from 'react';
import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow, CloudFog } from 'lucide-react';

// --- 1. 將天氣代碼 (WMO Code) 轉為漂亮的 Icon ---
export const getWeatherIcon = (code, size = 16, className = "") => {
    if (code === 0) return <Sun size={size} className={`text-orange-500 ${className}`} />;
    if (code >= 1 && code <= 3) return <Cloud size={size} className={`text-hero-sky-400 ${className}`} />;
    if (code === 45 || code === 48) return <CloudFog size={size} className={`text-gray-400 ${className}`} />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} className={`text-blue-500 ${className}`} />;
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow size={size} className={`text-cyan-300 ${className}`} />;
    if (code >= 95 && code <= 99) return <CloudLightning size={size} className={`text-purple-500 ${className}`} />;
    return <Sun size={size} className={`text-gray-300 ${className}`} />;
};

// --- 2. 地點搜尋 API ---
export const getCoordinates = async (locationName) => {
    try {
        if (!locationName) return null;
        const cleanName = locationName.replace(/Trip|旅行|五日遊|之旅|Day|遊|家族|Family|東京|日本/gi, "").trim();
        // 如果清空後沒字了，就用原字串搜尋 (e.g. "Tokyo")
        const searchTerm = cleanName.length < 2 ? locationName.replace(/Trip|旅行|五日遊|之旅/gi, "").trim() : cleanName;
        
        // Console Log 方便除錯
        console.log("📍 正在搜尋地點座標:", searchTerm);

        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            console.log("✅ 找到座標:", data.results[0].name, data.results[0].latitude);
            return { 
                lat: data.results[0].latitude, 
                lon: data.results[0].longitude,
                name: data.results[0].name 
            };
        }
        return null;
    } catch (e) {
        console.error("Geo Error:", e);
        return null;
    }
};

// --- 3. 天氣預報 API (含備援機制) ---
export const getDailyWeather = async (lat, lon, dateStr) => {
    try {
        if (!lat || !lon || !dateStr) return null;
        
        const targetDate = dateStr.replace(/\//g, '-');
        console.log("🌦️ 正在查詢天氣:", targetDate);
        
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${targetDate}&end_date=${targetDate}`
        );
        const data = await res.json();

        // 情況 A: 成功抓到真實資料
        if (data.daily && data.daily.time.length > 0 && data.daily.temperature_2m_max[0] !== null) {
            console.log("✅ 抓到真實天氣!");
            return {
                maxTemp: Math.round(data.daily.temperature_2m_max[0]),
                minTemp: Math.round(data.daily.temperature_2m_min[0]),
                rainProb: data.daily.precipitation_probability_max[0] || 0,
                code: data.daily.weather_code[0]
            };
        }
        
        // 情況 B: 日期太遠，API 回傳空值 -> 啟用「模擬數據」
        console.warn("⚠️ 日期太遠無真實數據，使用模擬數據");
        return getMockWeather();

    } catch (e) {
        console.error("Weather Error:", e);
        // 情況 C: 網路錯誤 -> 啟用「模擬數據」
        return getMockWeather();
    }
};

// ✨ 新增：產生隨機模擬天氣 (確保 UI 永遠有東西顯示)
const getMockWeather = () => {
    return {
        maxTemp: 22 + Math.floor(Math.random() * 5), // 隨機 22~26 度
        minTemp: 16 + Math.floor(Math.random() * 3), // 隨機 16~18 度
        rainProb: Math.floor(Math.random() * 30),    // 隨機 0~30% 降雨
        code: 1, // 預設 1 (多雲時晴)
        isMock: true // 標記這是模擬資料
    };
};