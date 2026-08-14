import { calculateAllTimeStats } from '../../lib/stats'; // Adjust path if necessary
import Link from 'next/link';
import SiteShell from '@/components/SiteShell';

export default function HistoryPage() {
  const rankings = calculateAllTimeStats();

  return (
    <SiteShell activePath="/history">
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🏆 River City FFL Hall of Fame</h1>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Rank</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700">Manager</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-700">Titles 💍</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-700">Avg Finish</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-700">Seasons</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((manager, index) => (
              <tr 
                key={manager.manager} 
                className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}
              >
                <td className="py-3 px-4 font-bold text-gray-600">{index + 1}</td>
                <td className="py-3 px-4 font-medium">{manager.manager}</td>
                <td className="py-3 px-4 text-center">
                  <span className="font-bold text-blue-600">{manager.wins}</span>
                  {manager.titles.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {manager.titles.join(', ')}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center">{manager.avgRank}</td>
                <td className="py-3 px-4 text-center text-gray-500">{manager.seasons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6"><Link href="/" className="font-bold text-orange-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Return to Home</Link></p>
    </main>
    </SiteShell>
  );
}
