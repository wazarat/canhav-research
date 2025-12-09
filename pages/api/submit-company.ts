import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

interface CompanySubmission {
  yourEmail: string
  companyName: string
  website: string
  description: string
  sector: string
  subsector: string
  pointOfContact: string
  submittedAt: string
}

// Validation function
function validateSubmission(data: any): data is CompanySubmission {
  const required = ['yourEmail', 'companyName', 'website', 'description', 'sector', 'subsector', 'pointOfContact']
  
  for (const field of required) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      return false
    }
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.yourEmail)) {
    return false
  }
  
  // Basic URL validation
  try {
    new URL(data.website)
  } catch {
    return false
  }
  
  return true
}

// Placeholder email function (to be implemented later)
async function sendEmail(submission: CompanySubmission) {
  // TODO: Implement with Nodemailer/Resend
  console.log('Email would be sent for submission:', submission.companyName)
  
  // For now, just log to console
  console.log(`
    New Company Submission:
    Company: ${submission.companyName}
    Website: ${submission.website}
    Sector: ${submission.sector}
    Subsector: ${submission.subsector}
    Contact: ${submission.pointOfContact}
    Email: ${submission.yourEmail}
    Description: ${submission.description}
    Submitted: ${submission.submittedAt}
  `)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validate the submission
    if (!validateSubmission(req.body)) {
      return res.status(400).json({ error: 'Invalid submission data' })
    }

    const submission: CompanySubmission = {
      ...req.body,
      submittedAt: new Date().toISOString()
    }

    // Save to JSON file (for now)
    const submissionsDir = path.join(process.cwd(), 'data', 'submissions')
    const submissionsFile = path.join(submissionsDir, 'company-submissions.json')

    // Ensure directory exists
    if (!fs.existsSync(submissionsDir)) {
      fs.mkdirSync(submissionsDir, { recursive: true })
    }

    // Read existing submissions or create empty array
    let submissions: CompanySubmission[] = []
    if (fs.existsSync(submissionsFile)) {
      const fileContent = fs.readFileSync(submissionsFile, 'utf-8')
      submissions = JSON.parse(fileContent)
    }

    // Add new submission
    submissions.push(submission)

    // Write back to file
    fs.writeFileSync(submissionsFile, JSON.stringify(submissions, null, 2))

    // Send email notification (placeholder)
    await sendEmail(submission)

    res.status(200).json({ 
      success: true, 
      message: 'Company submission received successfully' 
    })

  } catch (error) {
    console.error('Error processing submission:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
