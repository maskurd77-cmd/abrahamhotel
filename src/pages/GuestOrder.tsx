import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, Product, OrderItem } from '../types';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, CheckCircle, ArrowLeft } from 'lucide-react';

export default function GuestOrder() {
  const [searchParams] = useSearchParams();
  const roomNumber = searchParams.get('room');

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  
  // OTP State
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // Menu State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [viewCart, setViewCart] = useState(false);

  useEffect(() => {
    if (!roomNumber) {
      setLoading(false);
      return;
    }

    const verifyRoom = async () => {
      try {
        const q = query(collection(db, 'rooms'), where('room_number', '==', roomNumber));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const roomDoc = querySnapshot.docs[0];
          const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
          setRoom(roomData);

          // Check if occupied
          if (roomData.status !== 'occupied') {
             toast.error('ژوورەکە بەتاڵە، تکایە پەیوەندی بە ڕێسپشنەوە بکە', { duration: 5000 });
          } else {
             // Check local storage for OTP
             const savedOtp = localStorage.getItem(`otp_${roomNumber}`);
             if (savedOtp && savedOtp === roomData.current_otp) {
               setOtpVerified(true);
             }
          }
        }
      } catch (err) {
        console.error("Error fetching room:", err);
      } finally {
        setLoading(false);
      }
    };

    verifyRoom();
  }, [roomNumber]);

  useEffect(() => {
    if (otpVerified) {
      const q = query(collection(db, 'products'), where('available', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);
      });
      return () => unsubscribe();
    }
  }, [otpVerified]);

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (room && otpInput === room.current_otp) {
      localStorage.setItem(`otp_${roomNumber}`, otpInput);
      setOtpVerified(true);
      toast.success('بە سەرکەوتوویی چوویتە ژوورەوە');
    } else {
      toast.error('کۆدەکە هەڵەیە');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id!, name: product.name, quantity: 1, note: '' }];
    });
    toast.success(`${product.name} زیادکرا`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const submitOrder = async () => {
    if (!room || cart.length === 0) return;
    setIsOrdering(true);
    
    // Calculate total
    const totalPrice = cart.reduce((sum, item) => {
      const p = products.find(prod => prod.id === item.product_id);
      return sum + ((p?.price || 0) * item.quantity);
    }, 0);

    try {
      await addDoc(collection(db, 'orders'), {
        room_id: room.id,
        room_number: room.room_number,
        otp_used: room.current_otp,
        items: cart,
        total_price: totalPrice,
        order_status: 'pending',
        created_at: serverTimestamp()
      });
      
      toast.success('داواکارییەکەت بە سەرکەوتوویی نێردرا');
      setCart([]);
      setViewCart(false);
    } catch (e) {
      console.error(e);
      toast.error('کێشەیەک ڕوویدا لە ناردنی داواکارییەکە');
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="animate-pulse text-lg">Loading...</p></div>;
  }

  if (!roomNumber || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center">
        <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl border border-red-500/20 max-w-sm">
          <p className="text-xl font-medium leading-relaxed">تکایە دووبارە بارکۆدی ناو ژوورەکەت سکان بکەرەوە.</p>
        </div>
      </div>
    );
  }

  if (room.status !== 'occupied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center">
        <div className="bg-orange-500/10 text-orange-400 p-6 rounded-2xl border border-orange-500/20 max-w-sm">
          <p className="text-xl font-medium leading-relaxed">
            {room?.type === 'table' ? 'مێزی' : 'ژووری'} ژمارە {roomNumber} ئاکتیڤ نییە. تکایە سەردانی ڕێسپشن بکە.
          </p>
        </div>
      </div>
    )
  }

  if (!otpVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 p-6">
        <div className="w-full max-w-sm bg-zinc-800 rounded-3xl p-8 border border-zinc-700/50 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2">بەخێربێیت</h1>
            <p className="text-zinc-400">
              {room?.type === 'table' ? 'مێزی' : 'ژووری'} ژمارە {roomNumber}
            </p>
          </div>
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 block text-right">کۆدی ئاسایش (چوار ژمارە)</label>
              <input 
                type="text" 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0,4))}
                placeholder="____"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-center text-3xl tracking-widest text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
              />
            </div>
            <button 
              type="submit"
              disabled={otpInput.length !== 4}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-medium py-4 rounded-xl transition shadow-lg shadow-emerald-500/25"
            >
              چوونەژوورەوە
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getProductPrice = (id: string) => products.find(p => p.id === id)?.price || 0;
  const cartTotal = cart.reduce((sum, item) => sum + (getProductPrice(item.product_id) * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (viewCart) {
    return (
       <div className="min-h-screen bg-zinc-50 pb-24">
         <header className="bg-white px-6 py-4 sticky top-0 z-10 shadow-sm border-b border-zinc-100 flex items-center justify-between">
            <button onClick={() => setViewCart(false)} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 text-zinc-700">
               <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-zinc-900">
              سەبەتەی داواکاری ({room?.type === 'table' ? 'مێزی' : 'ژووری'} {roomNumber})
            </h1>
            <div className="w-10"></div>
         </header>

         <main className="p-6 space-y-6">
           {cart.length === 0 ? (
             <div className="text-center py-12 text-zinc-500">سەبەتەکەت بەتاڵە</div>
           ) : (
             <div className="space-y-4">
               {cart.map((item) => (
                 <div key={item.product_id} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex items-center justify-between">
                   <div>
                     <h3 className="font-medium text-zinc-900">{item.name}</h3>
                     <p className="text-emerald-600 font-medium">{getProductPrice(item.product_id).toLocaleString()} IQD</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <button onClick={() => updateQuantity(item.product_id, -1)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200">
                       <Minus className="w-4 h-4" />
                     </button>
                     <span className="font-medium text-zinc-900 w-4 text-center">{item.quantity}</span>
                     <button onClick={() => updateQuantity(item.product_id, 1)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200">
                       <Plus className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
               
               <div className="bg-zinc-900 text-white rounded-2xl p-5 mt-8 shadow-xl">
                 <div className="flex justify-between items-center mb-6">
                   <span className="text-zinc-400">نەرخی گشتی</span>
                   <span className="text-2xl font-semibold">{cartTotal.toLocaleString()} IQD</span>
                 </div>
                 <button 
                  onClick={submitOrder}
                  disabled={isOrdering}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-medium py-4 rounded-xl transition flex items-center justify-center gap-2"
                 >
                   {isOrdering ? 'دەنێردرێت...' : 'ناردنی داواکاری'}
                   {!isOrdering && <CheckCircle className="w-5 h-5" />}
                 </button>
               </div>
             </div>
           )}
         </main>
       </div>
    );
  }

  // Categories
  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <header className="bg-zinc-900 text-white px-6 py-6 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">شینگلبانە</h1>
            <p className="text-zinc-400 text-sm">
              {room?.type === 'table' ? 'مێزی' : 'ژووری'} ژمارە {roomNumber}
            </p>
          </div>
          <button 
            onClick={() => setViewCart(true)}
            className="relative p-3 bg-zinc-800 rounded-full hover:bg-zinc-700 transition"
          >
            <ShoppingCart className="w-6 h-6 text-zinc-100" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {categories.map(category => (
          <div key={category} className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 capitalize px-2">{category}</h2>
            <div className="grid grid-cols-2 gap-4">
              {products.filter(p => p.category === category).map(product => (
                 <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col justify-between">
                   <div>
                     <h3 className="font-medium text-zinc-900 leading-tight mb-1">{product.name}</h3>
                     <p className="text-emerald-600 font-semibold">{product.price.toLocaleString()} IQD</p>
                   </div>
                   <button 
                     onClick={() => addToCart(product)}
                     className="mt-4 w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-1"
                   >
                     <Plus className="w-4 h-4" />
                     زیادکردن
                   </button>
                 </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
