from pydantic import BaseModel


class ApiResponse[DataT](BaseModel):
    # 统一响应外壳由 code、message 和承载业务数据的 data 组成。
    # code 是字符串数字，message 中文，data 承载业务数据
    # 成功和错误共用此结构，HTTP 状态负责区分请求结果。
    code: str = "200"
    message: str = "请求成功"
    data: DataT


class HealthCheckData(BaseModel):
    # 健康检查数据模型
    status: str
