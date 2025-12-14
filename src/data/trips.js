export const initialTrips = [
    {
      id: "sea-tour-2025",
      title: "馬尼拉・峇里島・新加坡跳島行",
      dates: "2025.10.03 - 10.14",
      // 這裡放一張代表性的封面圖 (Unsplash 連結)
      coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1000", 
      days: [
        // --- 馬尼拉 ---
        {
          date: "10/03",
          weekday: "Fri",
          location: "Manila, Philippines",
          schedule: [
            { time: "20:30", type: "transport", title: "飛往馬尼拉", address: "MNL Airport", tips: "TPE -> MNL" },
            { time: "23:00", type: "transport", title: "抵達 & 入住", address: "Airbnb", tips: "記得聯繫房東拿鑰匙" },
            { time: "01:30", type: "relax", title: "Chang Thai Massage", address: "Spa CGS", tips: "深夜按摩放鬆" },
            { time: "03:30", type: "food", title: "Jollibee", address: "Manila", tips: "必吃炸雞與肉醬麵" }
          ]
        },
        {
          date: "10/04",
          weekday: "Sat",
          location: "Manila",
          schedule: [
            { time: "12:00", type: "work", title: "處理工作", address: "Airbnb" },
            { time: "13:30", type: "food", title: "中東捲餅", address: "Local Street Food" },
            { time: "15:00", type: "spot", title: "Manila Cathedral", address: "Intramuros", highlight: true },
            { time: "16:30", type: "spot", title: "城中城 e-bike 之旅", address: "Fort Santiago / San Agustin", tips: "古蹟巡禮" },
            { time: "20:00", type: "food", title: "Bistro Remedios", address: "Malate, Manila", tips: "菲式料理晚餐" },
            { time: "22:00", type: "spot", title: "Okada Manila", address: "Entertainment City", tips: "夜遊、看噴泉表演" }
          ]
        },
        {
          date: "10/05",
          weekday: "Sun",
          location: "Manila",
          schedule: [
            { time: "14:00", type: "food", title: "Terry’s Bistro", address: "Salcedo", tips: "西班牙風味午餐" },
            { time: "16:30", type: "spot", title: "Venice Grand Canal Mall", address: "Taguig", tips: "逛街、威尼斯運河造景" },
            { time: "21:40", type: "relax", title: "Thai Royale Spa", address: "Makati", tips: "睡前按摩" }
          ]
        },
        // --- 峇里島 ---
        {
          date: "10/06",
          weekday: "Mon",
          location: "Bali, Indonesia",
          schedule: [
            { time: "07:40", type: "transport", title: "抵達峇里島", address: "DPS Airport" },
            { time: "10:30", type: "spot", title: "喜來登會面", address: "Sheraton Bali" },
            { time: "12:40", type: "spot", title: "GWK Cultural Park", address: "Ungasan", highlight: true },
            { time: "13:00", type: "food", title: "Mie Ayam & Bakso", address: "Solo Wonogiri", tips: "印尼雞肉麵" },
            { time: "14:00", type: "relax", title: "入住 Green GWK Villa", address: "Bali", tips: "游泳、休息" },
            { time: "18:50", type: "food", title: "Jimbaran Bay Seafood", address: "Jimbaran Beach", highlight: true, tips: "沙灘海鮮晚餐" }
          ]
        },
        {
          date: "10/07",
          weekday: "Tue",
          location: "Bali",
          schedule: [
            { time: "14:00", type: "spot", title: "Tegallalang Rice Terrace", address: "Ubud", tips: "德哥拉朗梯田" },
            { time: "15:40", type: "spot", title: "Tirta Empul Temple", address: "Tampaksiring", highlight: true, tips: "聖泉寺淨身儀式" },
            { time: "20:00", type: "food", title: "Wedja Restaurant", address: "Ubud", tips: "峇里島傳統料理" }
          ]
        },
        {
          date: "10/08",
          weekday: "Wed",
          location: "Bali",
          schedule: [
            { time: "15:00", type: "food", title: "Bossman Bali", address: "Seminyak", tips: "知名漢堡店" },
            { time: "17:45", type: "relax", title: "按摩放鬆", address: "Local Spa" },
            { time: "20:50", type: "food", title: "This is Bali", address: "Restaurant" }
          ]
        },
        {
          date: "10/09",
          weekday: "Thu",
          location: "Bali",
          schedule: [
            { time: "12:00", type: "spot", title: "Ubud Palace", address: "Ubud", tips: "烏布皇宮" },
            { time: "13:00", type: "food", title: "Naughty Nuri’s", address: "Ubud", highlight: true, tips: "必吃豬肋排" },
            { time: "15:30", type: "spot", title: "Tegenungan Waterfall", address: "Sukawati", tips: "瀑布景觀" },
            { time: "21:30", type: "relax", title: "Finns Beach Club", address: "Canggu", tips: "海灘俱樂部派對" }
          ]
        },
        {
          date: "10/10",
          weekday: "Fri",
          location: "Bali",
          schedule: [
            { time: "16:00", type: "relax", title: "Udara Yoga Detox", address: "Seseh", tips: "瑜伽體驗" },
            { time: "17:40", type: "spot", title: "Thalassa Seseh", address: "Seseh Beach", tips: "觀賞夕陽" },
            { time: "20:00", type: "food", title: "Waroeng Bernadette", address: "Seminyak" },
            { time: "22:00", type: "relax", title: "Finns Beach Club", address: "Canggu", tips: "續攤" }
          ]
        },
        // --- 新加坡 ---
        {
          date: "10/11",
          weekday: "Sat",
          location: "Singapore",
          schedule: [
            { time: "08:00", type: "transport", title: "飛往新加坡", address: "Changi Airport" },
            { time: "10:20", type: "spot", title: "Jewel Changi", address: "Airport", highlight: true, tips: "星耀樟宜瀑布" },
            { time: "13:50", type: "spot", title: "Merlion Park", address: "Marina Bay", tips: "魚尾獅公園" },
            { time: "17:50", type: "relax", title: "入住 Carlton Hotel", address: "Bras Basah" },
            { time: "19:00", type: "spot", title: "Gardens by the Bay", address: "Marina Bay", highlight: true, tips: "雲霧林 & 花穹" },
            { time: "22:00", type: "food", title: "Haidilao Hot Pot", address: "Marina Bay Sands", tips: "海底撈宵夜" }
          ]
        },
        {
          date: "10/12",
          weekday: "Sun",
          location: "Singapore",
          schedule: [
            { time: "11:30", type: "work", title: "處理工作", address: "Hotel / Cafe" },
            { time: "17:00", type: "food", title: "松發肉骨茶", address: "VivoCity", highlight: true, tips: "Song Fa Bak Kut Teh" },
            { time: "18:30", type: "relax", title: "聖淘沙海灘散步", address: "Sentosa" },
            { time: "20:30", type: "spot", title: "牛車水", address: "Chinatown" },
            { time: "21:50", type: "food", title: "28 HongKong St", address: "Bar", tips: "知名酒吧" },
            { time: "23:00", type: "relax", title: "克拉碼頭 & LevelUp", address: "Clarke Quay", tips: "打電動、撞球" }
          ]
        },
        {
          date: "10/13",
          weekday: "Mon",
          location: "Singapore",
          schedule: [
            { time: "11:00", type: "work", title: "工作 & 茶姬", address: "City" },
            { time: "20:00", type: "transport", title: "前往動物園", address: "Taxi", tips: "跟司機聊天" },
            { time: "21:00", type: "spot", title: "Night Safari", address: "Mandai", highlight: true, tips: "夜間動物園" },
            { time: "00:30", type: "food", title: "Lau Pa Sat 老巴剎", address: "Raffles Quay", tips: "宵夜：魚片伊麵" }
          ]
        },
        {
          date: "10/14",
          weekday: "Tue",
          location: "Singapore",
          schedule: [
            { time: "12:30", type: "food", title: "神奇燒臘 Magic Roast", address: "Local Shop" },
            { time: "13:30", type: "spot", title: "Arab St & Haji Lane", address: "Kampong Glam", tips: "彩繪巷弄" },
            { time: "14:00", type: "work", title: "Fika Swedish Café", address: "Beach Rd", tips: "咖啡廳工作" },
            { time: "21:00", type: "transport", title: "前往機場", address: "Changi Airport" },
            { time: "22:00", type: "food", title: "麥當勞", address: "Changi Airport", tips: "離境前最後一餐" }
          ]
        }
      ]
    }
  ];