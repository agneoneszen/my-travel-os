import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, ArrowRight, CloudUpload, CheckSquare 
} from 'lucide-react';

// --- Firebase Imports ---
// 這裡必須往上一層找 firebase.js
import { auth, db } from '../firebase'; 
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

// --- Constants ---
import { CURRENCIES } from '../utils/constants';

export default function ToolboxView() {
    const [amount, setAmount] = useState('1000');
    const [fromCurr, setFromCurr] = useState('JPY');
    const [toCurr, setToCurr] = useState('TWD');
    
    // 簡單的寫死匯率，實務上可改為 API 獲取
    const DEFAULT_RATES = { JPY: 0.22, TWD: 1, USD: 31.5, EUR: 34.2, KRW: 0.024, CNY: 4.4 };
    const [customRate, setCustomRate] = useState(DEFAULT_RATES['JPY']);

    useEffect(() => {
        const newRate = DEFAULT_RATES[fromCurr] / DEFAULT_RATES[toCurr];
        setCustomRate(parseFloat(newRate.toFixed(4)));
    }, [fromCurr, toCurr]);

    const result = Math.round(amount * customRate * 100) / 100;

    const [checklist, setChecklist] = useState(() => { const saved = localStorage.getItem('my-travel-checklist'); return saved ? JSON.parse(saved) : [{ id: 1, text: '護照 & 簽證', checked: false }, { id: 2, text: '網卡 / Roaming 開通', checked: false }, { id: 3, text: '行動電源 & 充電線', checked: false }, { id: 4, text: '當地現金 / 信用卡', checked: false }, { id: 5, text: '個人藥品', checked: false }];});
    useEffect(() => { localStorage.setItem('my-travel-checklist', JSON.stringify(checklist)); }, [checklist]);
    const toggleCheck = (id) => { setChecklist(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item)); };

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

    const fileInputRef = useRef(null);
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

    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 mb-6 flex items-center gap-2 text-lg"><Calculator size={20}/> 匯率試算</h3>
          <div className="flex gap-4 items-center mb-4">
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">持有</label>
                 <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                     <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-transparent font-bold outline-none text-lg" />
                     <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                 </div>
             </div>
             <ArrowRight className="text-slate-300" />
             <div className="flex-1">
                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">換算</label>
                 <div className="flex items-center gap-2 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                     <div className="w-full font-bold text-lg text-emerald-600">{result.toLocaleString()}</div>
                     <select value={toCurr} onChange={e => setToCurr(e.target.value)} className="bg-transparent font-bold text-sm outline-none text-emerald-700">{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select>
                 </div>
             </div>
          </div>
          <div className="flex items-center gap-2 justify-center mt-2">
             <span className="text-[10px] text-slate-400">自訂匯率: 1 {fromCurr} =</span>
             <input type="number" value={customRate} onChange={e => setCustomRate(e.target.value)} className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-xs font-bold focus:border-black outline-none" />
             <span className="text-[10px] text-slate-400">{toCurr}</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-extrabold text-slate-800 mb-4 flex items-center gap-2 text-lg"><CloudUpload size={20}/> 數據管理</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">您可以匯出所有旅程與記帳資料進行備份。</p>
            <div className="flex gap-3">
                <button onClick={handleExport} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-colors flex items-center justify-center gap-2">
                    <ArrowRight size={14} className="-rotate-45"/> 匯出備份
                </button>
                <button onClick={handleImportClick} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:border-slate-800 hover:text-slate-800 transition-colors flex items-center justify-center gap-2">
                    <ArrowRight size={14} className="rotate-135"/> 匯入資料
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
            </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="font-extrabold text-slate-800 mb-6 flex items-center gap-2 text-lg"><CheckSquare size={20}/> 行前確認</h3>
          <div className="space-y-3">
            {checklist.map(item => (
              <div key={item.id} onClick={() => toggleCheck(item.id)} className="flex items-center gap-4 cursor-pointer group p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-black border-black scale-110' : 'border-slate-300 bg-white'}`}>{item.checked && <CheckSquare size={14} className="text-white" />}</div>
                <span className={`text-sm font-bold transition-colors ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
}