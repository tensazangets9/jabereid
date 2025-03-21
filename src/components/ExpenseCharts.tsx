import React from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
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

  // Options for bar chart
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 25, // Add padding at the bottom for labels
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
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
            size: 12
          },
          // Make labels horizontal instead of diagonal
          maxRotation: 0,
          minRotation: 0,
          // Add more space between labels
          padding: 10,
          // Allow wrapping of long labels
          autoSkip: false,
          autoSkipPadding: 15,
          // Enable label wrapping if needed
          callback: function(value: string | number): string | string[] {
            // ChartJS context is available through 'this', but we'll use direct value approach
            // to avoid TypeScript issues with 'this' context
            if (typeof value === 'number') {
              const categories = categoryComparisonData.labels;
              if (categories && categories[value]) {
                const label = categories[value] as string;
                // If label is too long, try to split it at a space
                if (label && label.length > 15) {
                  const words = label.split(' ');
                  if (words.length > 1) {
                    return [words[0], words.slice(1).join(' ')];
                  }
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
            size: 14
          },
          callback: function(value: number | string) {
            if (typeof value === 'number') {
              // Format with commas instead of using "ك" suffix
              return value.toLocaleString('ar-SA');
            }
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">مقارنة المصروفات حسب الفئة</h3>
      </div>
      {/* Increase height to make chart taller and give more room for horizontal labels */}
      <div style={{ height: '460px', width: '100%', marginBottom: '25px' }}>
        <Bar data={categoryComparisonData} options={barOptions} />
      </div>
    </div>
  );
};

export default ExpenseCharts; 