import React from 'react';
import Layout from '@/components/layout';
import TradeLogsTest from '@/components/test/TradeLogsTest';

export default function TradeLogsTestPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2">Trade Logs API</h1>
        <p className="text-gray-500 mb-6">
          Test the Trade Logs API functionality (using Direct API endpoints)
        </p>
        <TradeLogsTest />
      </div>
    </Layout>
  );
}