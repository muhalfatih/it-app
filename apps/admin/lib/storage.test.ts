import { describe, expect, it } from "vitest"

import { storageConfig } from "@/lib/storage"

const env = {
  S3_ENDPOINT: "http://localhost:9000",
  S3_PUBLIC_URL: "http://localhost:9000",
  S3_ACCESS_KEY: "ak",
  S3_SECRET_KEY: "sk",
  S3_BUCKET: "konten",
} as unknown as NodeJS.ProcessEnv

describe("storageConfig", () => {
  it("membaca env lengkap dengan region bawaan", () => {
    const c = storageConfig(env)
    expect(c).toMatchObject({
      endPoint: "localhost",
      port: 9000,
      useSSL: false,
      accessKey: "ak",
      secretKey: "sk",
      bucket: "konten",
      region: "us-east-1",
    })
    expect(c.publicUrl.host).toBe("localhost:9000")
  })

  it("menolak env yang kurang", () => {
    expect(() => storageConfig({ ...env, S3_SECRET_KEY: undefined })).toThrow(
      "S3_SECRET_KEY belum diatur"
    )
  })

  it("menolak S3_PUBLIC_URL yang bukan URL", () => {
    expect(() => storageConfig({ ...env, S3_PUBLIC_URL: "bukan url" })).toThrow()
  })
})
