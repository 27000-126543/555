import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { error, HttpStatus } from '../utils/response';

type ValidationTarget = 'body' | 'query' | 'params';

export const validationMiddleware = (
  schema: Joi.ObjectSchema,
  target: ValidationTarget = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];

      const { error: validationError } = schema.validate(data, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (validationError) {
        const errors = validationError.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res
          .status(HttpStatus.BAD_REQUEST)
          .json(
            error('参数验证失败', HttpStatus.BAD_REQUEST, errors)
          );
      }

      next();
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json(error('验证过程中发生错误', HttpStatus.INTERNAL_SERVER_ERROR));
    }
  };
};

export default validationMiddleware;
