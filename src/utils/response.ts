import { ApiResponse, PaginatedResponse, ErrorResponse } from '../types';

export const success = <T = unknown>(
  data: T,
  message: string = '操作成功',
  code: number = 200
): ApiResponse<T> => {
  return {
    success: true,
    code,
    message,
    data,
    timestamp: Date.now(),
  };
};

export const error = (
  message: string = '操作失败',
  code: number = 400,
  errors?: Array<{ field: string; message: string }>
): ErrorResponse => {
  return {
    success: false,
    code,
    message,
    errors,
    timestamp: Date.now(),
  };
};

export const paginate = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = '获取成功'
): ApiResponse<PaginatedResponse<T>> => {
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return success(
    {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrev,
    },
    message
  );
};

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export default {
  success,
  error,
  paginate,
  HttpStatus,
};
