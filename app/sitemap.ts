import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://pulsehospitalbd.com'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // ভবিষ্যতে আরও পেজ যোগ হলে এখানে যুক্ত করতে পারবে
  ]
}