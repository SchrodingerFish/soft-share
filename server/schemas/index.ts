import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be at most 50 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be at most 100 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const softwareSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    version: z.string().min(1, 'Version is required'),
    platforms: z.array(z.string()).optional().nullable().default([]),
    category: z.string().min(1, 'Category is required'),
    size: z.string().optional().nullable(),
    update_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    screenshots: z.array(z.string()).optional().nullable().default([]),
    popularity: z.number().optional().nullable().default(0),
    download_url: z.string().optional().nullable().or(z.literal('')),
    version_history: z.array(z.any()).optional().nullable().default([]),
    tutorial: z.string().optional().nullable(),
    tags: z.array(z.object({
      name: z.string(),
      name_en: z.string().optional().nullable(),
      color: z.string().optional().nullable().default('gray')
    })).optional().nullable().default([]),
  }),
});

export const commentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment content is required').max(1000, 'Comment is too long'),
    rating: z.number().min(1).max(5).optional(),
  }),
});

export const profileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50).optional(),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    avatar: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
    password: z.string().min(6).max(100).optional().or(z.literal('')),
  }),
});

export const submissionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    version: z.string().optional(),
    platforms: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
    size: z.string().optional(),
    description: z.string().optional(),
    download_url: z.string().url('Must be a valid URL'),
  }),
});
