import { S3Client } from "@aws-sdk/client-s3";
import { R2Provider } from "./r2.provider";

/**
 * S3Provider extends R2Provider to provide support for AWS S3.
 * It overrides the client constructor to use AWS S3-specific configurations.
 */
export class S3Provider extends R2Provider {
  constructor(opts: {
    region: string; // AWS region
    accessKeyId: string; // AWS access key ID
    secretAccessKey: string; // AWS secret access key
    bucket: string; // Default bucket name
  }) {
    // Call the parent constructor with dummy values for R2-specific fields
    super({
      accountId: "unused", // Not used for S3
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
      bucket: opts.bucket,
    });

    // Replace the S3 client with an AWS S3 client configured for the given region
    // @ts-ignore: Ignore TypeScript errors for accessing protected properties
    this.s3 = new S3Client({
      region: opts.region,
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
    });

    // Update the driver identifier to "s3"
    // @ts-ignore: Ignore TypeScript errors for accessing protected properties
    this.driver = "s3";
  }
}