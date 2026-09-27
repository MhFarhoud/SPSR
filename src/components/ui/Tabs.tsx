import React from "react";

export type Tab = {
  id: string;
  label: string;
  icon?: React.ElementType;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
};

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                whitespace-nowrap flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${isActive 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {Icon && <Icon className={`ml-2 w-5 h-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
