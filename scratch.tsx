import fs from 'fs'
import path from 'path'

export const testRead = () => {
  const logoPath = path.join(process.cwd(), 'public', 'hackathon', 'HackLogo.png')
  console.log("Logo exists:", fs.existsSync(logoPath))
}
testRead()
