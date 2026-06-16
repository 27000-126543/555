# 路灯巡检管理系统 API 文档

## 全局说明

### Base URL
```
http://localhost:3000/api
```

### 认证方式
所有需要认证的接口必须在请求头中携带 Bearer Token：
```
Authorization: Bearer <access_token>
```

### 角色权限
- `admin` - 系统管理员
- `inspector` - 巡检员
- `maintainer` - 维修员
- `finance` - 财务人员

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或Token无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 统一响应格式
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": 1718208000000
}
```

---

## 1. 认证接口

### 1.1 用户登录
- **方法**: `POST`
- **路径**: `/auth/login`
- **权限**: 公开
- **请求参数**:
```json
{
  "username": "admin",
  "password": "123456"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "realName": "系统管理员",
      "role": "admin",
      "phone": "13800138000",
      "email": "admin@example.com"
    }
  }
}
```

### 1.2 用户注册
- **方法**: `POST`
- **路径**: `/auth/register`
- **权限**: `admin`
- **请求参数**:
```json
{
  "username": "inspector01",
  "password": "123456",
  "realName": "巡检员01",
  "role": "inspector",
  "phone": "13800138001",
  "email": "inspector01@example.com",
  "area": "朝阳区"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "注册成功",
  "data": {
    "id": "uuid",
    "username": "inspector01",
    "realName": "巡检员01",
    "role": "inspector"
  }
}
```

### 1.3 修改密码
- **方法**: `POST`
- **路径**: `/auth/change-password`
- **权限**: 已登录用户
- **请求参数**:
```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "密码修改成功"
}
```

### 1.4 获取当前用户
- **方法**: `GET`
- **路径**: `/auth/me`
- **权限**: 已登录用户
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "username": "admin",
    "realName": "系统管理员",
    "role": "admin",
    "phone": "13800138000",
    "email": "admin@example.com",
    "status": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 2. 用户管理接口

### 2.1 创建用户
- **方法**: `POST`
- **路径**: `/users`
- **权限**: `admin`
- **请求参数**:
```json
{
  "username": "maintainer01",
  "password": "123456",
  "realName": "维修员01",
  "role": "maintainer",
  "phone": "13800138002",
  "email": "maintainer01@example.com",
  "area": "海淀区"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "username": "maintainer01",
    "realName": "维修员01",
    "role": "maintainer"
  }
}
```

### 2.2 获取用户列表
- **方法**: `GET`
- **路径**: `/users`
- **权限**: `admin`
- **查询参数**: `page`, `pageSize`, `role`, `status`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "admin",
        "realName": "系统管理员",
        "role": "admin",
        "phone": "13800138000",
        "status": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 2.3 获取用户详情
- **方法**: `GET`
- **路径**: `/users/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "username": "admin",
    "realName": "系统管理员",
    "role": "admin",
    "phone": "13800138000",
    "email": "admin@example.com",
    "area": "朝阳区",
    "status": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.4 更新用户
- **方法**: `PUT`
- **路径**: `/users/:id`
- **权限**: `admin`
- **请求参数**:
```json
{
  "realName": "新名称",
  "phone": "13900139000",
  "email": "new@example.com",
  "role": "inspector",
  "area": "东城区"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "更新成功"
}
```

### 2.5 删除用户
- **方法**: `DELETE`
- **路径**: `/users/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "删除成功"
}
```

### 2.6 更新用户状态
- **方法**: `PUT`
- **路径**: `/users/:id/status`
- **权限**: `admin`
- **请求参数**:
```json
{
  "status": false
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "状态更新成功"
}
```

