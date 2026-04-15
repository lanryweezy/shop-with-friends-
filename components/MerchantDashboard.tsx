import React, { useState, useEffect } from 'react';
import { BarChart3, ShieldCheck, Activity, Key, Loader2, AlertCircle } from 'lucide-react';

const MerchantDashboard: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh && apiKey && !error) {
            interval = setInterval(() => {
                fetchStats(true);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, apiKey, error]);

    const fetchStats = async (isBackground = false) => {
        if (!apiKey) return;
        if (!isBackground) setLoading(true);
        setError('');
        try {
            // Use relative URL or env var for production readiness
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${baseUrl}/api/stats/${apiKey}`);
            if (!response.ok) {
                if (response.status === 401) throw new Error('Invalid API Key');
                throw new Error('Failed to fetch statistics');
            }
            const data = await response.json();
            setStats(data);
        } catch (err: any) {
            setError(err.message);
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 max-w-4xl mx-auto my-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="text-purple-400" size={32} />
                        Merchant Dashboard
                    </h2>
                    <p className="text-gray-400 mt-2">Monitor your social commerce performance in real-time.</p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-purple-500 transition-colors outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => fetchStats()}
                            disabled={loading || !apiKey}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
                            Sync
                        </button>
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded border-white/10 bg-black/40"
                            />
                            Auto-refresh (5s)
                        </label>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 mb-8">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 border border-white/5 p-6 rounded-2xl">
                    <div className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Sessions</div>
                    <div className="text-4xl font-bold text-white">{stats?.session_created || 0}</div>
                </div>
                <div className="bg-black/20 border border-white/5 p-6 rounded-2xl">
                    <div className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Active Shoppers</div>
                    <div className="text-4xl font-bold text-white">{stats?.participant_joined || 0}</div>
                </div>
                <div className="bg-black/20 border border-white/5 p-6 rounded-2xl">
                    <div className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Social Events</div>
                    <div className="text-4xl font-bold text-purple-400">{stats?.total_events || 0}</div>
                </div>
            </div>

            {!stats && !loading && !error && (
                <div className="text-center py-20 text-gray-500">
                    <BarChart3 className="mx-auto mb-4 opacity-20" size={64} />
                    <p>Enter your API key to view usage analytics.</p>
                </div>
            )}
        </div>
    );
};

export default MerchantDashboard;
