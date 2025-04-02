import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Record } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

// Arabic font configuration for charts
ChartJS.defaults.font.family = 'Tajawal, Arial, sans-serif';
ChartJS.defaults.color = '#4B5563';

// Interface for component props
interface ExpenseChartsProps {
  records: Record[];
  yearlyStats?: { [key: string]: { total: number, count: number } };
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({ records }) => {
  // Process data for category comparison between 1445 and 1446
  const categoryComparisonData = React.useMemo(() => {
    // Create category maps for each year
    const categories1445: { [key: string]: number } = {};
    const categories1446: { [key: string]: number } = {};
    
    // Process all records
    records.forEach(record => {
      const category = record.fields["Arabic Category"] || 'غير مصنف';
      const year = record.fields.EidYear;
      
      if (year === '1445') {
        if (!categories1445[category]) {
          categories1445[category] = 0;
        }
        categories1445[category] += record.fields.Cost || 0;
      } else if (year === '1446') {
        if (!categories1446[category]) {
          categories1446[category] = 0;
        }
        categories1446[category] += record.fields.Cost || 0;
      }
    });
    
    // Get all unique categories from both years
    const allCategories = new Set<string>([
      ...Object.keys(categories1445),
      ...Object.keys(categories1446)
    ]);
    
    // Sort categories by 1446 values (or 1445 if 1446 doesn't exist)
    const sortedCategories = Array.from(allCategories)
      .sort((a, b) => {
        const valueA = categories1446[a] || categories1445[a] || 0;
        const valueB = categories1446[b] || categories1445[b] || 0;
        return valueB - valueA; // Sort descending
      })
      // Limit to top 6 categories to give more space between bars
      .slice(0, 6);
    
    return {
      labels: sortedCategories,
      datasets: [
        {
          label: 'عام ١٤٤٦',
          data: sortedCategories.map(category => categories1446[category] || 0),
          backgroundColor: '#4F46E5', // Indigo-600 (primary app color)
          borderRadius: 6,
          barPercentage: 0.6, // Reduce bar width
          categoryPercentage: 0.65, // Reduce width within category
          borderWidth: 0,
        },
        {
          label: 'عام ١٤٤٥',
          data: sortedCategories.map(category => categories1445[category] || 0),
          backgroundColor: '#C7D2FE', // Indigo-200 (lighter shade)
          borderRadius: 6,
          barPercentage: 0.6, // Reduce bar width
          categoryPercentage: 0.65, // Reduce width within category
          borderWidth: 0,
        }
      ]
    };
  }, [records]);

  // Process data for payment status visualization for 1446
  const paymentStatusData = React.useMemo(() => {
    // Create category maps for paid vs unpaid
    const categoriesPaid: { [key: string]: number } = {};
    const categoriesUnpaid: { [key: string]: number } = {};
    
    // Process only 1446 records
    const records1446 = records.filter(record => record.fields.EidYear === '1446');
    
    records1446.forEach(record => {
      const category = record.fields["Arabic Category"] || 'غير مصنف';
      const isPaid = record.fields.Paid === true;
      const cost = record.fields.Cost || 0;
      
      if (isPaid) {
        if (!categoriesPaid[category]) {
          categoriesPaid[category] = 0;
        }
        categoriesPaid[category] += cost;
      } else {
        if (!categoriesUnpaid[category]) {
          categoriesUnpaid[category] = 0;
        }
        categoriesUnpaid[category] += cost;
      }
    });
    
    // Get all categories for 1446
    const allCategories = new Set<string>([
      ...Object.keys(categoriesPaid),
      ...Object.keys(categoriesUnpaid)
    ]);
    
    // Sort categories by total value (paid + unpaid)
    const sortedCategories = Array.from(allCategories)
      .sort((a, b) => {
        const totalA = (categoriesPaid[a] || 0) + (categoriesUnpaid[a] || 0);
        const totalB = (categoriesPaid[b] || 0) + (categoriesUnpaid[b] || 0);
        return totalB - totalA; // Sort descending
      })
      // Limit to top 6 categories
      .slice(0, 6);
    
    return {
      labels: sortedCategories,
      datasets: [
        {
          label: 'مدفوع',
          data: sortedCategories.map(category => categoriesPaid[category] || 0),
          backgroundColor: '#10B981', // Green-500
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
          borderWidth: 0,
        },
        {
          label: 'غير مدفوع',
          data: sortedCategories.map(category => categoriesUnpaid[category] || 0),
          backgroundColor: '#FBBF24', // Amber-400
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
          borderWidth: 0,
        }
      ]
    };
  }, [records]);

  // Options for vertical bar chart (category comparison)
  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 35, // More padding for labels
        left: 10,
        right: 20,
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end', // Align to the right for RTL
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${value.toLocaleString('ar-SA')} ﷼`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45,
          padding: 10,
          autoSkip: false,
          callback: function(value: string | number): string | string[] {
            if (typeof value === 'number') {
              const categories = categoryComparisonData.labels;
              if (categories && categories[value]) {
                const label = categories[value] as string;
                if (label && label.length > 20) {
                  return label.substring(0, 18) + '...';
                }
                return label;
              }
            }
            return String(value);
          }
        }
      },
      y: {
        beginAtZero: true,
        border: {
          display: false
        },
        grid: {
          color: '#EDF2F7'
        },
        ticks: {
          padding: 10,
          font: {
            size: 12
          },
          callback: function(value: number | string) {
            if (typeof value === 'number') {
              return value.toLocaleString('ar-SA');
            }
            return value;
          }
        }
      }
    }
  };

  // Options for horizontal bar chart (payment status)
  const paymentBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal bars are better for RTL
    layout: {
      padding: {
        bottom: 15,
        left: 10,
        right: 20
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end', // Align to the right for RTL
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            return `${label}: ${value.toLocaleString('ar-SA')} ﷼`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        border: {
          display: false
        },
        grid: {
          color: '#EDF2F7'
        },
        ticks: {
          padding: 10,
          font: {
            size: 12
          },
          callback: function(value: number | string) {
            if (typeof value === 'number') {
              return value.toLocaleString('ar-SA');
            }
            return value;
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          padding: 10,
          autoSkip: false,
          callback: function(value: string | number): string | string[] {
            if (typeof value === 'number') {
              const categories = paymentStatusData.labels;
              if (categories && categories[value]) {
                const label = categories[value] as string;
                if (label && label.length > 20) {
                  return label.substring(0, 18) + '...';
                }
                return label;
              }
            }
            return String(value);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment status summary for 1446 */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">ملخص حالة الدفع (١٤٤٦)</h3>
        
        {/* Calculate payment totals for summary */}
        {(() => {
          // Get 1446 records
          const records1446 = records.filter(record => record.fields.EidYear === '1446');
          
          // Calculate totals
          const totalPlanned = records1446.reduce((sum, record) => sum + (record.fields.Cost || 0), 0);
          const totalPaid = records1446
            .filter(record => record.fields.Paid === true)
            .reduce((sum, record) => sum + (record.fields.Cost || 0), 0);
          const totalUnpaid = totalPlanned - totalPaid;
          
          // Calculate percentages
          const paidPercentage = totalPlanned > 0 ? (totalPaid / totalPlanned) * 100 : 0;
          const unpaidPercentage = totalPlanned > 0 ? (totalUnpaid / totalPlanned) * 100 : 0;
          
          return (
            <>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 h-2.5 rounded-full mb-4 overflow-hidden" dir="rtl">
                <div 
                  className="bg-green-500 h-2.5 rounded-r-full" 
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
              
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">إجمالي المصروفات</div>
                  <div className="text-lg font-semibold text-gray-900">{totalPlanned.toLocaleString('ar-SA')} ﷼</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-700 mb-1">تم دفعه ({Math.round(paidPercentage)}%)</div>
                  <div className="text-lg font-semibold text-green-700">{totalPaid.toLocaleString('ar-SA')} ﷼</div>
                </div>
                
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-amber-700 mb-1">متبقي ({Math.round(unpaidPercentage)}%)</div>
                  <div className="text-lg font-semibold text-amber-700">{totalUnpaid.toLocaleString('ar-SA')} ﷼</div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
      
      {/* Category comparison chart */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">مقارنة المصروفات حسب الفئة</h3>
        </div>
        {/* Chart container with scroll capability */}
        <div className="min-w-[280px] sm:min-w-[400px] md:min-w-full" style={{ height: '400px', width: '100%', overflow: 'auto' }}>
          <div style={{ minWidth: '280px', height: '100%', width: '100%' }}>
            <Bar data={categoryComparisonData} options={barOptions} />
          </div>
        </div>
      </div>
      
      {/* Payment status chart for 1446 */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">حالة الدفع للمصروفات (١٤٤٦)</h3>
        </div>
        {/* Chart container with scroll capability */}
        <div className="min-w-[280px] sm:min-w-[400px] md:min-w-full" style={{ height: '400px', width: '100%', overflow: 'auto' }}>
          <div style={{ minWidth: '280px', height: '100%', width: '100%' }}>
            <Bar data={paymentStatusData} options={paymentBarOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCharts; 