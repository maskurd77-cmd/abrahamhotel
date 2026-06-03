import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import { Plus, Check, X, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      prods.sort((a,b) => a.category.localeCompare(b.category));
      setProducts(prods);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || !price) return;
    try {
      await addDoc(collection(db, 'products'), {
        name,
        category,
        price: parseFloat(price),
        available: true
      });
      setName(''); setPrice('');
      toast.success('Product Added');
    } catch {
      toast.error('Failed to add product');
    }
  };

  const toggleAvailable = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'products', id), { available: !current });
  };
  
  const deleteProduct = async (id: string) => {
    if(confirm('Are you sure you want to delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl text-slate-800">
       <div className="flex justify-between items-end">
          <h2 className="text-xl font-bold text-slate-900">Menu Management</h2>
       </div>

       <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-end gap-4 overflow-hidden">
         <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Name</label>
            <input required value={name} onChange={(e)=>setName(e.target.value)} type="text" className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#D4AF37]" placeholder="e.g. Espresso" />
         </div>
         <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <input required value={category} onChange={(e)=>setCategory(e.target.value)} type="text" className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#D4AF37]" placeholder="e.g. Hot Drinks" />
         </div>
         <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price (IQD)</label>
            <input required value={price} onChange={(e)=>setPrice(e.target.value)} type="number" step="100" className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#D4AF37]" placeholder="1000" />
         </div>
         <button type="submit" className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold px-5 py-2 h-[38px] rounded-md transition-colors flex items-center gap-2 text-sm">
           <Plus className="w-4 h-4"/> Add Item
         </button>
       </form>

       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F1F5F9] border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              <tr>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map(p => (
                <tr key={p.id} className={cn("hover:bg-slate-50 transition-colors", !p.available && "opacity-60")}>
                  <td className="px-6 py-3.5 font-bold text-slate-800">{p.name}</td>
                  <td className="px-6 py-3.5 text-slate-500 capitalize">{p.category}</td>
                  <td className="px-6 py-3.5 font-mono font-bold text-[#D4AF37]">{p.price.toLocaleString()} IQD</td>
                  <td className="px-6 py-3.5">
                     <button onClick={() => toggleAvailable(p.id!, p.available)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold transition border uppercase tracking-wider", p.available ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                        {p.available ? <><Check className="w-3 h-3"/> Active</> : <><X className="w-3 h-3"/> Paused</>}
                     </button>
                  </td>
                  <td className="px-6 py-3.5 flex justify-end">
                     <button onClick={() => deleteProduct(p.id!)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition">
                       <Trash2 className="w-4 h-4"/>
                     </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                   <td colSpan={5} className="text-center py-12 text-slate-400">No products added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
       </div>
    </div>
  );
}
