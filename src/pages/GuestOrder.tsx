import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, Product, OrderItem } from '../types';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, CheckCircle, ArrowLeft, Languages } from 'lucide-react';
import { cn } from '../lib/utils';

type Language = 'ku' | 'ar' | 'en';

const translations = {
  ku: {
    welcome: 'بەخێربێیت',
    room: 'ژووری',
    table: 'مێزی',
    passcode: 'کۆدی ئاسایش',
    login: 'چوونەژوورەوە',
    all: 'هەموو',
    empty_cart: 'سەبەتەکەت بەتاڵە',
    order_cart: 'سەبەتەی داواکاری',
    total_price: 'نەرخی گشتی',
    submit_order: 'ناردنی داواکاری',
    submitting: 'دەنێردرێت...',
    add: 'داواکردن',
    not_found: 'هیچ بەرهەمێک نەدۆزرایەوە',
    inactive: 'ئاکتیڤ نییە. تکایە سەردانی ڕێسپشن بکە.',
    invalid_code: 'کۆدەکە هەڵەیە',
    success_login: 'بە سەرکەوتوویی چوویتە ژوورەوە',
    order_sent: 'داواکارییەکەت بە سەرکەوتوویی نێردرا',
    order_error: 'کێشەیەک ڕوویدا لە ناردنی داواکارییەکە'
  },
  ar: {
    welcome: 'أهلاً بك',
    room: 'غرفة',
    table: 'طاولة',
    passcode: 'رمز الأمان',
    login: 'تسجيل الدخول',
    all: 'الكل',
    empty_cart: 'سلة الطلبات فارغة',
    order_cart: 'سلة الطلبات',
    total_price: 'السعر الإجمالي',
    submit_order: 'إرسال الطلب',
    submitting: 'جاري الإرسال...',
    add: 'إضافة',
    not_found: 'لم يتم العثور على منتجات',
    inactive: 'غير نشط. يرجى مراجعة الاستقبال.',
    invalid_code: 'الرمز غير صحيح',
    success_login: 'تم تسجيل الدخول بنجاح',
    order_sent: 'تم إرسال الطلب بنجاح',
    order_error: 'حدث خطأ أثناء إرسال الطلب'
  },
  en: {
    welcome: 'Welcome',
    room: 'Room',
    table: 'Table',
    passcode: 'Security Code',
    login: 'Log In',
    all: 'All',
    empty_cart: 'Your cart is empty',
    order_cart: 'Order Cart',
    total_price: 'Total Price',
    submit_order: 'Submit Order',
    submitting: 'Submitting...',
    add: 'Add',
    not_found: 'No products found',
    inactive: 'is inactive. Please visit reception.',
    invalid_code: 'Invalid code',
    success_login: 'Logged in successfully',
    order_sent: 'Order sent successfully',
    order_error: 'Error sending order'
  }
};

