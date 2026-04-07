interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '4px',
        backgroundColor: '#F3F4F6',
        borderRadius: '12px',
        width: 'fit-content',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: isActive ? 'white' : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              color: isActive ? '#36004E' : '#6B7280',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '20px',
                  backgroundColor: isActive ? '#F3E8FF' : '#E5E7EB',
                  color: isActive ? '#7C3AED' : '#6B7280',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
