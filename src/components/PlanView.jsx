import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Calendar, Plus, Trash2, GripVertical, Clock, MapPin, Globe, X, ArrowDown, Camera, Image as ImageIcon, Coffee 
} from 'lucide-react';
import { TYPE_ICONS, TYPE_COLORS, generateId, addTime, getTimeDiff } from '../utils/constants';

// --- Sub-component: ItemModal ---
function ItemModal({ initialData, tripTimezone, onClose, onSave }) {
    const defaultTz = initialData?.timezone || tripTimezone || 'Asia/Taipei';
    
    const TYPE_LABELS = {
        spot: '景點', food: '餐廳', transport: '交通', stay: '住宿', relax: '放鬆', work: '工作'
    };

    const [formData, setFormData] = useState(initialData || { 
        time: '09:00', duration: '1', title: '', 
        type: 'spot', customTag: '景點',
        address: '', tips: '', 
        highlight: false, timezone: defaultTz, image: '' 
    });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setFormData(prev => ({ ...prev, image: dataUrl }));
            };
        };
        reader.readAsDataURL(file);
    };

    const handleChange = (e) => { 
        const { name, value, type, checked } = e.target; 
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); 
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setFormData(prev => ({
            ...prev,
            type: newType,
            customTag: TYPE_LABELS[newType]
        }));
    };
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-hero-sand-100 rounded-full mx-auto mb-8 sm:hidden"></div>
          <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-extrabold text-hero-dark">{initialData ? '編輯行程' : '新增行程'}</h3><button onClick={onClose} className="bg-hero-sand-50 p-2 rounded-full hover:bg-hero-sand-100"><X size={20} className="text-hero-dark-muted"/></button></div>
          <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
             <div className="flex gap-4">
                <div className="flex-1"><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">開始時間</label><div className="relative"><input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full pl-10 pr-3 py-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" /><Clock size={16} className="absolute left-3 top-4 text-hero-dark-muted"/></div></div>
                <div className="flex-1"><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">預計結束</label><div className="flex items-center h-[54px] px-4 bg-hero-sand-100 rounded-xl text-hero-dark-muted text-sm font-bold">{addTime(formData.time, formData.duration)}</div></div>
             </div>
             
             <div><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">標題</label><input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例：清水寺" className="w-full px-4 py-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" /></div>
             
             <div className="flex gap-4">
                <div className="w-1/3">
                    <label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">圖示分類</label>
                    <div className="relative">
                        <select name="type" value={formData.type} onChange={handleTypeChange} className="w-full pl-10 pr-3 py-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark">
                            <option value="spot">景點</option><option value="food">餐廳</option><option value="transport">交通</option><option value="stay">住宿</option><option value="relax">放鬆</option><option value="work">工作</option>
                        </select>
                        <div className="absolute left-3 top-4 text-hero-dark-muted">{TYPE_ICONS[formData.type] || <MapPin size={16}/>}</div>
                    </div>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">類型名稱 (可自訂)</label>
                    <input type="text" name="customTag" value={formData.customTag} onChange={handleChange} placeholder="例如: 拉麵、展覽..." className="w-full px-4 py-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" />
                </div>
             </div>

             <div className="flex gap-4">
                <div className="w-1/3"><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">時長 (hr)</label><input type="number" step="0.5" name="duration" value={formData.duration} onChange={handleChange} className="w-full px-3 py-4 bg-hero-sand-50 rounded-xl text-sm font-bold outline-none text-center focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" /></div>
                <div className="flex-1">
                    <label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">照片</label>
                    <label className="flex items-center justify-center gap-2 w-full p-4 bg-hero-sand-50 border-2 border-dashed border-hero-sand-200 rounded-xl text-hero-dark-muted hover:border-hero-dark-muted hover:text-hero-dark cursor-pointer h-[54px]">
                        <Camera size={16} />
                        <span className="text-xs font-bold">{formData.image ? '已選擇' : '上傳'}</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                </div>
             </div>

             <div><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">地點</label><div className="relative"><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="輸入地址..." className="w-full pl-10 pr-3 py-4 bg-hero-sand-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark" /><MapPin size={16} className="absolute left-3 top-4 text-hero-dark-muted"/></div></div>
             <div><label className="text-[10px] font-bold text-hero-dark-muted uppercase mb-1 block">筆記</label><textarea name="tips" rows="3" value={formData.tips} onChange={handleChange} className="w-full px-4 py-3 bg-hero-sand-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-hero-sky-500 text-hero-dark resize-none" placeholder="備註..."></textarea></div>
             <label className="flex items-center gap-3 p-4 bg-hero-sand-50 rounded-xl cursor-pointer hover:bg-hero-sand-100 transition-colors"><input type="checkbox" name="highlight" checked={formData.highlight} onChange={handleChange} className="w-5 h-5 accent-hero-smash-500 rounded" /><span className="text-sm font-bold text-hero-dark">標記為重點行程 🔥</span></label>
             <button type="submit" className="w-full bg-hero-sky-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-hero-sky-600 active:scale-95 transition-all mt-4">儲存變更</button>
          </form>
        </div>
      </div>
    );
}