### 2.7 重置密码
- **方法**: `PUT`
- **路径**: `/users/:id/reset-password`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "密码已重置为123456"
}
```

---

## 3. 巡检管理接口

### 3.1 创建巡检记录
- **方法**: `POST`
- **路径**: `/inspections`
- **权限**: `admin`, `inspector`
- **请求参数**:
```json
{
  "streetLightId": "uuid",
  "inspectDate": "2024-01-15",
  "faultType": "灯泡烧坏",
  "faultLevel": "low",
  "description": "灯泡不亮，需要更换",
  "images": ["image1.jpg", "image2.jpg"]
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "巡检记录创建成功",
  "data": {
    "id": "uuid",
    "streetLightId": "uuid",
    "faultType": "灯泡烧坏",
    "faultLevel": "low"
  }
}
```

### 3.2 获取巡检列表
- **方法**: `GET`
- **路径**: `/inspections`
- **权限**: `admin`, `inspector`
- **查询参数**: `page`, `pageSize`, `streetLightId`, `faultLevel`, `startDate`, `endDate`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "streetLightId": "uuid",
        "inspectorId": "uuid",
        "inspectDate": "2024-01-15",
        "faultType": "灯泡烧坏",
        "faultLevel": "low",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 3.3 获取巡检详情
- **方法**: `GET`
- **路径**: `/inspections/:id`
- **权限**: `admin`, `inspector`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "streetLightId": "uuid",
    "inspectorId": "uuid",
    "inspectDate": "2024-01-15",
    "faultType": "灯泡烧坏",
    "faultLevel": "low",
    "description": "灯泡不亮，需要更换",
    "images": ["image1.jpg"],
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### 3.4 更新巡检记录
- **方法**: `PUT`
- **路径**: `/inspections/:id`
- **权限**: `admin`, `inspector`
- **请求参数**:
```json
{
  "faultType": "镇流器故障",
  "faultLevel": "medium",
  "description": "镇流器发出异响"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "更新成功"
}
```

### 3.5 删除巡检记录
- **方法**: `DELETE`
- **路径**: `/inspections/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "删除成功"
}
```

### 3.6 巡检统计
- **方法**: `GET`
- **路径**: `/inspections/stats`
- **权限**: `admin`, `inspector`
- **查询参数**: `startDate`, `endDate`, `area`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "totalInspections": 100,
    "faultCount": 30,
    "faultRate": 0.3,
    "byLevel": {
      "low": 15,
      "medium": 10,
      "urgent": 5
    },
    "byType": {
      "灯泡烧坏": 10,
      "镇流器故障": 8,
      "其他": 12
    }
  }
}
```

---

## 4. 工单管理接口

### 4.1 获取工单列表
- **方法**: `GET`
- **路径**: `/work-orders`
- **权限**: `admin`, `inspector`, `maintainer`
- **查询参数**: `page`, `pageSize`, `status`, `faultLevel`, `maintainerId`, `area`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "orderNo": "WO20240115001",
        "streetLightId": "uuid",
        "faultType": "灯泡烧坏",
        "faultLevel": "low",
        "status": "pending",
        "priority": 1,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 4.2 获取工单详情
