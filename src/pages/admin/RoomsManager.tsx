import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Room } from '../../types';
import toast from 'react-hot-toast';
import { Plus, QrCode, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function RoomsManager() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newType, setNewType] = useState<'room' | 'table'>('room');
  const [filterType, setFilterType] = useState<'all' | 'room' | 'table'>('all');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const rm = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      // Sort: First by type, then by number
      rm.sort((a, b) => {
        if ((a.type || 'room') !== (b.type || 'room')) {
          return (a.type || 'room').localeCompare(b.type || 'room');
        }
        return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
      });
      setRooms(rm);
    });
    return () => unsubscribe();
  }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;
    try {
      await addDoc(collection(db, 'rooms'), {
        room_number: newRoomNumber,
        type: newType,
        status: 'empty',
        current_otp: null,
        activated_at: null
      });
      setNewRoomNumber('');
      toast.success(`${newType === 'table' ? 'Table' : 'Room'} added`);
    } catch (err) {
      toast.error('Failed to add entry');
    }
  };

  const checkIn = async (roomId: string) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'occupied',
        current_otp: otp,
        activated_at: serverTimestamp()
      });
      toast.success('Activated. HandOTP to guest.');
    } catch (err) {
      toast.error('Failed to check in');
    }
  };

  const checkOut = async (roomId: string) => {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'empty',
        current_otp: null,
        activated_at: null
      });
      toast.success('Deactivated successfully.');
    } catch (err) {
      toast.error('Failed to check out');
    }
  };

  const deleteEntry = async (roomId: string, type: string) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filteredRooms = rooms.filter(r => filterType === 'all' || (r.type || 'room') === filterType);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Space Management</h2>
          <p className="text-slate-500 text-sm mt-1">Manage Rooms and Restaurant Tables</p>
        </div>
        
        <form onSubmit={handleAddRoom} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'room' | 'table')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-[#D4AF37] text-sm w-full sm:w-auto"
          >
            <option value="room">Room</option>
            <option value="table">Table</option>
          </select>
          <input 
            type="text" 
            placeholder="Identifier (e.g. 101, T-5)" 
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded outline-none focus:border-[#D4AF37] text-sm w-full sm:w-32"
          />
          <button type="submit" className="w-full sm:w-auto bg-[#0F172A] hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['all', 'room', 'table'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              filterType === type ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRooms.map(room => {
          const type = room.type || 'room';
          return (
            <div key={room.id} className={cn(
              "bg-white rounded-xl p-4 flex flex-col justify-between relative transition-all group",
              room.status === 'occupied' 
                ? "border-2 border-[#D4AF37] shadow-lg" 
                : "border border-slate-200 hover:border-slate-400"
            )}>
              <button
                onClick={() => deleteEntry(room.id!, type)}
                className="absolute -top-2 -right-2 bg-white border border-slate-200 text-red-500 w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              <div className="flex justify-between items-start">
                <div>
                  <span className={cn(
                    "block text-2xl font-black",
                    room.status === 'occupied' ? "text-slate-800" : "text-slate-400"
                  )}>{room.room_number}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    {type}
                  </span>
                </div>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                  room.status === 'occupied' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {room.status === 'occupied' ? 'Active' : 'Empty'}
                </span>
              </div>

              <div className={cn("mt-4", room.status !== 'occupied' && "opacity-30")}>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Live OTP Code</p>
                <p className={cn(
                  "text-xl font-mono tracking-widest font-bold",
                  room.status === 'occupied' ? "text-[#D4AF37]" : "text-slate-400"
                )}>
                  {room.status === 'occupied' ? room.current_otp : '----'}
                </p>
              </div>

              <div className="flex gap-2 mt-4 space-x-0 relative z-10">
                {room.status === 'occupied' ? (
                  <>
                    <button 
                      onClick={() => checkOut(room.id!)}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-lg font-bold transition-colors shadow-sm"
                    >
                      Clear
                    </button>
                    <button 
                      title="Print QR Code"
                      className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 py-2 px-3 rounded-lg transition-colors border border-slate-200"
                      onClick={() => {
                          const url = `${window.location.origin}/order?room=${room.room_number}`;
                          alert(`In a real app, this would print a QR for: ${url}`);
                      }}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => checkIn(room.id!)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg font-bold transition-colors shadow-sm"
                    >
                      Activate
                    </button>
                    <button 
                      title="Print QR Code"
                      className="bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 py-2 px-3 rounded-lg transition-colors border border-slate-100"
                      onClick={() => {
                          const url = `${window.location.origin}/order?room=${room.room_number}`;
                          alert(`In a real app, this would print a QR for: ${url}`);
                      }}
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredRooms.length === 0 && (
          <div className="col-span-full text-center py-24 text-slate-400">
            No spaces found. Add a Room or Table above.
          </div>
        )}
      </div>
    </div>
  );
}
