import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

interface EnterpriseSubmission {
  name: string
  email: string
  organization: string
  primaryInterest: string
  trackSpecific: string | string[]
  scope: string
  timeline: string
  context: string
  type: 'builder' | 'business'
  submittedAt: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const submission: EnterpriseSubmission = req.body

    // Basic validation
    if (!submission.name || !submission.email || !submission.primaryInterest || !submission.scope || !submission.timeline) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(submission.email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    // Ensure submissions directory exists
    const submissionsDir = path.join(process.cwd(), 'data', 'submissions')
    if (!fs.existsSync(submissionsDir)) {
      fs.mkdirSync(submissionsDir, { recursive: true })
    }

    // Read existing submissions or create empty array
    const submissionsFile = path.join(submissionsDir, 'enterprise-submissions.json')
    let existingSubmissions = []
    
    if (fs.existsSync(submissionsFile)) {
      const fileContent = fs.readFileSync(submissionsFile, 'utf8')
      existingSubmissions = JSON.parse(fileContent)
    }

    // Add new submission
    existingSubmissions.push(submission)

    // Write back to file
    fs.writeFileSync(submissionsFile, JSON.stringify(existingSubmissions, null, 2))

    // TODO: Send email notification
    // await sendEmailNotification(submission)

    console.log('Enterprise submission received:', {
      name: submission.name,
      email: submission.email,
      type: submission.type,
      organization: submission.organization,
      submittedAt: submission.submittedAt
    })

    res.status(200).json({ message: 'Submission received successfully' })
  } catch (error) {
    console.error('Error processing enterprise submission:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// Placeholder for email notification function
async function sendEmailNotification(submission: EnterpriseSubmission) {
  // TODO: Implement email sending logic
  // This could use services like SendGrid, AWS SES, etc.
  console.log('Email notification would be sent for:', submission.email)
}
