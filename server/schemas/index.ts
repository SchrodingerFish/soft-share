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
    platforms: z.array(z.string()).optional().default([]),
    category: z.string().min(1, 'Category is required'),
    size: z.string().optional(),
    update_date: z.string().optional(),
    description: z.string().optional(),
    screenshots: z.array(z.string()).optional().default([]),
    popularity: z.number().optional().default(0),
    download_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    version_history: z.array(z.any()).optional().default([]),
    tutorial: z.string().optional(),
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
