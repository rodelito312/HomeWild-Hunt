import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const data = [
  { name: "Security & Safety", value: 30 },
  { name: "Comfort & Usability", value: 20 },
  { name: "Technology Features", value: 15 },
  { name: "Portability & Setup", value: 15 },
  { name: "Durability & Material", value: 10 },
  { name: "Price & Value for Money", value: 10 },
];

const COLORS = ["#ff9999", "#66b3ff", "#99ff99", "#ffcc99", "#c2c2f0", "#ffb3e6"];

const FeedbackPieChart = () => {
  return (
    <div className="flex flex-col items-center bg-white shadow-lg rounded-lg p-6 w-[500px] mx-auto">
      <h2 className="text-xl font-semibold mb-4">User Feedback Distribution</h2>
      <div className="flex items-center">
        <div className="flex flex-col gap-2 text-xs">
          {data.slice(0, 3).map((entry, index) => (
            <div key={`legend-left-${index}`} className="flex items-center gap-2">
              <span style={{ backgroundColor: COLORS[index] }} className="w-3 h-3 inline-block rounded-full"></span>
              {entry.name}
            </div>
          ))}
        </div>
        <PieChart width={400/2} height={450/2} className="mx-4">
          <Pie
            data={data}
            cx={200/2}
            cy={160/2} 
            outerRadius={120/2}
            fill="#8884d8"
            dataKey="value"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
        <div className="flex flex-col gap-2 text-xs">
          {data.slice(3, 6).map((entry, index) => (
            <div key={`legend-right-${index}`} className="flex items-center gap-1">
              <span style={{ backgroundColor: COLORS[index + 3] }} className="w-3 h-3 inline-block rounded-full"></span>
              {entry.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPieChart;
