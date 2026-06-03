import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { Product, Order, OrderItem, Settings, Room } from '../../types';
import toast from 'react-hot-toast';
import { Plus, Minus, Printer, CheckCircle, Search, Trash, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function POSDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabId = searchParams.get('tab');

  const [products, setProducts] = useState<Product[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  
  // Tab State
  const [currentTab, setCurrentTab] = useState<Room | null>(null);
  const [tabOrders, setTabOrders] = useState<Order[]>([]);
  
  // Local POS State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [localDestination, setLocalDestination] = useState('');
  
  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');

  // Receipt State
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Settings
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) setSettings(docSnap.data() as Settings);
    };
    fetchSettings();

    // Products
    const unsubProds = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)).filter(p => p.available));
    });

    // Active Live Orders (pending, preparing, ready)
    const qOrders = query(
      collection(db, 'orders'),
      where('order_status', 'in', ['pending', 'preparing', 'ready'])
    );
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      ords.sort((a, b) => {
         const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
         const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
         return timeB - timeA; // desc
      });
      setActiveOrders(ords);
    });

    return () => { unsubProds(); unsubOrders(); };
  }, []);

  // Load Current Tab
  useEffect(() => {
    if (!tabId) {
      setCurrentTab(null);
      setTabOrders([]);
      return;
    }
    const unsubTab = onSnapshot(doc(db, 'rooms', tabId), (docSnap) => {
      if (docSnap.exists()) {
        const room = { id: docSnap.id, ...docSnap.data() } as Room;
        setCurrentTab(room);
      } else {
        setCurrentTab(null);
      }
    });
    return () => unsubTab();
  }, [tabId]);

  // Load Tab Orders
  useEffect(() => {
    if (!currentTab || !currentTab.current_otp) {
      setTabOrders([]);
      return;
    }
    const q = query(
      collection(db, 'orders'),
      where('room_id', '==', currentTab.id),
      where('otp_used', '==', currentTab.current_otp)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Filter out paid orders
      setTabOrders(ords.filter(o => o.payment_status !== 'paid'));
    });
    return () => unsub();
  }, [currentTab]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === p.id);
      if (ex) return prev.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: p.id!, name: p.name, quantity: 1, note: '' }];
    });
  };

  const updateQ = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0));
  };

  const getProductPrice = (id: string) => products.find(p => p.id === id)?.price || 0;
  const cartTotal = cart.reduce((sum, item) => sum + (getProductPrice(item.product_id) * item.quantity), 0);

  const isTabMode = !!currentTab;
  const tabOrdersTotal = tabOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const grandTotal = isTabMode ? tabOrdersTotal + cartTotal : cartTotal;

  const placeLocalOrder = async () => {
    if (cart.length === 0) return;
    try {
      if (isTabMode && currentTab) {
        await addDoc(collection(db, 'orders'), {
          room_id: currentTab.id,
          room_number: currentTab.room_number,
          otp_used: currentTab.current_otp,
          items: cart,
          total_price: cartTotal,
          order_status: 'pending',
          payment_status: 'unpaid',
          created_at: serverTimestamp()
        });
        toast.success(`Sent to KDS for ${currentTab.room_number}`);
      } else {
        await addDoc(collection(db, 'orders'), {
          room_id: 'local',
          room_number: localDestination || 'POS Walk-in',
          otp_used: null,
          items: cart,
          total_price: cartTotal,
          order_status: 'pending',
          payment_status: 'unpaid',
          created_at: serverTimestamp()
        });
        toast.success('Local Order Sent to KDS');
      }
      setCart([]);
      setLocalDestination('');
    } catch {
      toast.error('Failed to place order');
    }
  };

  const processPayment = async (e: any) => {
    e.preventDefault();
    const paidAmount = Number(amountGiven) || 0;
    if (paidAmount < tabOrdersTotal && tabOrdersTotal > 0) {
      toast.error('Amount given is less than total');
      return;
    }

    try {
      // We will perform updates directly
      if (isTabMode && currentTab) {
        // Mark orders as paid and completed
        for (const order of tabOrders) {
           await updateDoc(doc(db, 'orders', order.id!), { 
             payment_status: 'paid',
             order_status: 'completed'
           });
        }
        // Clear Table
        await updateDoc(doc(db, 'rooms', currentTab.id!), {
           status: 'empty',
           current_otp: null,
           activated_at: null
        });

        // Generate unified receipt
        const combinedItems: OrderItem[] = [];
        tabOrders.forEach(o => {
           o.items.forEach(item => {
              const ex = combinedItems.find(i => i.product_id === item.product_id);
              if (ex) ex.quantity += item.quantity;
              else combinedItems.push({...item});
           });
        });

        setReceiptOrder({
          id: `POS-${currentTab.room_number}`,
          room_id: currentTab.id!,
          room_number: currentTab.room_number,
          otp_used: currentTab.current_otp,
          items: combinedItems,
          total_price: tabOrdersTotal,
          order_status: 'completed',
          payment_status: 'paid',
          created_at: new Date()
        });

        setTimeout(() => window.print(), 100);
        
        toast.success('Table Paid and Cleared');
        setPaymentModal(false);
        setAmountGiven('');
        navigate('/pos-shinglbana-manager-2026/rooms'); // Redirect back to rooms
      } else {
        // Walk in instant checkout (no tab history)
        // Just print the receipt of what we would have sent, but wait - Walk-in is usually send order, then later they pay.
        // POS Walk-in doesn't have "tabOrders". If user clicks pay on walk-in cart, maybe we just send order and mark paid?
        // But the prompt specifically asked for table POS. We'll disable it for empty walk-in.
      }
    } catch (err) {
      toast.error('Payment failed');
      console.error(err);
    }
  };

  const closeOrder = async (order: Order) => {
     try {
       await updateDoc(doc(db, 'orders', order.id!), { order_status: 'completed' });
       toast.success(`Order ${order.id?.slice(-4)} closed.`);
     } catch {
       toast.error('Failed to close order');
     }
  };

  const printReceipt = (order: Order) => {
     setReceiptOrder(order);
     setTimeout(() => {
        window.print();
        setReceiptOrder(null);
     }, 100);
  };

  const filteredProds = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Helper for humanizing times
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} mins ago`;
  };

  return (
    <div className="flex h-full gap-6 text-slate-800">
      {/* Left: POS Item Selection */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-slate-900">Point of Sale</h2>
           <div className="relative w-full max-w-xs">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input value={search} onChange={e=>setSearch(e.target.value)} type="text" placeholder="Search menu..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-[#D4AF37] transition-colors" />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max content-start pr-2">
           {filteredProds.map(p => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-[#D4AF37] text-left transition-colors shadow-sm flex flex-col justify-between h-28 active:scale-[0.98]"
              >
                 <span className="font-bold text-sm text-slate-800 leading-tight block">{p.name}</span>
                 <span className="text-[#D4AF37] font-mono font-bold block mt-auto">{p.price.toLocaleString()} IQD</span>
              </button>
           ))}
           {filteredProds.length === 0 && <div className="col-span-full py-8 text-center text-slate-400 text-sm">No products found.</div>}
        </div>
      </div>

      {/* Center: Cart & Tab */}
      <div className="w-[300px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 leading-none">
                   {isTabMode ? `Tab: ${currentTab?.room_number}` : 'Walk-in Order'}
                </h3>
                {isTabMode && (
                   <button onClick={() => navigate('/pos-shinglbana-manager-2026/pos')} className="w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded flex items-center justify-center transition-colors">
                     <X className="w-3 h-3 text-slate-600"/>
                   </button>
                )}
             </div>
             {!isTabMode && (
                <input value={localDestination} onChange={e=>setLocalDestination(e.target.value)} type="text" placeholder="Table No. or Walk-in Name" className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs outline-none focus:border-[#D4AF37]" />
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {/* Existing Tab Orders */}
             {isTabMode && tabOrders.length > 0 && (
                <div className="mb-4">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Unpaid Tab Items</div>
                   <div className="space-y-2">
                     {tabOrders.map(o => (
                       <div key={o.id} className="opacity-75">
                         {o.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between items-start text-sm">
                             <div>
                               <span className="font-semibold text-slate-700">{item.quantity}x</span> <span className="text-slate-600">{item.name}</span>
                             </div>
                             <div className="font-mono text-slate-500 text-xs">
                               {(getProductPrice(item.product_id) * item.quantity).toLocaleString()}
                             </div>
                           </div>
                         ))}
                       </div>
                     ))}
                   </div>
                </div>
             )}

             {/* Current Cart */}
             {(cart.length > 0) && (
               <div>
                 <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">New Items (Not Sent)</div>
                 <div className="space-y-4">
                   {cart.map(item => (
                      <div key={item.product_id} className="flex justify-between items-start group">
                         <div className="flex-1 pr-2">
                            <div className="font-bold text-sm text-slate-800 leading-snug">{item.name}</div>
                            <div className="text-xs text-[#D4AF37] font-mono font-bold mt-0.5">{getProductPrice(item.product_id).toLocaleString()} IQD</div>
                         </div>
                         <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-md shrink-0">
                            <button onClick={()=>updateQ(item.product_id, -1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 text-slate-500 transition-colors"><Minus className="w-3 h-3"/></button>
                            <span className="w-4 text-center font-bold text-xs">{item.quantity}</span>
                            <button onClick={()=>updateQ(item.product_id, 1)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 text-slate-500 transition-colors"><Plus className="w-3 h-3"/></button>
                         </div>
                      </div>
                   ))}
                 </div>
               </div>
             )}

             {(!isTabMode && cart.length === 0) && <div className="text-center text-slate-400 py-12 text-sm italic">Cart is empty</div>}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
             <div className="flex justify-between items-end border-b border-slate-200 pb-3 mb-1 text-sm">
               <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">Total</span>
               <span className="text-[#D4AF37] font-mono font-bold text-xl leading-none">{grandTotal.toLocaleString()} IQD</span>
             </div>
             
             {cart.length > 0 && (
               <button onClick={placeLocalOrder} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg shadow-sm transition active:scale-[0.98]">
                 Send to Kitchen
               </button>
             )}
             
             {isTabMode && tabOrders.length > 0 && (
               <button 
                 onClick={() => setPaymentModal(true)} 
                 className="w-full bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-lg shadow-sm transition active:scale-[0.98]"
               >
                 Checkout & Pay Tab
               </button>
             )}
             {(!isTabMode && cart.length > 0) && (
               // Simple walk-in just sends to kitchen for now. In a full system, might have 'Quick Pay' here.
               <div className="text-center text-[10px] text-slate-400 font-medium">Order must be sent before payment.</div>
             )}
          </div>
      </div>

      {/* Right: Live Room Orders (for printing/managing) */}
      <div className="w-[340px] bg-slate-900 rounded-xl flex flex-col text-white shrink-0 shadow-lg">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
             <h3 className="font-bold">Live Orders (KDS View)</h3>
             <div className="flex items-center gap-2">
               <span className="text-xs text-slate-400 font-medium">{activeOrders.length}</span>
               <span className="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {activeOrders.map(order => (
               <div key={order.id} className={cn(
                 "bg-slate-800 rounded-lg p-3 border-l-4",
                 order.order_status === 'pending' ? 'border-orange-500' :
                 order.order_status === 'preparing' ? 'border-blue-500' : 'border-emerald-500'
               )}>
                  <div className="flex justify-between items-start mb-2">
                     <span className={cn(
                       "text-[10px] font-bold text-white px-2 py-0.5 rounded uppercase tracking-wider",
                       order.order_status === 'pending' ? 'bg-orange-500' :
                       order.order_status === 'preparing' ? 'bg-blue-500' : 'bg-emerald-500'
                     )}>
                       {order.order_status}
                     </span>
                     <span className="text-[10px] text-slate-400">
                       {order.room_number === 'local' ? 'POS' : `Room ${order.room_number}`} • {formatTimeAgo(order.created_at)}
                     </span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {order.items.map((i, idx) => (
                      <p key={idx} className="text-sm font-semibold text-slate-200">{i.quantity}x {i.name}</p>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
                     <button onClick={() => printReceipt(order)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-1.5 rounded flex items-center justify-center gap-2 transition text-xs">
                       <Printer className="w-3 h-3"/> Print Label
                     </button>
                     <button onClick={() => closeOrder(order)} className="bg-slate-700 hover:bg-slate-600 px-3 flex items-center justify-center rounded transition text-emerald-400 hover:text-emerald-300" title="Mark Closed">
                       <CheckCircle className="w-4 h-4"/>
                     </button>
                  </div>
               </div>
             ))}
             {activeOrders.length === 0 && <div className="text-center text-slate-500 py-12 text-sm">No active room orders waiting.</div>}
          </div>
      </div>

       {/* Hidden Print Receipt Template */}
       {receiptOrder && (
         <div id="thermal-receipt" className="text-black bg-white hidden print:block absolute top-0 left-0 w-[80mm] p-4 text-xs font-mono">
           <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{settings?.restaurant_name || 'RESTAURANT'}</h2>
              {settings?.address && <p style={{ margin: 0, fontSize: '12px' }}>{settings.address}</p>}
              {settings?.phone && <p style={{ margin: 0, fontSize: '12px' }}>{settings.phone}</p>}
              <p style={{ margin: 0, fontSize: '12px', marginTop: '4px' }}>Order: #{receiptOrder.id?.slice(-4)}</p>
              <div style={{ padding: '4px', borderBottom: '1px dashed #000', borderTop: '1px dashed #000', margin: '10px 0', fontSize: '16px', fontWeight: 'bold' }}>
                 ROOM / TABLE: {receiptOrder.room_number || 'LOCAL'}
              </div>
           </div>
           
           <table style={{ width: '100%', fontSize: '12px', marginBottom: '10px' }}>
             <tbody>
               {receiptOrder.items.map((item, idx) => {
                 const price = getProductPrice(item.product_id);
                 return (
                   <tr key={idx}>
                     <td style={{ verticalAlign: 'top', width: '25px', paddingBottom: '4px' }}>{item.quantity}x</td>
                     <td style={{ verticalAlign: 'top', paddingBottom: '4px' }}>{item.name}</td>
                     <td style={{ textAlign: 'right', verticalAlign: 'top', paddingBottom: '4px' }}>{(item.quantity * price).toLocaleString()} IQD</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
           
           <div style={{ borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }}>
              TOTAL: {receiptOrder.total_price.toLocaleString()} IQD
           </div>
           
           <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px' }}>
              {settings?.receipt_footer || 'Thank you!'}<br />
              {new Date().toLocaleString()}
           </div>
         </div>
       )}

       {/* Payment Modal */}
       {paymentModal && isTabMode && currentTab && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800">Checkout</h2>
                    <p className="text-sm text-slate-500">Table {currentTab.room_number}</p>
                 </div>
                 <button onClick={() => setPaymentModal(false)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-500">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="p-6 space-y-6">
                 {cart.length > 0 && (
                   <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-lg text-sm font-medium">
                     Warning: You have unsent items in the cart. Please send them to the kitchen or clear them before checkout.
                   </div>
                 )}

                 <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Total Amount:</span>
                    </div>
                    <div className="text-3xl font-mono font-bold text-[#D4AF37]">
                      {tabOrdersTotal.toLocaleString()} IQD
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Cash Received (IQD)</label>
                    <input 
                      type="number" 
                      value={amountGiven} 
                      onChange={e => setAmountGiven(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-lg font-mono outline-none focus:border-[#D4AF37]"
                      placeholder="0" 
                    />
                 </div>

                 {(Number(amountGiven) > 0) && (
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-center">
                      <div className="text-sm text-slate-500 font-medium">Change Required</div>
                      <div className="font-mono text-2xl font-bold text-slate-800">
                        {Math.max(0, Number(amountGiven) - tabOrdersTotal).toLocaleString()} IQD
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                 <button onClick={() => setPaymentModal(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 transition">Cancel</button>
                 <button 
                   onClick={processPayment} 
                   disabled={cart.length > 0 || (amountGiven.trim() !== '' && Number(amountGiven) < tabOrdersTotal)}
                   className="flex-1 bg-[#0F172A] disabled:opacity-50 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-sm"
                 >
                   Confirm & Print
                 </button>
              </div>
           </div>
         </div>
       )}
    </div>
  );
}
