import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as any;
      
      // Assign parsed values back to req to ensure defaults and transformations are applied
      // Only assign if the schema actually parsed and returned them
      if (parsed && 'body' in parsed) req.body = parsed.body;
      if (parsed && 'query' in parsed) req.query = parsed.query as any;
      if (parsed && 'params' in parsed) req.params = parsed.params as any;
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || [];
        console.error('Validation failed:', JSON.stringify(issues, null, 2));
        
        const errorDetails = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        
        return res.status(400).json({
          code: 400,
          message: `Validation failed: ${errorDetails}`,
          errors: issues.map((e: any) => ({ 
            path: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''), 
            message: e.message || 'Unknown validation error' 
          }))
        });
      }
      return res.status(500).json({ code: 500, message: 'Internal server error during validation' });
    }
  };
};
