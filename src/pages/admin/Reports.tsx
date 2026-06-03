import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let startDate = new Date();
        if (filter === 'today') {
          startDate = startOfDay(new Date());
        } else if (filter === 'week') {
          startDate = startOfDay(subDays(new Date(), 7));
        } else if (filter === 'month') {
          startDate = startOfDay(subDays(new Date(), 30));
        }
        
        const q = query(
          collection(db, 'orders'),
          where('created_at', '>=', Timestamp.fromDate(startDate))
        );
        const snapshot = await getDocs(q);
        const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        
        // Ensure we only include completed/delivered orders in reports? Or all? Let's do 'delivered' to be safe, or just all non-cancelled.
        // POS currently has 'completed' when done.
        const validOrders = fetchedOrders.filter(o => o.order_status === 'completed');
        
        setOrders(validOrders);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [filter]);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalOrders = orders.length;

  // Items sold stats
  const itemCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      itemCounts[item.product_id] = (itemCounts[item.product_id] || 0) + item.quantity;
    });
  });

  const popularItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, quantity]) => ({ name: id, quantity })); // In a real app we'd map ID to name

  // Daily revenue chart data
  const revenueByDate: Record<string, number> = {};
  orders.forEach(o => {
    if (!o.created_at) return;
    const dateStr = format(o.created_at.toDate(), 'MMM dd');
    revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + o.total_price;
  });

  const chartData = Object.entries(revenueByDate).map(([date, revenue]) => ({
    date,
    revenue
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Simple sort

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Financial Reports</h2>
          <p className="text-slate-500 text-sm mt-1">Analyze restaurant performance and sales data</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {(['today', 'week', 'month'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                filter === f ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse text-center py-20">Loading reports...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
                <h3 className="text-2xl font-bold text-slate-800">{totalRevenue.toLocaleString()} IQD</h3>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Completed Orders</p>
                <h3 className="text-2xl font-bold text-slate-800">{totalOrders}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Avg. Order Value</p>
                <h3 className="text-2xl font-bold text-slate-800">
                  {totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0} IQD
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="col-span-1 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Trend</h3>
              <div className="h-[300px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} tickFormatter={(value) => `${value / 1000}k`} />
                      <Tooltip 
                        cursor={{fill: '#F1F5F9'}} 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        formatter={(value: number) => [`${value.toLocaleString()} IQD`, 'Revenue']}
                      />
                      <Bar dataKey="revenue" fill="#0F172A" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No data for selected period
                  </div>
                )}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Popular Items By ID</h3>
              <div className="space-y-4">
                {popularItems.length > 0 ? popularItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        #{i + 1}
                      </div>
                      <span className="font-medium text-sm text-slate-700 truncate w-24" title={item.name}>{item.name.substring(0,8)}...</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{item.quantity} sold</span>
                  </div>
                )) : (
                  <div className="text-slate-400 text-center py-8 text-sm">No items sold yet</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
