# Backblaze B2 CORS Configuration

For direct client-to-B2 uploads to work, you **must** configure CORS rules on your Backblaze B2 bucket.

## Required CORS Configuration

1. Log in to your Backblaze B2 account at https://secure.backblaze.com/
2. Navigate to **Buckets** → Select your bucket
3. Click on **Bucket Settings** → **CORS Rules**
4. Add the following CORS rule:

```json
[
  {
    "corsRuleName": "allowDirectUploads",
    "allowedOrigins": [
      "https://www.passionseed.org",
      "https://passionseed.org",
      "http://localhost:3000"
    ],
    "allowedOperations": [
      "s3_post"
    ],
    "allowedHeaders": [
      "*"
    ],
    "exposeHeaders": [
      "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
```

## Configuration Details

- **corsRuleName**: A friendly name for the rule
- **allowedOrigins**: Your production domain(s) and development URLs
  - Add `https://www.passionseed.org` for production
  - Add `http://localhost:3000` for local development
  - Update these to match your actual domains
- **allowedOperations**: Must include `s3_post` for direct uploads
- **allowedHeaders**: Set to `*` to allow all headers from presigned POST
- **exposeHeaders**: Include `ETag` for upload verification
- **maxAgeSeconds**: Cache preflight requests for 1 hour

## Testing CORS Configuration

After applying the CORS rules:

1. Wait 1-2 minutes for changes to propagate
2. Test uploading a file >4MB through your application
3. Check browser console for CORS errors
4. If errors persist, verify:
   - Your domain is correctly listed in `allowedOrigins`
   - The rule includes `s3_post` operation
   - Browser cache is cleared

## CLI Alternative (Using B2 CLI)

If you have the B2 CLI installed, you can also set CORS rules via command line:

```bash
# Create a cors-rules.json file
cat > cors-rules.json << EOF
[
  {
    "corsRuleName": "allowDirectUploads",
    "allowedOrigins": [
      "https://www.passionseed.org",
      "http://localhost:3000"
    ],
    "allowedOperations": ["s3_post"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["ETag"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS rules to your bucket
b2 update-bucket --corsRules "$(cat cors-rules.json)" <your-bucket-name> allPrivate
```

## Troubleshooting

### Error: "Failed to fetch" or "CORS policy blocked"
- Verify CORS rules are applied to the correct bucket
- Check that your domain is in `allowedOrigins`
- Ensure `s3_post` is in `allowedOperations`

### Error: "Access Denied"
- Verify your B2 application key has write permissions
- Check bucket permissions are set to allow uploads

### Files upload but URLs don't work
- Verify bucket is set to public or has proper access rules
- Check bucket URL format matches your B2 endpoint configuration

## Security Notes

- Keep `allowedOrigins` restricted to your actual domains
- Do NOT use `*` for `allowedOrigins` in production
- Consider using bucket lifecycle rules to auto-delete old temp files
- Review upload logs periodically for abuse

## References

- [Backblaze B2 CORS Documentation](https://www.backblaze.com/b2/docs/cors_rules.html)
- [AWS S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html) (B2 uses S3-compatible API)
