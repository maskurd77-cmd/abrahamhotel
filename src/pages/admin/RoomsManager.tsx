import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Room } from '../../types';
import toast from 'react-hot-toast';
import { Plus, QrCode, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function RoomsManager() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomNumber, setNewRoomNumber] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rooms'), where('type', '==', 'room'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rm = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      rm.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
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
        type: 'room',
        status: 'empty',
        current_otp: null,
        activated_at: null
      });
      setNewRoomNumber('');
      toast.success('Room added');
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
      toast.success('Activated. Hand OTP to guest.');
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

  const deleteEntry = async (roomId: string) => {
    if (!window.confirm(`Delete this room?`)) return;
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const editEntry = async (e: React.MouseEvent, roomId: string, oldNumber: string) => {
    e.stopPropagation();
    const newNumber = window.prompt("Enter new room number:", oldNumber);
    if (!newNumber || newNumber === oldNumber) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), { room_number: newNumber });
      toast.success('Room updated');
    } catch (err) {
      toast.error('Failed to update room');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Hotel Rooms</h2>
          <p className="text-slate-500 text-sm mt-1">Manage guest rooms and QR scanning access</p>
        </div>
        
        <form onSubmit={handleAddRoom} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Room No. (e.g. 101)" 
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded outline-none focus:border-[#D4AF37] text-sm w-full sm:w-32"
          />
          <button type="submit" className="w-full sm:w-auto bg-[#0F172A] hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {rooms.map(room => (
          <div key={room.id} className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between relative transition-all group",
            room.status === 'occupied' 
              ? "border-2 border-blue-500 shadow-lg" 
              : "border border-slate-200 hover:border-slate-400"
          )}>
            <div className="absolute -top-2 -right-2 flex gap-1 z-20">
              <button
                onClick={(e) => editEntry(e, room.id!, room.room_number)}
                className="bg-white border border-slate-200 text-blue-500 w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => deleteEntry(room.id!)}
                className="bg-white border border-slate-200 text-red-500 w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className={cn(
                  "block text-2xl font-black",
                  room.status === 'occupied' ? "text-slate-800" : "text-slate-400"
                )}>{room.room_number}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Room
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
                room.status === 'occupied' ? "text-blue-600" : "text-slate-400"
              )}>
                {room.status === 'occupied' ? room.current_otp : '----'}
              </p>
            </div>

            <div className="flex gap-2 mt-4 space-x-0 relative z-10">
              {room.status === 'occupied' ? (
                <>
                  <button 
                     onClick={() => navigate(`/pos-shinglbana-manager-2026/pos?tab=${room.id}`)}
                     className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded-lg font-bold transition-colors shadow-sm"
                  >
                     Open POS
                  </button>
                  <button 
                    onClick={() => checkOut(room.id!)}
                    className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 py-2 px-3 rounded-lg transition-colors border border-red-200"
                    title="Clear Table Without Payment"
                  >
                    <Trash2 className="w-4 h-4" />
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
        ))}

        {rooms.length === 0 && (
          <div className="col-span-full text-center py-24 text-slate-400">
            No rooms found. Add a Room above.
          </div>
        )}
      </div>
    </div>
  );
}
