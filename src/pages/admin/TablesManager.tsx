import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Room } from '../../types';
import toast from 'react-hot-toast';
import { Plus, Trash2, Coffee, Edit2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function TablesManager() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<Room[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('type', '==', 'table'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tb = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      tb.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
      setTables(tb);
    });
    return () => unsubscribe();
  }, []);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    try {
      await addDoc(collection(db, 'rooms'), {
        room_number: newTableNumber,
        type: 'table',
        status: 'empty',
        current_otp: null,
        activated_at: null
      });
      setNewTableNumber('');
      toast.success('Table added');
    } catch (err) {
      toast.error('Failed to add entry');
    }
  };

  const deleteEntry = async (tableId: string) => {
    if (!window.confirm(`Delete this table?`)) return;
    try {
      await deleteDoc(doc(db, 'rooms', tableId));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const editEntry = async (e: React.MouseEvent, tableId: string, oldNumber: string) => {
    e.stopPropagation();
    const newNumber = window.prompt("Enter new table name/number:", oldNumber);
    if (!newNumber || newNumber === oldNumber) return;
    try {
      await updateDoc(doc(db, 'rooms', tableId), { room_number: newNumber });
      toast.success('Table updated');
    } catch (err) {
      toast.error('Failed to update table');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Restaurant Tables</h2>
          <p className="text-slate-500 text-sm mt-1">Manage dining tables and start POS tabs quickly</p>
        </div>
        
        <form onSubmit={handleAddTable} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Table ID (e.g. T-1)" 
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded outline-none focus:border-[#D4AF37] text-sm w-full sm:w-32"
          />
          <button type="submit" className="w-full sm:w-auto bg-[#0F172A] hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Table
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map(table => (
          <div key={table.id} 
            onClick={() => navigate(`/pos-shinglbana-manager-2026/pos?tab=${table.id}`)}
            className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between relative transition-all group cursor-pointer",
            table.status === 'occupied' 
              ? "border-2 border-[#D4AF37] shadow-lg bg-orange-50/50" 
              : "border border-slate-200 hover:border-slate-400"
          )}>
            <div className="absolute -top-2 -right-2 flex gap-1 z-20">
              <button
                onClick={(e) => editEntry(e, table.id!, table.room_number)}
                className="bg-white border border-slate-200 text-blue-500 w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEntry(table.id!);
                }}
                className="bg-white border border-slate-200 text-red-500 w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={cn(
                  "block text-2xl font-black",
                  table.status === 'occupied' ? "text-slate-800" : "text-slate-400"
                )}>{table.room_number}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Table
                </span>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                table.status === 'occupied' ? "bg-[#D4AF37] text-white" : "bg-slate-100 text-slate-400"
              )}>
                <Coffee className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className={cn(
                "text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider",
                table.status === 'occupied' ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
              )}>
                {table.status === 'occupied' ? 'Occupied Tab' : 'Empty'}
              </span>
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                Open POS →
              </span>
            </div>
          </div>
        ))}

        {tables.length === 0 && (
          <div className="col-span-full text-center py-24 text-slate-400">
            No tables found. Add a Table above.
          </div>
        )}
      </div>
    </div>
  );
}
