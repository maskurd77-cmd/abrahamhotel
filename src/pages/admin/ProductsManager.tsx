import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import { Plus, Check, X, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

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
        name_ar: nameAr,
        name_en: nameEn,
        category,
        price: parseFloat(price),
        image_url: imageUrl || null,
        available: true
      });
      setName(''); setNameAr(''); setNameEn(''); setPrice(''); setImageUrl('');
      toast.success('Product Added');
    } catch {
      toast.error('Failed to add product');
    }
  };

  const handleEditSave = async (id: string) => {
    if (!editName || !editCategory || !editPrice) return;
    try {
      await updateDoc(doc(db, 'products', id), {
        name: editName,
        name_ar: editNameAr,
        name_en: editNameEn,
        category: editCategory,
        price: parseFloat(editPrice),
        image_url: editImageUrl || null,
      });
      setEditingId(null);
      toast.success('Product Updated');
    } catch {
      toast.error('Failed to update product');
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id!);
    setEditName(p.name);
    setEditNameAr(p.name_ar || '');
    setEditNameEn(p.name_en || '');
    setEditCategory(p.category);
    setEditPrice(p.price.toString());
    setEditImageUrl(p.image_url || '');
  };

  const toggleAvailable = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'products', id), { available: !current });
  };
  
  const deleteProduct = async (id: string) => {
    if(confirm('Are you sure you want to delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setUrlCallback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 500 * 1024) {
      toast.error('Image size must be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUrlCallback(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="space-y-6 max-w-6xl text-slate-800 flex flex-col h-full">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Menu Management</h2>
            <p className="text-slate-500 text-sm mt-1">Manage food and drinks, images, and pricing</p>
          </div>
       </div>

       <form onSubmit={handleAdd} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name (Kurdish)</label>
                <input required value={name} onChange={(e)=>setName(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:bg-white transition-colors" placeholder="e.g. قاوە" />
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name (Arabic - Optional)</label>
                <input value={nameAr} onChange={(e)=>setNameAr(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:bg-white transition-colors" placeholder="e.g. قهوة" />
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name (English - Optional)</label>
                <input value={nameEn} onChange={(e)=>setNameEn(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:bg-white transition-colors" placeholder="e.g. Coffee" />
             </div>
         </div>
         <div className="flex flex-col md:flex-row md:items-end gap-3 w-full">
           <div className="w-40 shrink-0 space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <input required list="categoryList" value={category} onChange={(e)=>setCategory(e.target.value)} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:bg-white transition-colors" placeholder="e.g. Hot Drinks" />
              <datalist id="categoryList">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
           </div>
           <div className="w-32 shrink-0 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price (IQD)</label>
              <input required value={price} onChange={(e)=>setPrice(e.target.value)} type="number" step="100" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:bg-white transition-colors" placeholder="1000" />
           </div>
           <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Image URL or File</label>
              <div className="flex relative">
                <input value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} type="url" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] focus:bg-white transition-colors pr-10" placeholder="URL or choose below" />
              </div>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setImageUrl)} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-[#0F172A] hover:file:bg-slate-200"/>
           </div>
           <button type="submit" className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold px-6 py-2.5 h-[42px] rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 text-sm w-full md:w-auto mt-4 md:mt-0 mb-[22px]">
             <Plus className="w-4 h-4"/> Add Item
           </button>
         </div>
       </form>

       <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F1F5F9] border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 w-16">Image</th>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {products.map(p => {
                const isEditing = editingId === p.id;
                
                return (
                 <tr key={p.id} className={cn("hover:bg-slate-50 transition-colors", !p.available && !isEditing && "opacity-60")}>
                   <td className="px-6 py-3.5">
                     <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                       {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                       ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                       )}
                     </div>
                   </td>
                   
                   {isEditing ? (
                     <>
                       <td className="px-6 py-3.5 flex flex-col gap-1">
                         <input value={editName} onChange={e=>setEditName(e.target.value)} type="text" placeholder="Kurdish" className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-[#D4AF37]" />
                         <input value={editNameAr} onChange={e=>setEditNameAr(e.target.value)} type="text" placeholder="Arabic" className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-[#D4AF37]" />
                         <input value={editNameEn} onChange={e=>setEditNameEn(e.target.value)} type="text" placeholder="English" className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-[#D4AF37]" />
                       </td>
                       <td className="px-6 py-3.5">
                         <input value={editCategory} onChange={e=>setEditCategory(e.target.value)} type="text" list="categoryListGrid" className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-[#D4AF37]" />
                         <datalist id="categoryListGrid">
                           {categories.map(c => <option key={c} value={c} />)}
                         </datalist>
                       </td>
                       <td className="px-6 py-3.5">
                         <input value={editPrice} onChange={e=>setEditPrice(e.target.value)} type="number" className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-[#D4AF37]" />
                       </td>
                       <td className="px-6 py-3.5">
                         <div className="flex flex-col gap-1">
                           <input value={editImageUrl} onChange={e=>setEditImageUrl(e.target.value)} type="url" placeholder="Image URL" className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-[#D4AF37]" />
                           <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setEditImageUrl)} className="block w-full text-[10px] text-slate-500 file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-[#0F172A] hover:file:bg-slate-200"/>
                         </div>
                       </td>
                       <td className="px-6 py-3.5 flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="p-1 px-3 text-slate-500 hover:bg-slate-200 rounded transition font-medium text-xs">Cancel</button>
                          <button onClick={() => handleEditSave(p.id!)} className="p-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium text-xs shadow-sm">Save</button>
                       </td>
                     </>
                   ) : (
                     <>
                       <td className="px-6 py-3.5">
                         <div className="font-bold text-slate-800">{p.name}</div>
                         {p.name_ar && <div className="text-xs text-slate-500">{p.name_ar}</div>}
                         {p.name_en && <div className="text-xs text-slate-500">{p.name_en}</div>}
                       </td>
                       <td className="px-6 py-3.5 text-slate-500 capitalize">{p.category}</td>
                       <td className="px-6 py-3.5 font-mono font-bold text-[#D4AF37]">{p.price.toLocaleString()} IQD</td>
                       <td className="px-6 py-3.5">
                          <button onClick={() => toggleAvailable(p.id!, p.available)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold transition border uppercase tracking-wider", p.available ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                             {p.available ? <><Check className="w-3 h-3"/> Active</> : <><X className="w-3 h-3"/> Paused</>}
                          </button>
                       </td>
                       <td className="px-6 py-3.5 flex justify-end items-center gap-1">
                          <button onClick={() => startEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition" title="Edit">
                            <Edit2 className="w-4 h-4"/>
                          </button>
                          <button onClick={() => deleteProduct(p.id!)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition" title="Delete">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                       </td>
                     </>
                   )}
                 </tr>
                )}
              )}
              {products.length === 0 && (
                <tr>
                   <td colSpan={6} className="text-center py-12 text-slate-400">No products added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
       </div>
    </div>
  );
}
