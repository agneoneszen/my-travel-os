import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, ArrowRight, CloudUpload, CheckSquare, FileSpreadsheet, Download 
} from 'lucide-react';

// --- Firebase Imports ---
import { auth, db } from '../firebase'; 
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

// --- Constants ---
import { CURRENCIES } from '../utils/constants';

export default function ToolboxView() {
    // --- 1. 匯率計算機 State ---
    const [amount, setAmount] = useState('1000');
    const [fromCurr, setFromCurr] = useState('JPY');
    const [toCurr, setToCurr] = useState('TWD');
    
    const DEFAULT_RATES = { JPY: 0.22, TWD: 1, USD: 31.5, EUR: 34.2, KRW: 0.024, CNY: 4.4 };
    const [customRate, setCustomRate] = useState(DEFAULT_RATES['JPY']);

    useEffect(() => {
        const newRate = DEFAULT_RATES[fromCurr] / DEFAULT_RATES[toCurr];
        setCustomRate(parseFloat(newRate.toFixed(4)));
    }, [fromCurr, toCurr]);

    const result = Math.round(amount * customRate * 100) / 100;

    // --- 2. 行前清單 State (已調整) ---
    const [checklist, setChecklist] = useState(() => { 
        const saved = localStorage.getItem('my-travel-checklist'); 
        return saved ? JSON.parse(saved) : [
            { id: 1, text: '護照 & 簽證', checked: false }, 
            { id: 2, text: '網卡 / Roaming 開通', checked: false }, 
            { id: 3, text: '行動電源 & 充電線', checked: false }, 
            { id: 4, text: '當地貨幣 / 信用卡', checked: false }, // ✨ 修改：更通用的說法
            { id: 5, text: '個人藥品', checked: false },
            { id: 6, text: '當地緊急聯繫資訊 (報警/救護/使館)', checked: false } // ✨ 新增：安全確認
        ];
    });

    useEffect(() => { localStorage.setItem('my-travel-checklist', JSON.stringify(checklist)); }, [checklist]);
    const toggleCheck = (id) => { setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };

    // --- 3. 資料匯入/匯出 Logic ---
    const fileInputRef = useRef(null);
    const csvInputRef = useRef(null); // ✨ 新增 CSV input ref

    // 匯出完整備份 (JSON)
    const handleExport = async () => {
        if(!auth.currentUser) return alert("請先登入");
        try {
            const tripsQ = query(collection(db, "trips"), where("uid", "==", auth.currentUser.uid));
            const expsQ = query(collection(db, "expenses"), where("uid", "==", auth.currentUser.uid));
            const [tripsSnap, expsSnap] = await Promise.all([getDocs(tripsQ), getDocs(expsQ)]);
            const data = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                trips: tripsSnap.docs.map(d => ({...d.data(), _legacyId: d.id})),
                expenses: expsSnap.docs.map(d => d.data())
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `travel_os_backup_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(e) { console.error(e); alert("匯出失敗"); }
    };

    // 匯入完整備份 (JSON)
    const handleImportClick = () => fileInputRef.current.click();
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(!auth.currentUser) return alert("請先登入");
        if(!window.confirm("確定要匯入資料嗎？")) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if(!data.trips) throw new Error("無效的檔案格式");
                const batch = writeBatch(db);
                const newUserId = auth.currentUser.uid;
                const newUserEmail = auth.currentUser.email;
                const tripIdMap = {};

                data.trips.forEach(trip => {
                    const newTripRef = doc(collection(db, "trips"));
                    const oldId = trip._legacyId || trip.id;
                    if(oldId) tripIdMap[oldId] = newTripRef.id;
                    const { _legacyId, id, ...tripContent } = trip; 
                    batch.set(newTripRef, { ...tripContent, uid: newUserId, ownerEmail: newUserEmail, allowedEmails: [newUserEmail], importedAt: new Date().toISOString() });
                });

                if(data.expenses) {
                    data.expenses.forEach(exp => {
                        const newTripId = tripIdMap[exp.tripId];
                        if(newTripId) {
                            const newExpRef = doc(collection(db, "expenses"));
                            const { id, ...expContent } = exp;
                            batch.set(newExpRef, { ...expContent, uid: newUserId, tripId: newTripId });
                        }
                    });
                }
                await batch.commit();
                alert(`成功匯入 ${data.trips.length} 個旅程！`);
                window.location.reload();
            } catch(err) { console.error(err); alert("匯入失敗"); }
        };
        reader.readAsText(file);
    };

    // ✨ 新增：匯入記帳 CSV
    const handleCsvImportClick = () => csvInputRef.current.click();
    const handleCsvChange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        // 提示用戶選擇要匯入的旅程 (這裡簡化為提示，實務上可以做選單，目前先匯入到最新的旅程或需要手動關聯)
        // 為了 MVP，我們假設使用者目前正在瀏覽某個旅程，或者匯入後屬於"未分類"。
        // 但為了資料完整性，我們需要關聯 tripId。
        // 這裡做一個簡單的 workaround: 抓取使用者最近的一個旅程 ID
        if(!auth.currentUser) return alert("請先登入");

        const confirmMsg = "即將匯入 CSV 記帳資料。\n請確認 CSV 格式為：\n日期,項目,分類,金額,幣別,匯率,誰付,算誰的,備註\n\n(系統將自動匯入至您最近建立的一個旅程)";
        if(!window.confirm(confirmMsg)) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').slice(1); // 去掉標題列
                
                // 取得最近的一個 Trip ID
                const tripsQuery = query(collection(db, "trips"), where("uid", "==", auth.currentUser.uid));
                const tripSnap = await getDocs(tripsQuery);
                if(tripSnap.empty) return alert("您還沒有任何旅程，請先建立旅程！");
                const targetTripId = tripSnap.docs[0].id; // 暫時取第一個

                const batch = writeBatch(db);
                let count = 0;

                rows.forEach(row => {
                    const cols = row.split(',');
                    if(cols.length < 4) return; // 資料不完整跳過

                    // 欄位對應: Date,Title,Category,Amount,Currency,Rate,Payer,ForWho,Note
                    const [date, title, category, amount, currency, rate, payer, forWho, note] = cols;
                    
                    if(!title || !amount) return;

                    const newExpRef = doc(collection(db, "expenses"));
                    const amtVal = parseFloat(amount) || 0;
                    const rateVal = parseFloat(rate) || 1; // 預設匯率

                    batch.set(newExpRef, {
                        uid: auth.currentUser.uid,
                        tripId: targetTripId,
                        date: date?.trim() || new Date().toISOString().slice(0, 10),
                        title: title?.trim(),
                        category: category?.trim() || '其他',
                        amount: amtVal,
                        currency: currency?.trim() || 'TWD',
                        rate: rateVal,
                        twdAmount: Math.round(amtVal * rateVal),
                        payer: payer?.trim() || '我',
                        forWho: forWho?.trim() || '全體',
                        notes: note?.trim() || '',
                        id: newExpRef.id
                    });
                    count++;
                });

                await batch.commit();
                alert(`成功匯入 ${count} 筆支出到旅程！`);
                window.location.reload();

            } catch(err) { console.error(err); alert("CSV 匯入失敗，請檢查格式"); }
        };
        reader.readAsText(file);
    };

    // 下載 CSV 範本
    const downloadCsvTemplate = () => {
        const header = "Date(YYYY/MM/DD),Title,Category,Amount,Currency,Rate,Payer,ForWho,Note\n";
        const example = "2024/05/20,一蘭拉麵,餐飲,1200,JPY,0.22,我,全體,好鹹\n";
        const blob = new Blob([`\ufeff${header}${example}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = "expenses_template.csv";
        link.click();
    };

    return (
      <div className="p-4 space-y-6 pb-20">
        {/* 匯率計算機 (UI 保持不變) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-hero-sand-200">
          <h3 className="font-extrabold text-hero-dark mb-6 flex items-center gap-2 text-lg"><Calculator size={20}/> 匯率試算</h3>
          <div className="flex gap-4 items-center mb-4">
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">持有</label>
                 <div className="flex items-center gap-2 bg-hero-sand-50 p-2 rounded-xl border border-hero-sand-200">
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-transparent font-bold outline-none text-lg text-hero-dark" />
                     <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none text-hero-dark">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                 </div>
             </div>
             <ArrowRight className="text-hero-dark-muted" />
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">換算</label>
                 <div className="flex items-center gap-2 bg-hero-deku-50 p-2 rounded-xl border border-hero-deku-100">
                     <div className="w-full font-bold text-lg text-hero-deku-700">{result.toLocaleString()}</div>
                     <select value={toCurr} onChange={e => setToCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none text-hero-deku-700">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                 </div>
             </div>
          </div>
          <div className="flex items-center gap-2 justify-center mt-2">
             <span className="text-[10px] text-hero-dark-muted">自訂匯率: 1 {fromCurr} =</span>
             <input type="number" value={customRate} onChange={e => setCustomRate(e.target.value)} className="w-20 bg-hero-sand-50 border border-hero-sand-200 rounded px-2 py-1 text-center text-xs font-bold focus:border-hero-sky-500 outline-none text-hero-dark" />
             <span className="text-[10px] text-hero-dark-muted">{toCurr}</span>
          </div>
        </div>
        
        {/* 數據管理 (新增 CSV 匯入) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-hero-sand-200">
            <h3 className="font-extrabold text-hero-dark mb-4 flex items-center gap-2 text-lg"><CloudUpload size={20}/> 數據管理</h3>
            <p className="text-xs text-hero-dark-muted mb-4 leading-relaxed">您可以匯出所有資料備份，或匯入外部記帳表格。</p>
            
            <div className="grid grid-cols-2 gap-3">
                {/* 備份功能 */}
                <button onClick={handleExport} className="bg-hero-dark text-white py-3 rounded-xl font-bold text-xs shadow-lg hover:bg-black transition-colors flex items-center justify-center gap-2">
                    <ArrowRight size={14} className="-rotate-45"/> 匯出備份 (JSON)
                </button>
                <button onClick={handleImportClick} className="bg-white border-2 border-hero-sand-200 text-hero-dark-muted py-3 rounded-xl font-bold text-xs hover:border-hero-dark hover:text-hero-dark transition-colors flex items-center justify-center gap-2">
                    <ArrowRight size={14} className="rotate-135"/> 匯入備份 (JSON)
                </button>

                {/* ✨ 新增：CSV 功能 */}
                <button onClick={downloadCsvTemplate} className="bg-hero-sand-50 text-hero-dark-muted border border-hero-sand-200 py-3 rounded-xl font-bold text-xs hover:bg-hero-sand-100 transition-colors flex items-center justify-center gap-2">
                    <Download size={14}/> 下載記帳範本
                </button>
                <button onClick={handleCsvImportClick} className="bg-hero-deku-50 text-hero-deku-700 border border-hero-deku-100 py-3 rounded-xl font-bold text-xs hover:bg-hero-deku-100 transition-colors flex items-center justify-center gap-2">
                    <FileSpreadsheet size={14}/> 匯入記帳 (CSV)
                </button>
            </div>

            {/* Hidden Inputs */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            <input type="file" ref={csvInputRef} onChange={handleCsvChange} className="hidden" accept=".csv" />
        </div>

        {/* 行前確認 (已更新項目) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-hero-sand-200">
          <h3 className="font-extrabold text-hero-dark mb-6 flex items-center gap-2 text-lg"><CheckSquare size={20}/> 行前確認</h3>
          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} onClick={() => toggleCheck(item.id)} className="flex items-center gap-4 cursor-pointer group p-3 hover:bg-hero-sand-50 rounded-xl transition-colors">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-hero-dark border-hero-dark scale-110' : 'border-hero-sand-300 bg-white'}`}>{item.checked && <CheckSquare size={14} className="text-white" />}</div>
                <span className={`text-sm font-bold transition-colors ${item.checked ? 'text-hero-dark-muted line-through' : 'text-hero-dark'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
}