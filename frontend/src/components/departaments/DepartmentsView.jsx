// src/components/departments/DepartmentsView.jsx

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

function DepartmentsView({ departments, users, requests }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Departamentos</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const userCount = users.filter(u => u.department === dept).length;
          const requestCount = requests.filter(r => r.department === dept).length;

          return (
            <Card key={dept}>
              <CardHeader>
                <CardTitle className="text-lg">{dept}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>👥 Usuarios activos: <strong>{userCount}</strong></p>
                  <p>📄 Solicitudes: <strong>{requestCount}</strong></p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default DepartmentsView;
