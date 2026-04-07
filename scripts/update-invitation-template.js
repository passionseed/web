const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

const resend = new Resend(process.env.RESEND_API_KEY || 're_P2hKXtZ7_5WFqwtTirN4jJGFmhiKF75pQ');

async function updateTemplate() {
  try {
    console.log('Reading updated invitation.html...');
    const htmlContent = fs.readFileSync(path.join(process.cwd(), 'invitation.html'), 'utf-8');

    console.log('Updating Resend template...');
    const response = await resend.templates.update('3177e178-0b0d-4fd3-9530-272753b3f638', {
      name: 'TNDH Opening Ceremony Invitation',
      html: htmlContent,
    });

    console.log('Template updated successfully!');
    console.log(response);
    
    // Publish the updated template
    console.log('Publishing template...');
    const publishResponse = await resend.templates.publish('3177e178-0b0d-4fd3-9530-272753b3f638');
    console.log('Template published!', publishResponse);
    
  } catch (error) {
    console.error('Error updating template:', error);
  }
}

updateTemplate();