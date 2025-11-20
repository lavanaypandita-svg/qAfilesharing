import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import FileUpload from './FileUpload';
import FileList from './FileList';
import SharedFiles from './SharedFiles';
import AuditLogs from './AuditLogs';
import Honeyfiles from './Honeyfiles';
import WebRTCShare from './WebRTCShare';
import { FiUpload, FiFolder, FiShare2, FiShield, FiActivity, FiLogOut, FiUser } from 'react-icons/fi';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');

  const tabs = [
    { id: 'upload', label: 'Upload', icon: FiUpload },
    { id: 'my-files', label: 'My Files', icon: FiFolder },
    { id: 'shared', label: 'Shared', icon: FiShare2 },
    { id: 'webrtc', label: 'P2P Share', icon: FiShare2 },
    { id: 'honeyfiles', label: 'Honeyfiles', icon: FiShield },
    { id: 'audit', label: 'Audit Logs', icon: FiActivity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-quantum-600 to-primary-600">
                Quantum-Safe File Sharing
              </h1>
              <p className="text-sm text-gray-500 mt-1">End-to-end encrypted, quantum-resistant</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-700">
                <FiUser className="h-5 w-5" />
                <span className="font-medium">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FiLogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-quantum-600 text-quantum-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && <FileUpload />}
        {activeTab === 'my-files' && <FileList />}
        {activeTab === 'shared' && <SharedFiles />}
        {activeTab === 'webrtc' && <WebRTCShare />}
        {activeTab === 'honeyfiles' && <Honeyfiles />}
        {activeTab === 'audit' && <AuditLogs />}
      </main>
    </div>
  );
};

export default Dashboard;

