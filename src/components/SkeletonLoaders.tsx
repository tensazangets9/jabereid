import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { SaudiRiyalSymbol } from './SaudiRiyalSymbol';

// Skeleton for yearly totals card
export const YearlySummarySkeleton: React.FC = () => {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-md p-4">
      <div className="mb-3 h-6 w-36">
        <Skeleton width={150} height={24} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array(2).fill(0).map((_, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div className="mb-1">
              <Skeleton width={80} />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-1 flex items-center justify-end">
              <Skeleton width={100} />
              <span className="mx-1"><SaudiRiyalSymbol size={16} className="text-gray-300" /></span>
            </div>
            <div>
              <Skeleton width={60} />
            </div>
            {index === 0 && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <Skeleton width={120} />
                  <Skeleton width={40} />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full bg-gray-300" style={{ width: '60%' }}></div>
                </div>
                <div className="mt-1 text-right">
                  <Skeleton width={80} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton for a record item
export const RecordItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="mb-1 h-6 w-36">
              <Skeleton width={120} height={20} />
            </div>
            <div>
              <Skeleton width={80} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm mb-3">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton width={100} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2"><Skeleton width={30} /></th>
              <th className="px-3 py-2"><Skeleton width={30} /></th>
              <th className="px-3 py-2"><Skeleton width={50} /></th>
              <th className="px-3 py-2"><Skeleton width={40} /></th>
              <th className="px-3 py-2"><Skeleton width={30} /></th>
              <th className="px-3 py-2"><Skeleton width={40} /></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array(2).fill(0).map((_, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-center"><Skeleton width={30} /></td>
                <td className="px-3 py-2 text-center"><Skeleton width={30} /></td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center">
                    <Skeleton width={50} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center">
                    <Skeleton width={40} />
                  </div>
                </td>
                <td className="px-3 py-2 text-center"><Skeleton width={20} circle /></td>
                <td className="px-3 py-2 flex space-x-1 rtl:space-x-reverse justify-center">
                  <Skeleton width={20} height={20} />
                  <Skeleton width={20} height={20} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Skeleton for the records list
export const RecordsListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {Array(3).fill(0).map((_, index) => (
        <RecordItemSkeleton key={index} />
      ))}
    </div>
  );
};

// Skeleton for the filter controls
export const FilterControlsSkeleton: React.FC = () => {
  return (
    <div className="mb-4 space-y-3">
      <div className="relative">
        <div className="relative">
          <Skeleton height={38} />
        </div>
      </div>
      
      <div>
        <div className="relative">
          <div className="overflow-x-auto">
            <div className="flex space-x-2 rtl:space-x-reverse py-1 px-0.5">
              {Array(5).fill(0).map((_, index) => (
                <Skeleton key={index} width={80} height={36} style={{ marginLeft: '8px' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 