import React from 'react'
import { ReportContent } from './report-content'

interface PageProps {
  params: { id: string }
}

export default function ReportPage({ params }: PageProps) {
  const resolvedParams = React.use(Promise.resolve(params))
  return <ReportContent id={resolvedParams.id} />
}
