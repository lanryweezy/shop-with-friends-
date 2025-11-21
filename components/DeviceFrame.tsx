import React from 'react';

interface DeviceFrameProps {
  children: React.ReactNode;
  name: string;
  isOnline: boolean;
}

const DeviceFrame: React.FC<DeviceFrameProps> = ({ children, name, isOnline }) => {
  return (
    <div className="flex flex-col items-center gap-4 h-full">
      <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-white text-sm font-medium flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        {name}'s Device
      </div>
      <div className="relative w-[360px] h-[700px] bg-black rounded-[3rem] border-[8px] border-gray-800 overflow-hidden shadow-2xl ring-1 ring-white/20">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50"></div>
        
        {/* Screen Content */}
        <div className="w-full h-full bg-white overflow-hidden relative">
          {children}
        </div>

        {/* Home Bar */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-900/50 rounded-full z-50"></div>
      </div>
    </div>
  );
};

export default DeviceFrame;