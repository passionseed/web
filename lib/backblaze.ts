import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface B2FileUploadResponse {
  fileId: string;
  fileName: string;
  fileUrl: string;
}

class BackblazeB2 {
  private s3Client: S3Client;
  private bucketName: string;
  private endpoint: string;

  constructor() {
    const keyId = process.env.B2_APPLICATION_KEY_ID;
    const applicationKey = process.env.B2_APPLICATION_KEY;
    this.bucketName = process.env.B2_BUCKET_NAME!;
    this.endpoint = process.env.B2_ENDPOINT || "s3.us-west-000.backblazeb2.com";

    if (!keyId || !applicationKey || !this.bucketName) {
      throw new Error(
        "Missing required Backblaze B2 environment variables: B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME"
      );
    }

    this.s3Client = new S3Client({
      endpoint: `https://${this.endpoint}`,
      region: "us-west-000",
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: applicationKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    file: File,
    userId: string,
    nodeId: string
  ): Promise<B2FileUploadResponse> {
    try {
      console.log("B2 Upload starting:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId,
        nodeId,
      });

      // Validate environment variables
      if (!this.bucketName) {
        throw new Error("B2_BUCKET_NAME environment variable is not set");
      }

      // Generate secure filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileExtension = sanitizedOriginalName.split(".").pop() || "bin";
      const fileName = `submissions/${userId}/${nodeId}/${timestamp}_${randomString}.${fileExtension}`;

      console.log("Generated filename:", fileName);

      // Convert File to ArrayBuffer then Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      console.log("File converted to buffer, size:", buffer.length);

      // Prepare upload command
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        ContentLength: file.size,
        Metadata: {
          "original-name": sanitizedOriginalName,
          "user-id": userId,
          "node-id": nodeId,
          "upload-timestamp": timestamp.toString(),
        },
      });

      console.log("Executing S3 upload command...");

      // Execute upload
      const result = await this.s3Client.send(uploadCommand);

      console.log("S3 upload result:", result);

      // Construct public URL
      const fileUrl = `https://${this.bucketName}.${this.endpoint}/${fileName}`;

      const response = {
        fileId: result.ETag?.replace(/"/g, "") || timestamp.toString(),
        fileName: fileName,
        fileUrl: fileUrl,
      };

      console.log("B2 upload completed successfully:", response);

      return response;
    } catch (error) {
      console.error("Backblaze B2 upload error:", error);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (
          error.message.includes("credentials") ||
          error.message.includes("InvalidAccessKeyId")
        ) {
          throw new Error(
            "Invalid Backblaze B2 credentials. Please check your configuration."
          );
        }
        if (
          error.message.includes("bucket") ||
          error.message.includes("NoSuchBucket")
        ) {
          throw new Error(
            "Bucket not found. Please verify bucket name and permissions."
          );
        }
        if (
          error.message.includes("network") ||
          error.message.includes("fetch") ||
          error.message.includes("ENOTFOUND")
        ) {
          throw new Error(
            "Network error. Please check your internet connection and try again."
          );
        }
        if (error.message.includes("AccessDenied")) {
          throw new Error("Access denied. Please check your B2 permissions.");
        }
      }

      throw new Error(
        `File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(deleteCommand);
    } catch (error) {
      console.error("Backblaze B2 delete error:", error);
      throw new Error(
        `File deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getSignedUrl(
    fileName: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error("Backblaze B2 signed URL error:", error);
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Health check method with better validation
  async healthCheck(): Promise<boolean> {
    try {
      console.log("Running B2 health check...");

      // Simple test: try to list bucket contents (should work even if empty)
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: "health-check-dummy-key-that-does-not-exist",
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.log("B2 health check error:", error);

      // If error is "NoSuchKey", it means we can connect but object doesn't exist (which is expected)
      if (
        error instanceof Error &&
        (error.name === "NoSuchKey" || error.message.includes("NoSuchKey"))
      ) {
        console.log("B2 health check passed (NoSuchKey is expected)");
        return true;
      }

      // Other errors indicate connection issues
      console.error("B2 health check failed:", error);
      return false;
    }
  }
}

export const b2 = new BackblazeB2();
