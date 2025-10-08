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

interface B2ImageUploadResponse extends B2FileUploadResponse {
  blurhash?: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
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
    nodeId: string,
    customPath?: string
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

      // Use custom path if provided, otherwise use default submissions path
      const fileName = customPath || `submissions/${userId}/${nodeId}/${timestamp}_${randomString}.${fileExtension}`;

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

  // New method for uploading processed image buffers (for cover images)
  async uploadImageBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    metadata: {
      blurhash?: string;
      width?: number;
      height?: number;
      originalName?: string;
      userId?: string;
      mapId?: string;
      [key: string]: string | number | undefined;
    } = {}
  ): Promise<B2ImageUploadResponse> {
    try {
      console.log("B2 Image Upload starting:", {
        fileName,
        bufferSize: buffer.length,
        contentType,
        metadata,
      });

      // Validate environment variables
      if (!this.bucketName) {
        throw new Error("B2_BUCKET_NAME environment variable is not set");
      }

      // Generate secure path for images
      const timestamp = Date.now();
      const imagePath = `images/maps/${timestamp}_${fileName}`;

      console.log("Generated image path:", imagePath);

      // Prepare upload command with image-specific metadata
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: imagePath,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        Metadata: {
          "upload-timestamp": timestamp.toString(),
          "upload-type": "cover-image",
          ...(metadata.originalName && { "original-name": metadata.originalName }),
          ...(metadata.userId && { "user-id": metadata.userId }),
          ...(metadata.mapId && { "map-id": metadata.mapId }),
          ...(metadata.blurhash && { "blurhash": metadata.blurhash }),
          ...(metadata.width && { "width": metadata.width.toString() }),
          ...(metadata.height && { "height": metadata.height.toString() }),
        },
        // Add cache control for images
        CacheControl: "public, max-age=31536000", // 1 year cache
      });

      console.log("Executing S3 image upload command...");

      // Execute upload
      const result = await this.s3Client.send(uploadCommand);

      console.log("S3 image upload result:", result);

      // Construct public URL
      const fileUrl = `https://${this.bucketName}.${this.endpoint}/${imagePath}`;

      const response: B2ImageUploadResponse = {
        fileId: result.ETag?.replace(/"/g, "") || timestamp.toString(),
        fileName: imagePath,
        fileUrl: fileUrl,
        blurhash: metadata.blurhash,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        format: contentType.split('/')[1] || 'unknown',
      };

      console.log("B2 image upload completed successfully:", response);

      return response;
    } catch (error) {
      console.error("Backblaze B2 image upload error:", error);

      // Use same error handling as the original method
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
        `Image upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
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

  /**
   * Generate a presigned PUT URL for direct client-to-B2 uploads
   * This bypasses serverless function payload limits
   * Note: Using PUT instead of POST for better B2 compatibility
   */
  async getPresignedUploadUrl(
    userId: string,
    nodeId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    uploadType: "submission" | "map-content" = "submission",
    expiresIn: number = 3600
  ): Promise<{
    uploadUrl: string;
    fileKey: string;
    method: "PUT";
  }> {
    try {
      // Generate secure filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const sanitizedOriginalName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileExtension = sanitizedOriginalName.split(".").pop() || "bin";

      // Determine file path based on upload type
      const fileKey = uploadType === "map-content"
        ? `maps/${nodeId}/content/${timestamp}_${randomString}.${fileExtension}`
        : `submissions/${userId}/${nodeId}/${timestamp}_${randomString}.${fileExtension}`;

      console.log("Generating presigned PUT URL:", {
        userId,
        nodeId,
        uploadType,
        fileKey,
        fileType,
        fileSize,
      });

      // Create presigned PUT command (more compatible with B2)
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: fileType || "application/octet-stream",
        ContentLength: fileSize,
        Metadata: {
          "original-name": sanitizedOriginalName,
          "user-id": userId,
          "node-id": nodeId,
          "upload-timestamp": timestamp.toString(),
        },
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      console.log("Presigned PUT URL generated successfully:", {
        url: presignedUrl.substring(0, 100) + "...",
        bucket: this.bucketName,
        endpoint: this.endpoint,
      });

      return {
        uploadUrl: presignedUrl,
        fileKey,
        method: "PUT",
      };
    } catch (error) {
      console.error("Backblaze B2 presigned PUT error:", error);
      throw new Error(
        `Failed to generate presigned upload URL: ${error instanceof Error ? error.message : "Unknown error"}`
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
