import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../common/Card'

export function SalesChart({ data }) {
  return (
    <Card className="h-96 p-4">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Revenue and Orders Trend
      </h3>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
          <Bar dataKey="orders" fill="#f59e0b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