- **方法**: `GET`
- **路径**: `/work-orders/:id`
- **权限**: `admin`, `inspector`, `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "orderNo": "WO20240115001",
    "streetLightId": "uuid",
    "maintainerId": "uuid",
    "faultType": "灯泡烧坏",
    "faultLevel": "low",
    "status": "assigned",
    "priority": 1,
    "assignedAt": "2024-01-15T11:00:00.000Z",
    "partsCost": 0,
    "laborCost": 0,
    "totalCost": 0,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### 4.3 分配工单
- **方法**: `POST`
- **路径**: `/work-orders/:id/assign`
- **权限**: `admin`
- **请求参数**:
```json
{
  "maintainerId": "uuid"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "工单已分配"
}
```

### 4.4 接单
- **方法**: `POST`
- **路径**: `/work-orders/:id/accept`
- **权限**: `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "已接单"
}
```

### 4.5 开始维修
- **方法**: `POST`
- **路径**: `/work-orders/:id/start`
- **权限**: `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "已开始维修"
}
```

### 4.6 完成维修
- **方法**: `POST`
- **路径**: `/work-orders/:id/complete`
- **权限**: `maintainer`
- **请求参数**:
```json
{
  "description": "已更换灯泡，恢复正常",
  "photos": ["photo1.jpg", "photo2.jpg"],
  "report": "维修报告内容...",
  "laborCost": 50
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "维修已完成"
}
```

### 4.7 审核工单
- **方法**: `POST`
- **路径**: `/work-orders/:id/verify`
- **权限**: `admin`, `inspector`
- **请求参数**:
```json
{
  "passed": true,
  "comment": "维修合格"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "审核通过"
}
```

### 4.8 下载凭证
- **方法**: `GET`
- **路径**: `/work-orders/:id/voucher`
- **权限**: `admin`, `finance`, `maintainer`
- **响应**: PDF文件流

---

## 5. 维修管理接口

### 5.1 扫码开始维修
- **方法**: `POST`
- **路径**: `/maintenance/:orderId/scan`
- **权限**: `maintainer`
- **请求参数**:
```json
{
  "lightCode": "LD-001"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "扫码成功，开始维修",
  "data": {
    "lightId": "uuid",
    "lightCode": "LD-001",
    "address": "朝阳区某某路"
  }
}
```

### 5.2 配件使用
- **方法**: `POST`
- **路径**: `/maintenance/:orderId/parts`
- **权限**: `maintainer`
- **请求参数**:
```json
{
  "parts": [
    {
      "partId": "uuid",
      "quantity": 2
    }
  ]
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "配件已登记使用",
  "data": {
    "totalCost": 200
  }
}
```

### 5.3 完成维修
- **方法**: `POST`
- **路径**: `/maintenance/:orderId/complete`
- **权限**: `maintainer`
- **请求参数**:
```json
{
  "description": "已更换镇流器，测试正常",
  "photos": ["photo1.jpg", "photo2.jpg"],
  "report": "详细维修报告...",
  "laborCost": 100
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "维修完成"
}
```

### 5.4 维修记录列表
- **方法**: `GET`
- **路径**: `/maintenance`
- **权限**: `admin`, `maintainer`
- **查询参数**: `page`, `pageSize`, `orderId`, `maintainerId`, `startDate`, `endDate`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "workOrderId": "uuid",
        "maintainerId": "uuid",
        "description": "已更换镇流器",
        "totalCost": 300,
        "createdAt": "2024-01-15T14:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 5.5 获取维修详情
- **方法**: `GET`
- **路径**: `/maintenance/:id`
- **权限**: `admin`, `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "workOrderId": "uuid",
    "maintainerId": "uuid",
    "description": "已更换镇流器",
    "photos": ["photo1.jpg"],
    "report": "详细报告...",
    "partsUsed": [
      {
        "partId": "uuid",
        "partName": "镇流器",
        "quantity": 1,
        "cost": 200
      }
    ],
    "laborCost": 100,
    "totalCost": 300,
    "createdAt": "2024-01-15T14:00:00.000Z"
  }
}
```

### 5.6 根据工单获取维修记录
- **方法**: `GET`
- **路径**: `/maintenance/order/:orderId`
- **权限**: `admin`, `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": "uuid",
      "description": "维修描述",
      "createdAt": "2024-01-15T14:00:00.000Z"
    }
  ]
}
```

---

## 6. 配件管理接口

### 6.1 创建配件
- **方法**: `POST`
- **路径**: `/parts`
- **权限**: `admin`
- **请求参数**:
```json
{
  "code": "PJ-001",
  "name": "LED灯泡",
  "category": "光源",
  "unit": "个",
  "stock": 100,
  "minStock": 10,
  "price": 50,
  "supplier": "某某供应商"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "code": "PJ-001",
    "name": "LED灯泡"
  }
}
```

### 6.2 获取配件列表
- **方法**: `GET`
- **路径**: `/parts`
- **权限**: `admin`, `maintainer`
- **查询参数**: `page`, `pageSize`, `category`, `keyword`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "PJ-001",
        "name": "LED灯泡",
        "category": "光源",
        "unit": "个",
        "stock": 100,
        "minStock": 10,
        "price": 50,
        "supplier": "某某供应商"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 6.3 获取低库存预警
- **方法**: `GET`
- **路径**: `/parts/low-stock`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": "uuid",
      "code": "PJ-002",
      "name": "镇流器",
      "stock": 5,
      "minStock": 10,
      "price": 200
    }
  ]
}
```

