const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY);

async function createTemplate() {
  try {
    console.log('Reading invitation.html...');
    const htmlContent = fs.readFileSync(path.join(process.cwd(), 'invitation.html'), 'utf-8');

    console.log('Creating Resend template...');
    const response = await resend.templates.create({
      name: 'TNDH Opening Ceremony Invitation',
      html: htmlContent,
    });

    console.log('Template created successfully!');
    console.log(response);
  } catch (error) {
    console.error('Error creating template:', error);
  }
}

createTemplate();
