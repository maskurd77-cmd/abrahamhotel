import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order } from '../../types';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Only pending and preparing
    const q = query(
      collection(db, 'orders'),
      where('order_status', 'in', ['pending', 'preparing'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      ords.sort((a, b) => {
         const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
         const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
         return timeA - timeB; // asc
      });
      setOrders(ords);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        order_status: newStatus
      });
      toast.success(`Order ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Helper to safely format timestamp
  const formatTime = (ts: any) => {
    if (!ts || !ts.toDate) return '--:--';
    return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Kitchen Display System</h2>
        <div className="bg-slate-900 text-white px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-mono text-sm tracking-widest">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full items-stretch min-w-max">
          {orders.map(order => (
            <div 
              key={order.id} 
              className={cn(
                "w-[340px] rounded-xl flex flex-col shrink-0 overflow-hidden shadow-md",
                order.order_status === 'pending' ? "bg-white border-2 border-slate-200" : "bg-slate-50 border-2 border-slate-300"
              )}
            >
              <div className={cn(
                "p-4 border-b flex justify-between items-center text-white",
                order.order_status === 'pending' ? "bg-orange-600" : "bg-blue-600"
              )}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 block mb-0.5">ROOM / TABLE</span>
                  <h2 className="text-3xl font-black leading-none">{order.room_number === 'local' ? 'POS' : order.room_number}</h2>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tracking-wider">{formatTime(order.created_at)}</div>
                  <div className="text-[10px] uppercase mt-1 px-1.5 py-0.5 border border-white/40 rounded font-bold tracking-widest text-center shadow-sm">
                    {order.order_status}
                  </div>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                <ul className="space-y-4">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-start text-slate-800 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex gap-3">
                        <span className="font-black text-lg bg-slate-100 px-2 py-0.5 rounded">{item.quantity}x</span>
                        <div>
                          <span className="font-bold text-base leading-tight block pt-0.5">{item.name}</span>
                          {item.note && (
                            <div className="flex items-center gap-1 mt-1 text-red-600 bg-red-50 text-xs px-2 py-1 rounded inline-flex">
                              <AlertCircle className="w-3 h-3" />
                              <span className="font-bold">{item.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-100 border-t border-slate-200">
                {order.order_status === 'pending' ? (
                   <button 
                     onClick={() => updateStatus(order.id!, 'preparing')}
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors text-sm uppercase tracking-wider"
                   >
                     Start Preparing
                   </button>
                ) : (
                   <button 
                     onClick={() => updateStatus(order.id!, 'ready')}
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                   >
                     <CheckCircle className="w-4 h-4" />
                     Mark Ready
                   </button>
                )}
              </div>
            </div>
          ))}

          {orders.length === 0 && (
             <div className="w-full flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 border-2 border-slate-300 rounded-full flex items-center justify-center mb-4">
                   <Clock className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">No Active Orders</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
