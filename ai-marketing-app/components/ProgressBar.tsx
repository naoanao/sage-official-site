"use client";

interface Props {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: Props) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{current} / {total}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
