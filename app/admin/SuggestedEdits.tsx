

import React, { useEffect, useState } from 'react';
import { getResources } from '../utils/supabase';
import type { ResourceEntry } from '../types/ResourceEntry';

const SuggestedEdits: React.FC = () => {
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getResources({ limit: 10, offset: 0 });
        setResources(result.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch resources');
      }
      setLoading(false);
    };
    fetchResources();
  }, []);

  return (
    <div>
      <h2>Resource List (Demo)</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td>{resource.name || '(No Name)'}</td>
                <td>{resource.resource_type}</td>
                <td>{resource.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SuggestedEdits;
