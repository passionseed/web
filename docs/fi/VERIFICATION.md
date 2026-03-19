# How to Verify FI.co Submissions

## Step 1: Launch Chrome with Remote Debugging

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Or create an alias in your shell:**
```bash
alias chrome-debug='/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222'
```

## Step 2: Login to FI.co

1. In the Chrome window that opens, navigate to https://fi.co
2. Login with your Google account
3. Navigate to the sprint you want to verify

## Step 3: Run Verification

Once Chrome is running with debugging, I can connect and verify submissions:

```bash
# Save auth state
agent-browser --auto-connect state save /tmp/fi-auth.json

# Navigate to sprint
agent-browser --state /tmp/fi-auth.json open "https://fi.co/enrolled/assignments/legal-equity-chula-university-innovation-hub-2026"

# Check completed steps
agent-browser snapshot -i | grep Completed
```

## Alternative: Manual Verification

If you prefer to verify manually:

1. Go to: https://fi.co/enrolled/assignments/legal-equity-chula-university-innovation-hub-2026
2. Check each step shows "Completed" badge
3. Click on each step to verify the content is correct
4. Take screenshots of any discrepancies

## What to Check

For Sprint 8 (Legal & Equity), verify:
- [ ] Step 1: 7 business ingredients ranked
- [ ] Step 2: Second thoughts documented
- [ ] Step 3: Additional businesses listed
- [ ] Step 4: Co-founders with ownership %
- [ ] Step 5: 9 advisor candidates listed
- [ ] Step 6: Forwardable message ready
- [ ] Step 7: Cap table with shares
- [ ] Step 8: Employment law structure
- [ ] Step 9: First mailing email copy
- [ ] Step 10: Mentor office hours scheduled
- [ ] Step 11: Mentor research documented
- [ ] Step 12: Hotseat pitch links
- [ ] Step 13: Value proposition learning
- [ ] Step 14: Value proposition slides