// --- Main PlanView Component ---
export default function PlanView({ trip, activeDayIdx, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  
  const currentDay = trip.days?.[activeDayIdx];
  const schedule = currentDay?.schedule || [];

  const handleSaveItem = (itemData) => {
    const newDays = [...(trip.days || [])];
    if (!newDays[activeDayIdx]) return;

    let daySchedule = [...(newDays[activeDayIdx].schedule || [])];
    const newItemWithId = { ...itemData, id: itemData.id || generateId() };

    if (editingIndex >= 0) {
      daySchedule[editingIndex] = newItemWithId;
    } else {
      // 新增時，自動計算時間，但保留用戶在 Modal 的修改
      // (這裡不做額外處理，因為 Modal 已經決定了 time)
      daySchedule.push(newItemWithId);
      // 新增後可選擇是否自動排序，這裡保持用戶輸入順序，若需排序可加上 daySchedule.sort(...)
      daySchedule.sort((a, b) => a.time.localeCompare(b.time));
    }
    
    // ✨ 移除 recalcSchedule，尊重用戶自由設定的時間
    // daySchedule = recalcSchedule(daySchedule);

    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
    setShowItemModal(false);
    setEditingItem(null);
    setEditingIndex(-1);
  };

  const handleDeleteItem = (index) => {
    if(!window.confirm("確定刪除？")) return;
    const newDays = [...(trip.days || [])];
    const daySchedule = newDays[activeDayIdx].schedule.filter((_, i) => i !== index);
    // 移除 recalcSchedule
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(schedule);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // 移除 recalcSchedule，拖拉僅改變順序，不改變時間
    const newDays = [...(trip.days || [])];
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: items };
    onUpdate({ ...trip, days: newDays });
  };

  // ✨ 智慧開啟：自動帶入上一個行程的結束時間
  const openAdd = () => { 
      setEditingIndex(-1); 
      
      let nextStartTime = '09:00';
      if (schedule.length > 0) {
          const lastItem = schedule[schedule.length - 1];
          nextStartTime = addTime(lastItem.time, lastItem.duration || 1);
      }

      setEditingItem({ 
          time: nextStartTime, duration: '1', title: '', 
          type: 'spot', customTag: '景點',
          address: '', tips: '', highlight: false, image: ''
      }); 
      setShowItemModal(true); 
  };

  const openEdit = (item, index) => { setEditingIndex(index); setEditingItem(item); setShowItemModal(true); };

  const TYPE_LABELS = {
      spot: '景點', food: '餐廳', transport: '交通', stay: '住宿', relax: '放鬆', work: '工作'
  };

  return (
    <div className="pb-28 relative">
      {!currentDay ? (
          <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-hero-sand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-hero-dark-muted"><Calendar size={24} /></div>
              <p className="text-hero-dark-muted font-bold mb-2">還沒有行程天數</p>
              <p className="text-hero-dark-muted text-sm mb-6">點擊上方 + 按鈕來新增你的第一天</p>
          </div>
      ) : (
        <>
          {schedule.length === 0 && <div className="text-center py-16 text-hero-dark-muted text-sm">尚無行程，點擊右下角新增</div>}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="schedule-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 px-4">
                  {schedule.map((item, idx) => {
                    // ✨ 空檔偵測邏輯
                    let gapElement = null;
                    if (idx > 0) {
                        const prevItem = schedule[idx - 1];
                        const prevEndTime = addTime(prevItem.time, prevItem.duration || 1);
                        const gapMinutes = getTimeDiff(prevEndTime, item.time);
                        
                        if (gapMinutes > 0) {
                            gapElement = (
                                <div className="flex items-center justify-center py-2 opacity-60">
                                    <div className="h-[1px] bg-hero-dark-muted/30 w-12"></div>
                                    <div className="mx-3 text-[10px] font-bold text-hero-dark-muted bg-hero-sand-100 px-3 py-1 rounded-full flex items-center gap-1">
                                        <Coffee size={10} /> 空檔 {Math.floor(gapMinutes / 60) > 0 ? `${Math.floor(gapMinutes / 60)}h ` : ''}{gapMinutes % 60}m
                                    </div>
                                    <div className="h-[1px] bg-hero-dark-muted/30 w-12"></div>
                                </div>
                            );
                        }
                    }

                    return (
                      <React.Fragment key={item.id || idx}>
                        {gapElement}
                        <Draggable draggableId={item.id || `item-${idx}`} index={idx}>
                          {(provided, snapshot) => (
                            <div 
                               ref={provided.innerRef} 
                               {...provided.draggableProps} 
                               {...provided.dragHandleProps}
                               onClick={() => openEdit(item, idx)} 
                               className="relative group outline-none"
                            >
                               {/* 連接線 (如果沒有 Gap 才顯示連接線，或者視需求調整) */}
                               {idx !== schedule.length - 1 && (
                                   <div className="absolute left-[1.65rem] top-12 bottom-[-1rem] w-[2px] bg-hero-sand-200 -z-10 group-hover:bg-hero-sand-300 transition-colors"></div>
                               )}
                               
                               <div className={`relative bg-white p-4 pl-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 border-black/10' : 'shadow-sm border-hero-sand-200 hover:shadow-md hover:border-hero-sky-300'}`}>
                                 <div className="flex justify-between items-start">
                                     <div className="flex flex-col items-center gap-1 min-w-[4.5rem] pt-1 mr-2">
                                         <span className="text-sm font-bold font-mono text-hero-dark">{item.time}</span>
                                         <ArrowDown size={10} className="text-hero-dark-muted my-0.5"/>
                                         <span className="text-xs font-bold font-mono text-hero-dark-muted">{addTime(item.time, item.duration || 1)}</span>
                                     </div>

                                     <div className="flex-1 min-w-0 border-l border-hero-sand-100 pl-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className={`font-bold text-hero-dark text-base truncate ${item.highlight ? 'text-hero-smash-500' : ''}`}>{item.title}</h3>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
                                                        {TYPE_ICONS[item.type] || TYPE_ICONS.other} 
                                                        {item.customTag || TYPE_LABELS[item.type] || '其他'}
                                                    </span>
                                                    <span className="text-[10px] text-hero-dark-muted bg-hero-sand-100 px-2 py-1 rounded-md">{item.duration}h</span>
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(idx); }} className="p-2 text-hero-dark-muted hover:text-hero-smash-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={14}/></button>
                                        </div>
                                        
                                        {item.image && (
                                            <div className="mt-3 rounded-xl overflow-hidden shadow-sm border border-hero-sand-100 max-h-40 relative group/img">
                                                <img src={item.image} alt="Spot" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/10 group-hover/img:bg-transparent transition-colors"></div>
                                            </div>
                                        )}

                                        {item.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] text-hero-dark-muted mt-2 flex items-center gap-1 truncate hover:text-hero-sky-500 hover:underline"><MapPin size={10}/> {item.address}</a>}
                                        {item.tips && <div className="mt-3 text-[11px] text-hero-dark-muted bg-hero-sand-50 p-2.5 rounded-lg border border-hero-sand-100 leading-relaxed">💡 {item.tips}</div>}
                                     </div>
                                 </div>
                               </div>
                            </div>
                          )}
                        </Draggable>
                      </React.Fragment>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <button onClick={openAdd} className="mx-4 mt-6 py-4 bg-white text-hero-dark-muted border border-hero-sand-200 rounded-2xl font-bold hover:bg-hero-sand-50 transition-all flex items-center justify-center gap-2 text-sm w-[calc(100%-2rem)] active:scale-95">
            <Plus size={16} /> 新增下一個行程
          </button>

          <button onClick={openAdd} className="fixed bottom-24 right-5 w-14 h-14 bg-hero-sky-500 text-white rounded-full shadow-2xl shadow-hero-sky-500/30 flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all"><Plus size={28} /></button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} tripTimezone={trip.timezone} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}