export default function GuestOrder() {
  const [searchParams] = useSearchParams();
  const roomNumber = searchParams.get('room');

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  
  // OTP State
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const [lang, setLang] = useState<Language | null>(() => {
    return (localStorage.getItem('preferred_lang') as Language) || null;
  });

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('preferred_lang', l);
  };
  const t = lang ? translations[lang] : translations.ku;
  const isRtl = lang === 'ku' || lang === 'ar';

  // Menu State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [viewCart, setViewCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

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
      setOtpVerified(true);
      toast.success(t.success_login);
    } else {
      toast.error(t.invalid_code);
    }
  };

  const getProductName = (product: Product | undefined) => {
    if (!product) return '';
    if (lang === 'ar' && product.name_ar) return product.name_ar;
    if (lang === 'en' && product.name_en) return product.name_en;
    return product.name;
  };

  const addToCart = (product: Product) => {
    const displayName = getProductName(product);
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id!, name: displayName, quantity: 1, note: '' }];
    });
    toast.success(displayName);
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
        room_type: room.type || 'room',
        otp_used: room.current_otp,
        items: cart,
        total_price: totalPrice,
        order_status: 'pending',
        created_at: serverTimestamp()
      });
      
      toast.success(t.order_sent);
      setCart([]);
      setViewCart(false);
    } catch (e) {
      console.error(e);
      toast.error(t.order_error);
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

  if (!lang) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
           <div className="text-center mb-6">
             <div className="w-16 h-16 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-4">
               <Languages className="w-8 h-8"/>
             </div>
             <h1 className="text-2xl font-black text-slate-900 mb-1">Choose Language</h1>
             <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-4">تکایە زمان هەڵبژێرە / الرجاء اختيار اللغة</p>
           </div>
           
           <button onClick={() => handleSetLang('ku')} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold p-5 rounded-2xl shadow-sm transition-all active:scale-95 flex justify-between items-center group">
              <span className="text-lg">کوردی</span>
              <span className="text-slate-400 group-hover:text-[#D4AF37]">Kurdish</span>
           </button>
           <button onClick={() => handleSetLang('ar')} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold p-5 rounded-2xl shadow-sm transition-all active:scale-95 flex justify-between items-center group">
              <span className="text-lg">العربية</span>
              <span className="text-slate-400 group-hover:text-[#D4AF37]">Arabic</span>
           </button>
           <button onClick={() => handleSetLang('en')} className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold p-5 rounded-2xl shadow-md transition-all active:scale-95 flex justify-between items-center">
              <span className="text-lg">English</span>
           </button>
        </div>
      </div>
    );
  }

  if (room.status !== 'occupied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="bg-white text-slate-800 p-8 rounded-3xl border border-slate-200 max-w-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
          <p className="text-xl font-bold leading-relaxed relative z-10">
            {room?.type === 'table' ? t.table : t.room} {roomNumber} {t.inactive}
          </p>
        </div>
      </div>
    )
  }

  if (!otpVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 selection:bg-[#D4AF37] selection:text-white" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-slate-100 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 blur-3xl rounded-full"></div>
          <div className="text-center mb-8 relative z-10">
            <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t.welcome}</h1>
            <p className="text-slate-500 font-medium">
              {room?.type === 'table' ? t.table : t.room} <span className="font-bold text-slate-800">{roomNumber}</span>
            </p>
          </div>
          <form onSubmit={handleOtpSubmit} className="space-y-8 relative z-10">
            <div className="space-y-3">
              <label className={cn("text-xs font-bold text-slate-400 block tracking-widest", isRtl ? "text-right" : "text-left")}>{t.passcode}</label>
              <input 
                type="text" 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0,4))}
                placeholder="____"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-5 text-center text-3xl font-mono tracking-[1em] text-slate-900 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all shadow-inner hover:border-[#D4AF37]/30"
              />
            </div>
            <button 
              type="submit"
              disabled={otpInput.length !== 4}
              className="w-full bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              {t.login}
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
       <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-[#D4AF37] selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
         <header className="bg-white px-6 py-5 sticky top-0 z-10 shadow-sm border-b border-slate-100 flex items-center justify-between">
            <button onClick={() => setViewCart(false)} className={cn("p-2 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-700 transition", isRtl ? "-mr-2" : "-ml-2")}>
               <ArrowLeft className={cn("w-5 h-5", isRtl && "rotate-180")} />
            </button>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              {t.order_cart} ({room?.type === 'table' ? t.table : t.room} {roomNumber})
            </h1>
            <div className="w-10"></div>
         </header>

         <main className="p-6 space-y-6">
           {cart.length === 0 ? (
             <div className="text-center py-20 text-slate-400">{t.empty_cart}</div>
           ) : (
             <div className="space-y-4">
               {cart.map((item) => {
                 const pImage = products.find(p => p.id === item.product_id)?.image_url;
                 return (
                 <div key={item.product_id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                   {pImage && (
                      <img src={pImage} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0 bg-slate-50" />
                   )}
                   <div className="flex-1">
                     <h3 className="font-bold text-slate-900 mb-1 leading-snug">{item.name}</h3>
                     <p className="text-[#D4AF37] font-mono text-sm font-bold">{getProductPrice(item.product_id).toLocaleString()} IQD</p>
                   </div>
                   <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                     <button onClick={() => updateQuantity(item.product_id, -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900">
                       <Minus className="w-4 h-4" />
                     </button>
                     <span className="font-bold text-slate-900 w-5 text-center">{item.quantity}</span>
                     <button onClick={() => updateQuantity(item.product_id, 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900">
                       <Plus className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               )})}
               
               <div className="bg-[#0F172A] text-white rounded-3xl p-6 mt-8 shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/20 blur-3xl rounded-full"></div>
                 <div className="flex justify-between items-center mb-6 relative z-10">
                   <span className="text-slate-400 font-medium">{t.total_price}</span>
                   <span className="text-3xl font-mono font-bold text-[#D4AF37]" dir="ltr">{cartTotal.toLocaleString()} <span className="text-lg">IQD</span></span>
                 </div>
                 <button 
                  onClick={submitOrder}
                  disabled={isOrdering}
                  className="w-full bg-[#D4AF37] hover:bg-[#C5A028] disabled:opacity-50 text-slate-900 text-lg font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg relative z-10"
                 >
                   {isOrdering ? t.submitting : t.submit_order}
                   {!isOrdering && <CheckCircle className="w-5 h-5" />}
                 </button>
               </div>
             </div>
           )}
         </main>
       </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]];

  const filteredProducts = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-[#D4AF37] selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="bg-white px-6 py-5 sticky top-0 z-20 shadow-sm border-b border-slate-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">شینگلبانە</h1>
            <p className="text-slate-500 text-[10px] md:text-xs font-bold mt-0.5 tracking-wider">
              {room?.type === 'table' ? t.table : t.room} {roomNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
               onClick={() => setLang(null)}
               className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition shadow-sm"
               title="Change Language"
            >
               <Languages className="w-5 h-5 text-slate-600" />
            </button>
            <button 
              onClick={() => setViewCart(true)}
              className="relative p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition shadow-sm"
            >
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#D4AF37] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-md ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Categories Tabs */}
        <div className="flex gap-2 overflow-x-auto pt-5 pb-1 scrollbar-none snap-x" dir={isRtl ? 'rtl' : 'ltr'}>
          {categories.map(cat => (
             <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 snap-center",
                  activeCategory === cat 
                    ? "bg-[#0F172A] text-white shadow-md scale-100" 
                    : "bg-white border text-slate-500 border-slate-200 hover:bg-slate-50 scale-95"
                )}
             >
                {cat === 'All' ? t.all : cat}
             </button>
          ))}
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
             <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
               {product.image_url ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 shadow-inner">
                    <img src={product.image_url} alt={getProductName(product)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
               ) : (
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200"></div>
                  </div>
               )}
               <div className="flex-1 flex flex-col justify-center h-full">
                 <div>
                   <h3 className="font-bold text-slate-900 leading-tight mb-1 text-base">{getProductName(product)}</h3>
                   <div className="text-[#D4AF37] font-mono font-bold text-sm" dir="ltr">
                      {product.price.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans tracking-wide">IQD</span>
                   </div>
                 </div>
                 <div className="mt-2.5 flex justify-end">
                   <button 
                     onClick={() => addToCart(product)}
                     className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95 group-hover:bg-[#0F172A] group-hover:text-white"
                   >
                     <Plus className="w-4 h-4" />
                     {t.add}
                   </button>
                 </div>
               </div>
             </div>
          ))}
        </div>
        {filteredProducts.length === 0 && (
           <div className="text-center py-20 text-slate-400">{t.not_found}</div>
        )}
      </main>
    </div>
  );
}
