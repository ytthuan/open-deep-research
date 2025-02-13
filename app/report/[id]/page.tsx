import React from 'react'
import { ReportContent } from './report-content'

// function return a component that renders the report content based on the id passed as a parameter.
export default async function ReportPage({ params }: { params: { id: string } }) {
  return <ReportContent id={params.id} />
}
//