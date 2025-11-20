import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiActivity, FiFile, FiUser, FiShield } from 'react-icons/fi';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/audit`);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return <FiUser className="h-5 w-5" />;
      case 'UPLOAD':
      case 'DOWNLOAD':
      case 'DELETE':
        return <FiFile className="h-5 w-5" />;
      case 'HONEYFILE_TRIGGERED':
        return <FiShield className="h-5 w-5 text-yellow-600" />;
      default:
        return <FiActivity className="h-5 w-5" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-green-100 text-green-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      case 'UPLOAD':
        return 'bg-blue-100 text-blue-800';
      case 'DOWNLOAD':
        return 'bg-purple-100 text-purple-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'HONEYFILE_TRIGGERED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-quantum-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Audit Logs</h2>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <FiActivity className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">No audit logs yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      {log.file && (
                        <span className="text-sm text-gray-600">
                          • {log.file.originalName || log.file.filename}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                      {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;

