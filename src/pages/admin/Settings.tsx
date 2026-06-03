import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Settings as SettingsType } from '../../types';
import toast from 'react-hot-toast';
import { Save, FileText, Printer } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsType>({
    restaurant_name: 'Shinglbana Restaurant',
    phone: '',
    address: '',
    receipt_footer: 'Thank you for your visit!'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SettingsType);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse">Loading settings...</div>;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">System Settings</h2>
          <p className="text-slate-500 text-sm mt-1">Configure restaurant details and receipt design</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Restaurant Name</label>
              <input
                type="text"
                name="restaurant_name"
                value={settings.restaurant_name}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Phone</label>
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
              <textarea
                name="address"
                value={settings.address}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Receipt Footer Message</label>
              <textarea
                name="receipt_footer"
                value={settings.receipt_footer}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition"
                placeholder="Thank you for your visit!"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-md hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        </div>

        {/* Receipt Preview */}
        <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <Printer className="w-4 h-4" /> Live Preview
          </div>
          
          <div className="bg-white w-full max-w-[320px] shadow-lg rounded-sm overflow-hidden p-6 relative border-t-4 border-slate-900 font-mono text-sm mt-8">
            {/* Receipt Content Structure simulating POS printer */}
            <div className="text-center mb-6 space-y-1">
              <h3 className="font-bold text-xl uppercase tracking-wider">{settings.restaurant_name || 'RESTAURANT NAME'}</h3>
              {settings.address && <p className="text-xs text-slate-500 leading-tight">{settings.address}</p>}
              {settings.phone && <p className="text-xs text-slate-500">{settings.phone}</p>}
            </div>

            <div className="border-t border-dashed border-slate-300 py-3 mb-3 text-xs space-y-1">
              <div className="flex justify-between"><span>Date:</span> <span>02/10/2026 14:30</span></div>
              <div className="flex justify-between"><span>Order:</span> <span>#1042</span></div>
              <div className="flex justify-between"><span>Table:</span> <span>T-05</span></div>
            </div>

            <table className="w-full text-xs font-mono mb-4">
              <thead>
                <tr className="border-b border-dashed border-slate-300">
                  <th className="text-left font-normal py-1">Qty Item</th>
                  <th className="text-right font-normal py-1">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-100">
                <tr>
                  <td className="py-2">2x Burger</td>
                  <td className="text-right py-2">15,000 IQD</td>
                </tr>
                <tr>
                  <td className="py-2">1x Chips</td>
                  <td className="text-right py-2">3,000 IQD</td>
                </tr>
                <tr>
                  <td className="py-2">2x Cola</td>
                  <td className="text-right py-2">2,000 IQD</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t-2 border-slate-900 pt-3 mb-6">
              <div className="flex justify-between font-bold text-base">
                <span>TOTAL:</span>
                <span>20,000 IQD</span>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 whitespace-pre-wrap px-4">
              {settings.receipt_footer || 'Thank you!'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
