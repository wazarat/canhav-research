import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'

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

    // Send email notification
    try {
      await sendEmailNotification(submission)
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Continue processing even if email fails
    }

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

// Email notification function using Gmail SMTP
async function sendEmailNotification(submission: EnterpriseSubmission) {
  // Create transporter using Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password
    },
  })

  // Format track-specific data
  const trackSpecificText = Array.isArray(submission.trackSpecific) 
    ? submission.trackSpecific.join(', ')
    : submission.trackSpecific

  // Email content
  const emailContent = `
New ${submission.type === 'builder' ? 'Research Track' : 'Business Efficiency Track'} Submission

Contact Information:
- Name: ${submission.name}
- Email: ${submission.email}
- Organization: ${submission.organization || 'Not provided'}

Submission Details:
- Primary Interest: ${submission.primaryInterest}
- ${submission.type === 'builder' ? 'Familiarity Level' : 'Challenges'}: ${trackSpecificText}
- Scope: ${submission.scope}
- Timeline: ${submission.timeline}
- Context: ${submission.context || 'Not provided'}

Submitted: ${new Date(submission.submittedAt).toLocaleString()}
Track Type: ${submission.type === 'builder' ? 'Research Track (Crypto Native Teams)' : 'Business Efficiency Track (Small Businesses)'}
  `.trim()

  // Send email
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: 'waz@canhav.com',
    subject: `New ${submission.type === 'builder' ? 'Research' : 'Business'} Track Inquiry - ${submission.name}`,
    text: emailContent,
    html: emailContent.replace(/\n/g, '<br>'),
  })

  console.log('Email notification sent successfully to waz@canhav.com')
}
