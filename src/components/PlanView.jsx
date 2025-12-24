import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Calendar, Plus, Trash2, GripVertical, Clock, MapPin, Globe, X, ArrowDown 
} from 'lucide-react';
import { TYPE_ICONS, TYPE_COLORS, generateId, addTime } from '../utils/constants';

// --- Helper: Recalculate Time Chain ---
// 核心邏輯：自動重新計算所有行程的時間
const recalcSchedule = (schedule) => {
    if (!schedule || schedule.length === 0) return [];
    
    // 深拷貝以避免直接修改 state
    const newSchedule = [...schedule];
    
    // 第一個行程的時間保持不變 (作為錨點)，從第二個開始重算
    for (let i = 1; i < newSchedule.length; i++) {
        const prevItem = newSchedule[i - 1];
        const prevDuration = parseFloat(prevItem.duration || 1);
        
        // 下一個行程的開始時間 = 上一個行程的開始時間 + 持續時間
        newSchedule[i].time = addTime(prevItem.time, prevDuration);
    }
    return newSchedule;
};

// --- Sub-component: ItemModal ---
function ItemModal({ initialData, tripTimezone, onClose, onSave }) {
    const defaultTz = initialData?.timezone || tripTimezone || 'Asia/Taipei';
    const [formData, setFormData] = useState(initialData || { time: '09:00', duration: '1', title: '', type: 'spot', address: '', tips: '', highlight: false, timezone: defaultTz });
    const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden"></div>
          <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-extrabold text-slate-800">{initialData ? '編輯行程' : '新增行程'}</h3><button onClick={onClose} className="bg-slate-50 p-2 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-500"/></button></div>
          <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-5">
             <div className="flex gap-4">
                <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">開始時間</label><div className="relative"><input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" /><Clock size={16} className="absolute left-3 top-4 text-slate-400"/></div></div>
                <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">預計結束</label><div className="flex items-center h-[54px] px-4 bg-slate-100 rounded-xl text-slate-500 text-sm font-bold">{addTime(formData.time, formData.duration)}</div></div>
             </div>
             <div className="flex gap-4">
                <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">類型</label><div className="relative"><select name="type" value={formData.type} onChange={handleChange} className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-black"><option value="spot">景點</option><option value="food">餐廳</option><option value="transport">交通</option><option value="stay">住宿</option><option value="relax">放鬆</option><option value="work">工作</option></select><div className="absolute left-3 top-4 text-slate-400">{TYPE_ICONS[formData.type] || <MapPin size={16}/>}</div></div></div>
                <div className="w-1/3"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">時長 (hr)</label><input type="number" step="0.5" name="duration" value={formData.duration} onChange={handleChange} className="w-full px-3 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none text-center focus:ring-2 focus:ring-black" /></div>
             </div>
             <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">標題</label><input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例：清水寺" className="w-full px-4 py-4 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" /></div>
             <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">地點</label><div className="relative"><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="輸入地址..." className="w-full pl-10 pr-3 py-4 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-black" /><MapPin size={16} className="absolute left-3 top-4 text-slate-400"/></div></div>
             <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">筆記</label><textarea name="tips" rows="3" value={formData.tips} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-black resize-none" placeholder="備註..."></textarea></div>
             <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"><input type="checkbox" name="highlight" checked={formData.highlight} onChange={handleChange} className="w-5 h-5 accent-red-500 rounded" /><span className="text-sm font-bold text-slate-600">標記為重點行程 🔥</span></label>
             <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all mt-4">{initialData ? '儲存變更' : '新增行程'}</button>
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
      // 如果是新增，且不是第一個行程，自動計算起始時間為上一個行程的結束
      if (daySchedule.length > 0) {
        const lastItem = daySchedule[daySchedule.length - 1];
        newItemWithId.time = addTime(lastItem.time, lastItem.duration || 1);
      }
      daySchedule.push(newItemWithId);
      // 新增時我們通常不重排順序，而是依賴用戶自己拖拉，或者你可以選擇在此處 sort
    }
    
    // ✨ 儲存時觸發全體時間重算 (確保連貫性)
    daySchedule = recalcSchedule(daySchedule);

    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
    setShowItemModal(false);
    setEditingItem(null);
    setEditingIndex(-1);
  };

  const handleDeleteItem = (index) => {
    if(!window.confirm("確定刪除？")) return;
    const newDays = [...(trip.days || [])];
    let daySchedule = newDays[activeDayIdx].schedule.filter((_, i) => i !== index);
    
    // ✨ 刪除後也要重算時間
    daySchedule = recalcSchedule(daySchedule);

    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: daySchedule };
    onUpdate({ ...trip, days: newDays });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(schedule);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // ✨ 拖拉後，根據新的順序，重新計算所有時間
    const recalculatedItems = recalcSchedule(items);

    const newDays = [...(trip.days || [])];
    newDays[activeDayIdx] = { ...newDays[activeDayIdx], schedule: recalculatedItems };
    onUpdate({ ...trip, days: newDays });
  };

  const openAdd = () => { setEditingIndex(-1); setEditingItem(null); setShowItemModal(true); };
  const openEdit = (item, index) => { setEditingIndex(index); setEditingItem(item); setShowItemModal(true); };

  return (
    <div className="pb-28 relative">
      {!currentDay ? (
          <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Calendar size={24} /></div>
              <p className="text-slate-500 font-bold mb-2">還沒有行程天數</p>
              <p className="text-slate-400 text-sm mb-6">點擊上方 + 按鈕來新增你的第一天</p>
          </div>
      ) : (
        <>
          {schedule.length === 0 && <div className="text-center py-16 text-slate-300 text-sm">尚無行程，點擊右下角新增</div>}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="schedule-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 px-4">
                  {schedule.map((item, idx) => (
                    <Draggable key={item.id || idx} draggableId={item.id || `item-${idx}`} index={idx}>
                      {(provided, snapshot) => (
                        <div 
                           ref={provided.innerRef} 
                           {...provided.draggableProps} 
                           // ✨ 關鍵修改：將 dragHandleProps 加在最外層，實現全區塊拖曳
                           {...provided.dragHandleProps}
                           onClick={() => openEdit(item, idx)} 
                           className="relative group outline-none"
                        >
                           {/* 連接線 UI */}
                           {idx !== schedule.length - 1 && (
                               <div className="absolute left-[1.65rem] top-12 bottom-[-1rem] w-[2px] bg-slate-100 -z-10 group-hover:bg-slate-200 transition-colors"></div>
                           )}
                           
                           <div className={`relative bg-white p-4 pl-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 border-black/10' : 'shadow-sm border-slate-50 hover:shadow-md hover:border-slate-200'}`}>
                             <div className="flex justify-between items-start">
                                 {/* 時間區塊 (顯示 Start - End) */}
                                 <div className="flex flex-col items-center gap-1 min-w-[4.5rem] pt-1 mr-2">
                                     <span className="text-sm font-bold font-mono text-slate-800">{item.time}</span>
                                     <ArrowDown size={10} className="text-slate-200 my-0.5"/>
                                     <span className="text-xs font-bold font-mono text-slate-400">{addTime(item.time, item.duration || 1)}</span>
                                 </div>

                                 <div className="flex-1 min-w-0 border-l border-slate-100 pl-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className={`font-bold text-slate-800 text-base truncate ${item.highlight ? 'text-red-500' : ''}`}>{item.title}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
                                                    {TYPE_ICONS[item.type] || TYPE_ICONS.other} 
                                                    {item.duration}h
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(idx); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                    
                                    {item.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 truncate hover:text-blue-500 hover:underline"><MapPin size={10}/> {item.address}</a>}
                                    {item.tips && <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">💡 {item.tips}</div>}
                                 </div>
                             </div>
                           </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <button onClick={openAdd} className="mx-4 mt-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm w-[calc(100%-2rem)] active:scale-95">
            <Plus size={16} /> 新增下一個行程
          </button>

          <button onClick={openAdd} className="fixed bottom-24 right-5 w-14 h-14 bg-black text-white rounded-full shadow-2xl shadow-black/40 flex items-center justify-center z-50 hover:scale-110 active:scale-90 transition-all"><Plus size={28} /></button>
        </>
      )}
      {showItemModal && <ItemModal initialData={editingItem} tripTimezone={trip.timezone} onClose={() => setShowItemModal(false)} onSave={handleSaveItem} />}
    </div>
  );
}