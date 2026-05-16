import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsDashboard = () => {
  const [distribution, setDistribution] = useState([]);
  const [reviewRatio, setReviewRatio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/analytics')
      .then(res => res.json())
      .then(data => {
        setDistribution(data.distribution || []);
        setReviewRatio(data.reviewRatio || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch analytics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-[#2F2F2F] font-serif uppercase tracking-widest">Loading Analytics...</div>;
  }

  const barData = {
    labels: distribution.map(d => d.name),
    datasets: [
      {
        label: 'Number of Students',
        data: distribution.map(d => d.value),
        backgroundColor: '#A23B2B', // Vermilion
        borderRadius: 4,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  const flaggedCount = reviewRatio.find(r => r.name === 'Flagged')?.value || 0;
  const cleanCount = reviewRatio.find(r => r.name === 'Clean')?.value || 0;

  const doughnutData = {
    labels: ['Flagged', 'Clean'],
    datasets: [
      {
        data: [flaggedCount, cleanCount],
        backgroundColor: [
          '#A23B2B', // Vermilion
          '#2F2F2F'  // Ink
        ],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: 'serif'
          },
          color: '#2F2F2F'
        }
      }
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-serif uppercase tracking-widest text-[#2F2F2F] text-center mb-12">
        Class Analytics Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Grade Distribution Card */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-serif uppercase tracking-wider text-[#2F2F2F] mb-6 text-center">
            Grade Distribution
          </h2>
          <div className="h-64 flex justify-center">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

        {/* Manual Review Ratio Card */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-serif uppercase tracking-wider text-[#2F2F2F] mb-6 text-center">
            Manual Review Ratio
          </h2>
          <div className="h-64 flex justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