### 6.4 获取配件详情
- **方法**: `GET`
- **路径**: `/parts/:id`
- **权限**: `admin`, `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "code": "PJ-001",
    "name": "LED灯泡",
    "category": "光源",
    "unit": "个",
    "stock": 100,
    "minStock": 10,
    "price": 50,
    "supplier": "某某供应商",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

### 6.5 更新配件
- **方法**: `PUT`
- **路径**: `/parts/:id`
- **权限**: `admin`
- **请求参数**:
```json
{
  "name": "LED灯泡(100W)",
  "category": "光源",
  "unit": "个",
  "minStock": 20,
  "price": 60,
  "supplier": "新供应商"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "更新成功"
}
```

### 6.6 删除配件
- **方法**: `DELETE`
- **路径**: `/parts/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "删除成功"
}
```

### 6.7 增加库存
- **方法**: `POST`
- **路径**: `/parts/:id/stock/add`
- **权限**: `admin`
- **请求参数**:
```json
{
  "quantity": 50,
  "remark": "采购入库"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "库存已更新",
  "data": {
    "oldStock": 100,
    "newStock": 150
  }
}
```

---

## 7. 路灯管理接口

### 7.1 创建路灯
- **方法**: `POST`
- **路径**: `/street-lights`
- **权限**: `admin`
- **请求参数**:
```json
{
  "code": "LD-001",
  "area": "朝阳区",
  "address": "某某路与某某街交叉口",
  "lng": 116.4074,
  "lat": 39.9042,
  "model": "LED-100W",
  "installDate": "2023-01-01",
  "status": "normal",
  "brightness": 100,
  "power": 100
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "code": "LD-001",
    "area": "朝阳区"
  }
}
```

### 7.2 获取路灯列表
- **方法**: `GET`
- **路径**: `/street-lights`
- **权限**: `admin`, `inspector`, `maintainer`
- **查询参数**: `page`, `pageSize`, `area`, `status`, `keyword`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "LD-001",
        "area": "朝阳区",
        "address": "某某路与某某街交叉口",
        "status": "normal",
        "power": 100,
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 7.3 路灯统计
- **方法**: `GET`
- **路径**: `/street-lights/stats`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 100,
    "normal": 85,
    "fault": 10,
    "maintaining": 5,
    "byArea": {
      "朝阳区": 30,
      "海淀区": 25,
      "东城区": 20,
      "西城区": 15,
      "丰台区": 10
    }
  }
}
```

### 7.4 编码查询
- **方法**: `GET`
- **路径**: `/street-lights/code/:code`
- **权限**: `admin`, `inspector`, `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "code": "LD-001",
    "area": "朝阳区",
    "address": "某某路与某某街交叉口",
    "lng": 116.4074,
    "lat": 39.9042,
    "model": "LED-100W",
    "status": "normal",
    "power": 100
  }
}
```

### 7.5 获取路灯详情
- **方法**: `GET`
- **路径**: `/street-lights/:id`
- **权限**: `admin`, `inspector`, `maintainer`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "code": "LD-001",
    "area": "朝阳区",
    "address": "某某路与某某街交叉口",
    "lng": 116.4074,
    "lat": 39.9042,
    "model": "LED-100W",
    "installDate": "2023-01-01",
    "status": "normal",
    "brightness": 100,
    "power": 100,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

### 7.6 更新路灯
- **方法**: `PUT`
- **路径**: `/street-lights/:id`
- **权限**: `admin`
- **请求参数**:
```json
{
  "area": "朝阳区",
  "address": "新地址",
  "lng": 116.4074,
  "lat": 39.9042,
  "model": "LED-150W",
  "brightness": 100,
  "power": 150
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "更新成功"
}
```

### 7.7 删除路灯
- **方法**: `DELETE`
- **路径**: `/street-lights/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "删除成功"
}
```

---

## 8. 能耗管理接口

### 8.1 记录能耗
- **方法**: `POST`
- **路径**: `/energy/records`
- **权限**: `admin`, `inspector`
- **请求参数**:
```json
{
  "streetLightId": "uuid",
  "date": "2024-01-15",
  "consumption": 1.2,
  "duration": 12
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "记录成功",
  "data": {
    "id": "uuid",
    "consumption": 1.2,
    "cost": 0.72
  }
}
```

### 8.2 能耗记录列表
- **方法**: `GET`
- **路径**: `/energy/records`
- **权限**: `admin`, `finance`
- **查询参数**: `page`, `pageSize`, `streetLightId`, `area`, `startDate`, `endDate`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "streetLightId": "uuid",
        "area": "朝阳区",
        "date": "2024-01-15",
        "consumption": 1.2,
        "duration": 12,
        "cost": 0.72
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 8.3 能耗统计
- **方法**: `GET`
- **路径**: `/energy/stats`
- **权限**: `admin`, `finance`
- **查询参数**: `startDate`, `endDate`, `area`, `groupBy`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "totalConsumption": 1200,
    "totalCost": 720,
    "averageDaily": 40,
    "byArea": {
      "朝阳区": 400,
      "海淀区": 350,
      "东城区": 250,
      "西城区": 120,
      "丰台区": 80
    },
    "trend": [
      { "date": "2024-01-01", "consumption": 38 },
      { "date": "2024-01-02", "consumption": 42 }
    ]
  }
}
```

### 8.4 能耗预警列表
- **方法**: `GET`
- **路径**: `/energy/alerts`
- **权限**: `admin`, `finance`
- **查询参数**: `page`, `pageSize`, `status`, `area`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "area": "朝阳区",
        "alertType": "budget_exceed",
        "message": "当日能耗超出预算20%",
        "currentValue": 50,
        "threshold": 40,
        "status": "pending",
        "createdAt": "2024-01-15T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 8.5 处理能耗预警
- **方法**: `PUT`
- **路径**: `/energy/alerts/:id/handle`
- **权限**: `admin`, `finance`
- **请求参数**:
```json
{
  "status": "handled",
  "remark": "已通知相关人员检查"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "已处理"
}
```

### 8.6 区域能耗趋势
- **方法**: `GET`
- **路径**: `/energy/trend`
- **权限**: `admin`, `finance`
- **查询参数**: `startDate`, `endDate`, `area`, `groupBy`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "area": "朝阳区",
    "period": "2024-01-01至2024-01-31",
    "trendData": [
      { "date": "2024-01-01", "consumption": 38, "cost": 22.8 },
      { "date": "2024-01-02", "consumption": 42, "cost": 25.2 }
    ]
  }
}
```

### 8.7 预算监控
- **方法**: `POST`
- **路径**: `/energy/monitor`
- **权限**: `admin`, `finance`
- **请求参数**:
```json
{
  "area": "朝阳区",
  "date": "2024-01-15"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "监控完成",
  "data": {
    "area": "朝阳区",
    "budget": 1200,
    "actual": 1350,
    "usageRate": 1.125,
    "alertGenerated": true
  }
}
```

---

## 9. 区域配置接口

### 9.1 创建区域配置
- **方法**: `POST`
- **路径**: `/area-configs`
- **权限**: `admin`
- **请求参数**:
```json
{
  "areaName": "朝阳区",
  "lightOnTime": "18:00",
  "lightOffTime": "06:00",
  "dailyEnergyBudget": 100,
  "monthlyEnergyBudget": 3000
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "areaName": "朝阳区"
  }
}
```

### 9.2 获取区域配置列表
- **方法**: `GET`
- **路径**: `/area-configs`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": "uuid",
      "areaName": "朝阳区",
      "lightOnTime": "18:00",
      "lightOffTime": "06:00",
      "dailyEnergyBudget": 100,
      "monthlyEnergyBudget": 3000,
      "isLocked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 9.3 获取区域配置详情
- **方法**: `GET`
- **路径**: `/area-configs/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "areaName": "朝阳区",
    "lightOnTime": "18:00",
    "lightOffTime": "06:00",
    "dailyEnergyBudget": 100,
    "monthlyEnergyBudget": 3000,
    "isLocked": false,
    "lockReason": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

### 9.4 更新区域配置
- **方法**: `PUT`
- **路径**: `/area-configs/:id`
- **权限**: `admin`
- **请求参数**:
```json
{
  "lightOnTime": "17:30",
  "lightOffTime": "06:30",
  "dailyEnergyBudget": 120,
  "monthlyEnergyBudget": 3600
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "更新成功"
}
```

### 9.5 删除区域配置
- **方法**: `DELETE`
- **路径**: `/area-configs/:id`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "删除成功"
}
```

### 9.6 锁定区域配置
- **方法**: `POST`
- **路径**: `/area-configs/:id/lock`
- **权限**: `admin`
- **请求参数**:
```json
{
  "reason": "能耗超标，临时锁定"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "已锁定"
}
```

### 9.7 解锁区域配置
- **方法**: `POST`
- **路径**: `/area-configs/:id/unlock`
- **权限**: `admin`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "已解锁"
}
```

---

## 10. 财务管理接口

### 10.1 生成报表
- **方法**: `POST`
- **路径**: `/finance/reports/generate`
- **权限**: `admin`, `finance`
- **请求参数**:
```json
{
  "type": "comprehensive",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "format": "pdf"
}
```
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "报表生成中",
  "data": {
    "reportId": "uuid",
    "status": "generating"
  }
}
```

### 10.2 获取报表列表
- **方法**: `GET`
- **路径**: `/finance/reports`
- **权限**: `admin`, `finance`
- **查询参数**: `page`, `pageSize`, `type`, `startDate`, `endDate`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "comprehensive",
        "title": "2024年1月综合报表",
        "startDate": "2024-01-01",
        "endDate": "2024-01-31",
        "status": "completed",
        "filePath": "/reports/xxx.pdf",
        "createdAt": "2024-02-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 10.3 获取报表详情
- **方法**: `GET`
- **路径**: `/finance/reports/:id`
- **权限**: `admin`, `finance`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "type": "comprehensive",
    "title": "2024年1月综合报表",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "summary": {
      "totalMaintenanceCost": 15000,
      "totalEnergyCost": 8000,
      "totalPartsCost": 5000,
      "totalCost": 28000
    },
    "details": {}
  }
}
```

### 10.4 按月获取报表
- **方法**: `GET`
- **路径**: `/finance/reports/month/:month`
- **权限**: `admin`, `finance`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": "uuid",
      "type": "comprehensive",
      "title": "2024年1月综合报表",
      "status": "completed"
    }
  ]
}
```

### 10.5 绩效对比
- **方法**: `GET`
- **路径**: `/finance/performance/compare`
- **权限**: `admin`, `finance`
- **查询参数**: `startDate`, `endDate`, `comparePeriod`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "currentPeriod": {
      "totalCost": 28000,
      "maintenanceCost": 15000,
      "energyCost": 8000,
      "partsCost": 5000,
      "workOrderCount": 50,
      "avgRepairTime": 2.5
    },
    "comparePeriod": {
      "totalCost": 32000,
      "maintenanceCost": 18000,
      "energyCost": 9000,
      "partsCost": 5000,
      "workOrderCount": 60,
      "avgRepairTime": 3.0
    },
    "comparison": {
      "totalCostChange": -0.125,
      "maintenanceCostChange": -0.167,
      "energyCostChange": -0.111,
      "efficiencyImprovement": 0.167
    }
  }
}
```

### 10.6 下载凭证
- **方法**: `GET`
- **路径**: `/finance/reports/:id/voucher`
- **权限**: `admin`, `finance`
- **响应**: PDF文件流

---

## 11. 通知管理接口

### 11.1 获取通知列表
- **方法**: `GET`
- **路径**: `/notifications`
- **权限**: 已登录用户
- **查询参数**: `page`, `pageSize`, `type`, `isRead`
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "work_order",
        "title": "新工单分配",
        "content": "您有一个新的工单需要处理",
        "relatedId": "uuid",
        "isRead": false,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 11.2 获取未读数量
- **方法**: `GET`
- **路径**: `/notifications/unread-count`
- **权限**: 已登录用户
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "count": 5,
    "byType": {
      "work_order": 2,
      "maintenance": 1,
      "energy_alert": 1,
      "system": 1
    }
  }
}
```

### 11.3 获取通知详情
- **方法**: `GET`
- **路径**: `/notifications/:id`
- **权限**: 已登录用户
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "type": "work_order",
    "title": "新工单分配",
    "content": "您有一个新的工单需要处理，工单号：WO20240115001",
    "relatedId": "uuid",
    "relatedType": "work_order",
    "isRead": false,
    "senderId": "uuid",
    "senderName": "系统管理员",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

### 11.4 标记已读
- **方法**: `PUT`
- **路径**: `/notifications/:id/read`
- **权限**: 已登录用户
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "已标记为已读"
}
```

### 11.5 标记全部已读
- **方法**: `PUT`
- **路径**: `/notifications/read-all`
- **权限**: 已登录用户
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "全部标记为已读",
  "data": {
    "updatedCount": 5
  }
}
```

### 11.6 删除通知
- **方法**: `DELETE`
- **路径**: `/notifications/:id`
- **权限**: 已登录用户
- **响应示例**:
```json
{
  "success": true,
  "code": 200,
  "message": "删除成功"
}
```
